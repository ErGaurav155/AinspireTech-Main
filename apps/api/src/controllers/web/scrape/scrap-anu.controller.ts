import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebChatbot from "@/models/web/WebChatbot.model";
import { getAuth } from "@clerk/express";
import puppeteer, { Browser } from "puppeteer";

interface ScrapedPage {
  url: string;
  content: string;
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
  private visitedSimilarityKeys: Set<string> = new Set();
  private scrapedPages: ScrapedPage[] = [];
  private maxPages = 10;
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

      const isHomePage = () => {
        const normalizedPath = window.location.pathname
          .replace(/\\/index\\.(html?|php|aspx?)$/i, "")
          .replace(/\\/+$/, "")
          .toLowerCase();

        return normalizedPath === "" || normalizedPath === "/home";
      };

      const getContent = () => {
        const bodyRoot = getCleanBodyRoot();
        const blocks = collectTextBlocks(bodyRoot);
        return trimText(blocks.join("\\n\\n"), isHomePage() ? 2000 : 1000);
      };

      return {
        url: window.location.href,
        content: getContent(),
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

  private async waitForPageToSettle(
    page: Awaited<ReturnType<Browser["newPage"]>>,
  ) {
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
    const similarityKey = this.getSimilarityKey(url);
    if (
      this.visitedUrls.has(url) ||
      this.visitedSimilarityKeys.has(similarityKey)
    ) {
      return null;
    }
    this.visitedUrls.add(url);
    this.visitedSimilarityKeys.add(similarityKey);
    let page: Awaited<ReturnType<Browser["newPage"]>> | null = null;
    try {
      page = await this.preparePage(url);

      const scrapedData = (await page.evaluate(this.scrapePageScript)) as
        | ScrapedPage
        | undefined;

      if (!scrapedData) {
        throw new Error("Failed to scrape page data");
      }

      return scrapedData;
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
      const pathname = this.normalizePathname(u.pathname);
      return u.origin + pathname;
    } catch {
      return url;
    }
  }

  private normalizePathname(pathname: string): string {
    const cleanPath = (pathname || "/")
      .replace(/\/index\.(html?|php|aspx?)$/i, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    if (!cleanPath || cleanPath === "/home") return "/";
    return cleanPath;
  }

  private getSimilarityKey(url: string): string {
    try {
      const u = new URL(url);
      const cleanedPath = this.normalizePathname(u.pathname)
        .split("/")
        .filter(Boolean)
        .map((segment) => {
          const lower = segment.toLowerCase();

          if (/^\d+$/.test(lower)) return ":id";
          if (/^[0-9a-f]{8,}$/i.test(lower)) return ":id";
          if (lower.length > 40 && /[\d-]/.test(lower)) return ":id";

          return lower;
        })
        .join("/");

      return `${this.extractDomain(url)}/${cleanedPath || ""}`;
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
    const discoveredSimilarityKeys = new Set<string>([
      this.getSimilarityKey(normalizedStartUrl),
    ]);
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
        discoveredSimilarityKeys.has(this.getSimilarityKey(sitemapUrl)) ||
        !this.isSameDomain(sitemapUrl, baseDomain)
      ) {
        continue;
      }

      discovered.add(sitemapUrl);
      discoveredSimilarityKeys.add(this.getSimilarityKey(sitemapUrl));
      levelUrls[1].push({ url: sitemapUrl, level: 1 });
    }

    let currentLevel = 0;

    while (currentLevel <= this.maxLevel) {
      const curr = levelUrls[currentLevel];
      if (!curr?.length) break;

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
              !discoveredSimilarityKeys.has(this.getSimilarityKey(norm)) &&
              totalSoFar() < this.maxPages
            ) {
              discovered.add(norm);
              discoveredSimilarityKeys.add(this.getSimilarityKey(norm));
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

      currentLevel++;
      if (totalSoFar() >= this.maxPages) break;
    }

    const allUrls = Object.values(levelUrls).flat();
    const all = allUrls.slice(0, this.maxPages);
    return all;
  }

  async scrapeWebsite(startUrl: string): Promise<ScrapedPage[]> {
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

    return this.scrapedPages;
  }
}

export const scrapeWebsitePagesForKnowledge = async (url: string) => {
  let inputUrl = url.trim();
  if (!/^https?:\/\//i.test(inputUrl)) inputUrl = `http://${inputUrl}`;

  let mainUrl: string;
  let domain: string;
  try {
    const parsed = new URL(inputUrl);
    domain = parsed.hostname.startsWith("www.")
      ? parsed.hostname.substring(4)
      : parsed.hostname;
    mainUrl = `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    throw new Error("Invalid URL provided.");
  }

  let browser: Browser | null = null;
  try {
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

    const scraper = new WebScraper(browser);
    const scrapedPages = await scraper.scrapeWebsite(mainUrl);
    if (scrapedPages.length === 0) {
      throw new Error("No pages could be scraped from the provided URL.");
    }

    return {
      mainUrl,
      domain,
      fileName: `${domain}_${Date.now()}`,
      scrapedPages,
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
};

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
    }
  }
};
