import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebChatbot from "@/models/web/WebChatbot.model";
import { getAuth } from "@clerk/express";
import puppeteer, { Browser } from "puppeteer";

interface ScrapedPage {
  url: string;
  title: string;
  description: string;
  meta: Record<string, string>;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
  };
  content: string;
  fullText: string;
  links: string[];
  images: string[];
  level: number;
  wordCount: number;
  textLength: number;
}

interface DiscoveredUrl {
  url: string;
  level: number;
}

interface DiscoveryResult {
  url: string;
  links: string[];
}

class WebScraper {
  private browser: Browser;
  private visitedUrls: Set<string> = new Set();
  private scrapedPages: ScrapedPage[] = [];
  private maxPages = 20;
  private maxLevel = 3;
  private pageLoadTimeoutMs = 60000;
  private discoveryConcurrency = 2;
  private scrapeConcurrency = 1;
  private readonly scrapePageScript = `
    (() => {
      const normalizeWhitespace = (text) =>
        (text || "").replace(/\\s+/g, " ").trim();

      const unique = (items) => {
        const seen = new Set();
        return items.filter((item) => {
          const normalized = normalizeWhitespace(item);
          if (!normalized || seen.has(normalized)) return false;
          seen.add(normalized);
          return true;
        });
      };

      const getMeta = () => {
        const tags = Array.from(
          document.querySelectorAll(
            "meta[name], meta[property], link[rel='canonical']",
          ),
        );

        return tags.reduce((meta, tag) => {
          const name =
            tag.getAttribute("name") ||
            tag.getAttribute("property") ||
            (tag.getAttribute("rel") === "canonical" ? "canonical" : null);
          const content =
            tag.getAttribute("content") || tag.getAttribute("href");

          if (name && content) {
            meta[name.toLowerCase()] = content.trim();
          }

          return meta;
        }, {});
      };

      const getHeadings = (tag) => {
        return Array.from(document.querySelectorAll(tag))
          .map((el) => normalizeWhitespace(el.textContent ?? ""))
          .filter((text) => text.length > 0);
      };

      const isVisible = (el) => {
        if (!(el instanceof Element)) return false;
        if (el.closest("script, style, noscript, template")) return false;
        if (el.closest("svg, canvas, video, audio, iframe")) return false;
        if (el.closest("[hidden], [aria-hidden='true']")) return false;

        const style = window.getComputedStyle(el);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0"
        ) {
          return false;
        }

        return true;
      };

      const getBlockParent = (node, root) => {
        let current = node.parentElement;

        while (current && current !== root) {
          const tag = current.tagName.toLowerCase();
          const display = window.getComputedStyle(current).display;
          if (
            [
              "p",
              "li",
              "blockquote",
              "pre",
              "code",
              "figcaption",
              "td",
              "th",
              "dd",
              "dt",
              "section",
              "article",
              "main",
              "div",
              "h1",
              "h2",
              "h3",
              "h4",
              "h5",
              "h6",
            ].includes(tag) ||
            ["block", "list-item", "table-cell", "flex", "grid"].includes(
              display,
            )
          ) {
            return current;
          }

          current = current.parentElement;
        }

        return root;
      };

      const collectTextBlocks = (root) => {
        if (!root) return [];

        const blockParts = new Map();
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const value = normalizeWhitespace(node.textContent || "");
            if (!value) return NodeFilter.FILTER_REJECT;

            const parent = node.parentElement;
            if (!parent || !isVisible(parent)) {
              return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;
          },
        });

        let currentNode = walker.nextNode();
        while (currentNode) {
          const parent = getBlockParent(currentNode, root);
          const existing = blockParts.get(parent) || [];
          existing.push(normalizeWhitespace(currentNode.textContent || ""));
          blockParts.set(parent, existing);
          currentNode = walker.nextNode();
        }

        return unique(
          Array.from(blockParts.values())
            .map((parts) => normalizeWhitespace(parts.join(" ")))
            .filter((text) => text.length > 0),
        );
      };

      const trimText = (text, maxLength) => {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + "...";
      };

      const getPrimaryRoot = () => {
        const el =
          document.querySelector("main") ||
          document.querySelector("article") ||
          document.querySelector(".content") ||
          document.querySelector(".page-content") ||
          document.querySelector(".entry-content") ||
          document.querySelector(".post-content") ||
          document.querySelector("#content") ||
          document.querySelector('[role="main"]') ||
          document.body;

        return el || document.body;
      };

      const getCleanBodyRoot = () => {
        const clonedBody = document.body.cloneNode(true);
        clonedBody
          .querySelectorAll(
            "script, style, noscript, template, svg, canvas, video, audio, iframe",
          )
          .forEach((el) => el.remove());
        clonedBody
          .querySelectorAll(
            "nav, footer, header, aside, form, button, input, select, textarea",
          )
          .forEach((el) => el.remove());
        return clonedBody;
      };

      const getContent = () => {
        const blocks = collectTextBlocks(getPrimaryRoot());
        return trimText(blocks.join("\\n\\n"), 50000);
      };

      const getFullText = () => {
        const bodyRoot = getCleanBodyRoot();
        const blocks = collectTextBlocks(bodyRoot);
        return trimText(blocks.join("\\n\\n"), 120000);
      };

      const getLinks = () => {
        return unique(
          Array.from(document.querySelectorAll("a[href]"))
          .map((a) => a.href.trim())
          .filter(
            (href) =>
              href &&
              !href.startsWith("javascript:") &&
              !href.startsWith("mailto:") &&
              !href.startsWith("#") &&
              !href.includes("tel:") &&
              !href.includes("sms:"),
          ),
        );
      };

      const getImages = () => {
        return Array.from(document.querySelectorAll("img[src]"))
          .map((img) => img.src.trim())
          .filter(Boolean);
      };

      const meta = getMeta();

      return {
        url: window.location.href,
        title: document.title ?? "",
        description: meta.description || "",
        meta,
        headings: {
          h1: getHeadings("h1"),
          h2: getHeadings("h2"),
          h3: getHeadings("h3"),
          h4: getHeadings("h4"),
          h5: getHeadings("h5"),
          h6: getHeadings("h6"),
        },
        content: getContent(),
        fullText: getFullText(),
        links: getLinks(),
        images: getImages(),
        wordCount: getFullText()
          .split(/\\s+/)
          .filter(Boolean).length,
        textLength: getFullText().length,
      };
    })()
  `;
  private readonly discoveryScript = `
    (() => {
      const getLinks = () => {
        return Array.from(document.querySelectorAll("a[href]"))
          .map((a) => a.href)
          .filter(
            (href) =>
              !!href &&
              !href.startsWith("javascript:") &&
              !href.startsWith("mailto:") &&
              !href.startsWith("#") &&
              !href.includes("tel:") &&
              !href.includes("sms:"),
          );
      };

      return {
        url: window.location.href,
        links: getLinks(),
      };
    })()
  `;

  constructor(browser: Browser) {
    this.browser = browser;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async preparePage(url: string) {
    const page = await this.browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36",
    );
    await page.setViewport({ width: 1440, height: 900 });
    await page.setJavaScriptEnabled(true);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: this.pageLoadTimeoutMs,
    });

    await this.waitForPageToSettle(page);
    return page;
  }

  private async waitForPageToSettle(page: Awaited<ReturnType<Browser["newPage"]>>) {
    try {
      await page.waitForNetworkIdle({
        idleTime: 1500,
        timeout: 15000,
      });
    } catch {}

    await page.evaluate(async () => {
      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      let previousHeight = 0;
      let stablePasses = 0;

      for (let i = 0; i < 24; i++) {
        const height = Math.max(
          document.body?.scrollHeight || 0,
          document.documentElement?.scrollHeight || 0,
        );

        window.scrollTo({
          top: Math.min(height, (i + 1) * window.innerHeight),
          behavior: "auto",
        });

        await sleep(500);

        if (height === previousHeight) {
          stablePasses++;
          if (stablePasses >= 3) break;
        } else {
          stablePasses = 0;
          previousHeight = height;
        }
      }

      window.scrollTo({ top: 0, behavior: "auto" });
      await sleep(1200);
    });

    try {
      await page.waitForNetworkIdle({
        idleTime: 1000,
        timeout: 10000,
      });
    } catch {}

    let previousLength = 0;
    let stableChecks = 0;

    for (let i = 0; i < 6; i++) {
      const currentLength = await page.evaluate(
        () => document.body?.innerText?.length || 0,
      );

      if (currentLength > 0 && currentLength === previousLength) {
        stableChecks++;
        if (stableChecks >= 2) break;
      } else {
        stableChecks = 0;
        previousLength = currentLength;
      }

      await this.sleep(1000);
    }
  }

  private async runWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<R>,
  ): Promise<PromiseSettledResult<R>[]> {
    const results: PromiseSettledResult<R>[] = new Array(items.length);
    let index = 0;

    const runWorker = async () => {
      while (index < items.length) {
        const currentIndex = index++;
        try {
          const value = await worker(items[currentIndex]);
          results[currentIndex] = { status: "fulfilled", value };
        } catch (reason) {
          results[currentIndex] = { status: "rejected", reason };
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, items.length) }, () =>
        runWorker(),
      ),
    );

    return results;
  }

  private async fetchText(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeout);

      if (!response.ok) return null;
      return await response.text();
    } catch {
      return null;
    }
  }

  private async discoverSitemapUrls(startUrl: string): Promise<string[]> {
    const origin = new URL(startUrl).origin;
    const baseDomain = this.extractDomain(startUrl);
    const sitemapCandidates = new Set<string>([`${origin}/sitemap.xml`]);

    const robotsText = await this.fetchText(`${origin}/robots.txt`);
    if (robotsText) {
      for (const line of robotsText.split(/\r?\n/)) {
        const match = line.match(/^sitemap:\s*(.+)$/i);
        if (match?.[1]) {
          sitemapCandidates.add(match[1].trim());
        }
      }
    }

    const discovered = new Set<string>();

    for (const sitemapUrl of sitemapCandidates) {
      const xml = await this.fetchText(sitemapUrl);
      if (!xml) continue;

      const matches = xml.matchAll(/<loc>(.*?)<\/loc>/gi);
      for (const match of matches) {
        const rawUrl = match[1]
          ?.replace(/&amp;/g, "&")
          ?.replace(/&lt;/g, "<")
          ?.replace(/&gt;/g, ">");
        if (!rawUrl) continue;

        const normalized = this.normalizeUrl(rawUrl.trim());
        if (this.isSameDomain(normalized, baseDomain)) {
          discovered.add(normalized);
        }

        if (discovered.size >= this.maxPages * 2) {
          break;
        }
      }
    }

    return Array.from(discovered);
  }

  private async scrapePage(
    url: string,
    level: number,
  ): Promise<ScrapedPage | null> {
    if (this.visitedUrls.has(url)) return null;
    this.visitedUrls.add(url);
    let page: Awaited<ReturnType<Browser["newPage"]>> | null = null;
    try {
      page = await this.preparePage(url);

      const scrapedData = (await page.evaluate(this.scrapePageScript)) as
        | Omit<ScrapedPage, "level">
        | undefined;

      if (!scrapedData) {
        throw new Error("Failed to scrape page data");
      }

      console.log(`✅ Scraped: ${url} (level ${level})`);
      return { ...scrapedData, level };
    } catch (error) {
      console.error(`❌ Failed to scrape ${url}:`, error);
      return null;
    } finally {
      try {
        await page?.close();
      } catch {}
    }
  }

  private extractDomain(url: string): string {
    try {
      const d = new URL(url).hostname;
      return d.startsWith("www.") ? d.substring(4) : d;
    } catch {
      return url;
    }
  }

  private isSameDomain(url: string, base: string): boolean {
    try {
      return this.extractDomain(url) === base;
    } catch {
      return false;
    }
  }

  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      const pathname = u.pathname.replace(/\/\/$/, "") || "/";
      return u.origin + pathname + u.search;
    } catch {
      return url;
    }
  }

  private async scrapePageForDiscovery(
    url: string,
  ): Promise<DiscoveryResult | null> {
    let page: Awaited<ReturnType<Browser["newPage"]>> | null = null;
    try {
      page = await this.preparePage(url);

      const result = (await page.evaluate(
        this.discoveryScript,
      )) as DiscoveryResult;

      console.log(`🔍 Discovery: ${url} — ${result.links.length} links found`);
      return result;
    } catch (error) {
      console.error(`❌ Failed discovery for ${url}:`, error);
      return null;
    } finally {
      try {
        await page?.close();
      } catch {}
    }
  }

  private async discoverAllUrls(startUrl: string): Promise<DiscoveredUrl[]> {
    const baseDomain = this.extractDomain(startUrl);
    const normalizedStartUrl = this.normalizeUrl(startUrl);
    const levelUrls: Record<number, DiscoveredUrl[]> = {
      0: [{ url: normalizedStartUrl, level: 0 }],
      1: [],
      2: [],
      3: [],
    };
    const discovered = new Set<string>([normalizedStartUrl]);

    const sitemapUrls = await this.discoverSitemapUrls(startUrl);
    for (const sitemapUrl of sitemapUrls) {
      if (
        discovered.size >= this.maxPages ||
        discovered.has(sitemapUrl) ||
        !this.isSameDomain(sitemapUrl, baseDomain)
      ) {
        continue;
      }

      discovered.add(sitemapUrl);
      levelUrls[1].push({ url: sitemapUrl, level: 1 });
    }

    let currentLevel = 0;

    while (currentLevel <= this.maxLevel) {
      const curr = levelUrls[currentLevel];
      if (!curr?.length) break;
      console.log(`🔍 Level ${currentLevel}: ${curr.length} pages`);

      const results = await this.runWithConcurrency(
        curr,
        this.discoveryConcurrency,
        ({ url }) => this.scrapePageForDiscovery(url),
      );

      const totalSoFar = (): number => Object.values(levelUrls).flat().length;
      let added = 0;

      for (const r of results) {
        if (r.status !== "fulfilled" || !r.value) continue;
        if (currentLevel < this.maxLevel) {
          for (const link of r.value.links) {
            const norm = this.normalizeUrl(link);
            if (
              this.isSameDomain(link, baseDomain) &&
              !discovered.has(norm) &&
              totalSoFar() < this.maxPages
            ) {
              discovered.add(norm);
              levelUrls[currentLevel + 1].push({
                url: norm,
                level: currentLevel + 1,
              });
              added++;
            }
            if (totalSoFar() >= this.maxPages) break;
          }
        }
        if (totalSoFar() >= this.maxPages) break;
      }

      console.log(`🔗 Level ${currentLevel + 1}: ${added} new URLs`);
      currentLevel++;
      if (totalSoFar() >= this.maxPages) break;
    }

    const allUrls = Object.values(levelUrls).flat();
    const all = allUrls.slice(0, this.maxPages);
    console.log(`🎯 Total URLs to scrape: ${all.length}`);
    return all;
  }

  async scrapeWebsite(startUrl: string): Promise<ScrapedPage[]> {
    console.log("🚀 Starting scrape...");
    const urls = await this.discoverAllUrls(startUrl);
    this.visitedUrls.clear();

    const results = await this.runWithConcurrency(
      urls,
      this.scrapeConcurrency,
      ({ url, level }) => this.scrapePage(url, level),
    );

    this.scrapedPages = results
      .filter(
        (r): r is PromiseFulfilledResult<ScrapedPage> =>
          r.status === "fulfilled" && r.value !== null,
      )
      .map((r) => r.value);

    console.log(`🎉 Done: ${this.scrapedPages.length} pages scraped`);
    return this.scrapedPages;
  }
}

export const scrapAnuController = async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  const { url, chatbotId } = req.body;

  if (!url || !userId || !chatbotId) {
    return res.status(400).json({
      success: false,
      error: "Please provide all required inputs.",
      timestamp: new Date().toISOString(),
    });
  }

  let browser: Browser | null = null;

  try {
    await connectToDatabase();
    const chatbot = await WebChatbot.findOne({
      _id: chatbotId,
      clerkId: userId,
    });

    if (!chatbot) {
      return res.status(404).json({
        success: false,
        error: "Chatbot not found or unauthorized",
        timestamp: new Date().toISOString(),
      });
    }

    if (chatbot.isScrapped) {
      return res.status(200).json({
        success: true,
        data: {
          message: "Website already scraped",
          alreadyScrapped: true,
          data: {
            fileName: chatbot.scrappedFile || "",
            domain: new URL(chatbot?.websiteUrl!).hostname,
            userId,
            chatbotId,
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    let inputUrl = url.trim();
    if (!/^https?:\/\//i.test(inputUrl)) inputUrl = `http://${inputUrl}`;

    let mainUrl: string, domain: string;
    try {
      const parsed = new URL(inputUrl);
      domain = parsed.hostname.startsWith("www.")
        ? parsed.hostname.substring(4)
        : parsed.hostname;
      mainUrl = `${parsed.protocol}//${parsed.hostname}`;
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid URL provided.",
        timestamp: new Date().toISOString(),
      });
    }

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ],
    });
    console.log("✅ Browser launched");

    const scraper = new WebScraper(browser);
    const scrapedPages = await scraper.scrapeWebsite(mainUrl);

    if (scrapedPages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No pages could be scraped from the provided URL.",
        timestamp: new Date().toISOString(),
      });
    }

    const fileName = `${domain}_${Date.now()}`;
    console.log(`✅ Scraped ${scrapedPages.length} pages`);

    return res.status(200).json({
      success: true,
      data: {
        success: true,
        data: { fileName, domain, userId, chatbotId, scrapedPages },
        message: "Scraping completed successfully.",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("💥 Scraping error:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while scraping the website.",
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
      console.log("🔚 Browser closed");
    }
  }
};
