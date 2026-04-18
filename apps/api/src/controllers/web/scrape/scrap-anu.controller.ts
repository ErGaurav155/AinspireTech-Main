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
  private maxPages = 12;
  private maxLevel = 3;

  constructor(browser: Browser) {
    this.browser = browser;
  }

  private async scrapePage(
    url: string,
    level: number,
  ): Promise<ScrapedPage | null> {
    if (this.visitedUrls.has(url)) return null;
    this.visitedUrls.add(url);
    const page = await this.browser.newPage();
    try {
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36",
      );
      await page.goto(url, { waitUntil: "load", timeout: 30000 });

      // Use evaluate with proper typing
      const scrapedData = await page.evaluate(() => {
        const getMeta = (): Record<string, string> => {
          const tags = Array.from(
            document.querySelectorAll(
              "meta[name], meta[property], link[rel='canonical']",
            ),
          );
          return tags.reduce((meta: Record<string, string>, tag) => {
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

        const getHeadings = (tag: string): string[] => {
          return Array.from(document.querySelectorAll(tag))
            .map((el) => (el.textContent ?? "").trim())
            .filter((text) => text.length > 0);
        };

        const getText = (root: Element | Document): string => {
          const text = (root.textContent || "").replace(/\s+/g, " ").trim();
          return text;
        };

        const getContent = (): string => {
          const el =
            document.querySelector("main") ||
            document.querySelector("article") ||
            document.querySelector(".content") ||
            document.querySelector("#content") ||
            document.querySelector('[role="main"]') ||
            document.body;

          if (!el) return "";
          const text = getText(el);
          return text.length > 4000 ? text.substring(0, 4000) + "..." : text;
        };

        const getFullText = (): string => {
          const bodyText = getText(document.body);
          return bodyText.length > 12000
            ? bodyText.substring(0, 12000) + "..."
            : bodyText;
        };

        const getLinks = (): string[] => {
          return Array.from(document.querySelectorAll("a[href]"))
            .map((a) => (a as HTMLAnchorElement).href.trim())
            .filter(
              (href) =>
                href &&
                !href.startsWith("javascript:") &&
                !href.startsWith("mailto:") &&
                !href.startsWith("#") &&
                !href.includes("tel:") &&
                !href.includes("sms:"),
            );
        };

        const getImages = (): string[] => {
          return Array.from(document.querySelectorAll("img[src]"))
            .map((img) => (img as HTMLImageElement).src.trim())
            .filter((src) => !!src);
        };

        return {
          url: window.location.href,
          title: document.title ?? "",
          description: getMeta()["description"] || "",
          meta: getMeta(),
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
        };
      });

      console.log(`✅ Scraped: ${url} (level ${level})`);
      return { ...scrapedData, level };
    } catch (error) {
      console.error(`❌ Failed to scrape ${url}:`, error);
      return null;
    } finally {
      try {
        await page.close();
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
    const page = await this.browser.newPage();
    try {
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36",
      );
      await page.goto(url, { waitUntil: "load", timeout: 20000 });

      const result = await page.evaluate(() => {
        const getLinks = (): string[] => {
          return Array.from(document.querySelectorAll("a[href]"))
            .map((a) => (a as HTMLAnchorElement).href)
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
      });

      console.log(`🔍 Discovery: ${url} — ${result.links.length} links found`);
      return result;
    } catch (error) {
      console.error(`❌ Failed discovery for ${url}:`, error);
      return null;
    } finally {
      try {
        await page.close();
      } catch {}
    }
  }

  private async discoverAllUrls(startUrl: string): Promise<DiscoveredUrl[]> {
    const baseDomain = this.extractDomain(startUrl);
    const levelUrls: Record<number, DiscoveredUrl[]> = {
      0: [{ url: this.normalizeUrl(startUrl), level: 0 }],
      1: [],
      2: [],
      3: [],
    };
    const discovered = new Set<string>([this.normalizeUrl(startUrl)]);
    let currentLevel = 0;

    while (currentLevel <= this.maxLevel) {
      const curr = levelUrls[currentLevel];
      if (!curr?.length) break;
      console.log(`🔍 Level ${currentLevel}: ${curr.length} pages`);

      const results = await Promise.allSettled(
        curr.map(({ url }) => this.scrapePageForDiscovery(url)),
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

    const results = await Promise.allSettled(
      urls.map(({ url, level }) => this.scrapePage(url, level)),
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
