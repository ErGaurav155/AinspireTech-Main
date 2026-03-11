import { Request, Response } from "express";
import { connectToDatabase } from "@/config/database.config";
import WebChatbot from "@/models/web/WebChatbot.model";
import { getAuth } from "@clerk/express";
import puppeteer, { Browser } from "puppeteer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScrapedPage {
  url: string;
  title: string;
  description: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  content: string;
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

// ─── WebScraper ───────────────────────────────────────────────────────────────

class WebScraper {
  private browser: Browser;
  private visitedUrls: Set<string> = new Set();
  private scrapedPages: ScrapedPage[] = [];
  private maxPages = 6;
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

    try {
      const page = await this.browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      );

      await page.goto(url, { waitUntil: "load", timeout: 30000 });

      const scrapedData = await page.evaluate(() => {
        const getMetaContent = (name: string): string => {
          const meta =
            document.querySelector(`meta[name="${name}"]`) ||
            document.querySelector(`meta[property="og:${name}"]`) ||
            document.querySelector(`meta[name="twitter:${name}"]`);
          return meta ? meta.getAttribute("content") || "" : "";
        };

        const extractHeadings = (): {
          h1: string[];
          h2: string[];
          h3: string[];
        } => {
          const headings: { h1: string[]; h2: string[]; h3: string[] } = {
            h1: [],
            h2: [],
            h3: [],
          };
          (["h1", "h2", "h3"] as const).forEach((tag) => {
            headings[tag] = Array.from(document.querySelectorAll(tag))
              .map((el) => el.textContent?.trim() || "")
              .filter((text) => text.length > 0);
          });
          return headings;
        };

        const extractContent = (): string => {
          const mainContent =
            document.querySelector("main") ||
            document.querySelector("article") ||
            document.querySelector(".content") ||
            document.querySelector("#content") ||
            document.querySelector('[role="main"]') ||
            document.body;

          let text =
            (mainContent as HTMLElement).innerText ||
            mainContent.textContent ||
            "";
          text = text.replace(/\s+/g, " ").trim();
          return text.length > 800 ? text.substring(0, 800) + "..." : text;
        };

        return {
          url: window.location.href,
          title: document.title || "",
          description: getMetaContent("description"),
          headings: extractHeadings(),
          content: extractContent(),
        };
      });

      await page.close();
      console.log(`✅ Scraped: ${url} (level ${level})`);

      return { ...scrapedData, level };
    } catch (error) {
      console.error(`❌ Failed to scrape ${url}:`, error);
      return null;
    }
  }

  private extractDomain(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.startsWith("www.") ? domain.substring(4) : domain;
    } catch {
      return url;
    }
  }

  private isSameDomain(url: string, baseDomain: string): boolean {
    try {
      return this.extractDomain(url) === baseDomain;
    } catch {
      return false;
    }
  }

  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url;
    }
  }

  private async scrapePageForDiscovery(
    url: string,
  ): Promise<DiscoveryResult | null> {
    try {
      const page = await this.browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      );

      await page.goto(url, { waitUntil: "load", timeout: 20000 });

      const result = await page.evaluate(() => ({
        url: window.location.href,
        links: Array.from(document.querySelectorAll("a[href]"))
          .map((a) => (a as HTMLAnchorElement).href)
          .filter(
            (href) =>
              href &&
              !href.startsWith("javascript:") &&
              !href.startsWith("mailto:") &&
              !href.startsWith("#") &&
              !href.includes("tel:") &&
              !href.includes("sms:"),
          ),
      }));

      await page.close();
      console.log(`🔍 Discovery: ${url} — ${result.links.length} links found`);
      return result;
    } catch (error) {
      console.error(`❌ Failed discovery for ${url}:`, error);
      return null;
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
    const discoveredUrls = new Set<string>([this.normalizeUrl(startUrl)]);
    let currentLevel = 0;

    while (currentLevel <= this.maxLevel) {
      const currentLevelUrls = levelUrls[currentLevel];
      if (!currentLevelUrls?.length) break;

      console.log(`🔍 Level ${currentLevel}: ${currentLevelUrls.length} pages`);

      const results = await Promise.allSettled(
        currentLevelUrls.map(({ url }) => this.scrapePageForDiscovery(url)),
      );

      let newUrlsCount = 0;
      const totalSoFar = () => Object.values(levelUrls).flat().length;

      for (const result of results) {
        if (result.status !== "fulfilled" || !result.value) continue;

        if (currentLevel < this.maxLevel) {
          for (const link of result.value.links) {
            const normalized = this.normalizeUrl(link);
            if (
              this.isSameDomain(link, baseDomain) &&
              !discoveredUrls.has(normalized) &&
              totalSoFar() < this.maxPages
            ) {
              discoveredUrls.add(normalized);
              levelUrls[currentLevel + 1].push({
                url: normalized,
                level: currentLevel + 1,
              });
              newUrlsCount++;
            }
            if (totalSoFar() >= this.maxPages) break;
          }
        }
        if (totalSoFar() >= this.maxPages) break;
      }

      console.log(`🔗 Level ${currentLevel + 1}: ${newUrlsCount} new URLs`);
      currentLevel++;
      if (totalSoFar() >= this.maxPages) break;
    }

    const allUrls = Object.values(levelUrls).flat().slice(0, this.maxPages);
    console.log(`🎯 Total URLs to scrape: ${allUrls.length}`);
    return allUrls;
  }

  async scrapeWebsite(startUrl: string): Promise<ScrapedPage[]> {
    console.log("🚀 Starting scrape...");
    const urlsToScrape = await this.discoverAllUrls(startUrl);

    this.visitedUrls.clear();

    const results = await Promise.allSettled(
      urlsToScrape.map(({ url, level }) => this.scrapePage(url, level)),
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

// ─── Controller ───────────────────────────────────────────────────────────────

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
            domain: new URL(chatbot.websiteUrl).hostname,
            userId,
            chatbotId,
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Normalize URL
    let inputUrl = url.trim();
    if (!/^https?:\/\//i.test(inputUrl)) {
      inputUrl = `http://${inputUrl}`;
    }

    let mainUrl: string;
    let domain: string;
    try {
      const parsed = new URL(inputUrl);
      domain = parsed.hostname.startsWith("www.")
        ? parsed.hostname.substring(4)
        : parsed.hostname;
      mainUrl = `${parsed.protocol}//${domain}`;
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid URL provided.",
        timestamp: new Date().toISOString(),
      });
    }

    // Launch puppeteer — works on Railway (full Linux) and localhost
    let browser: Browser | null = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage", // important for Railway's limited /dev/shm
          "--disable-gpu",
          "--no-zygote",
          "--single-process", // important for Railway containers
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
    } finally {
      if (browser) {
        await browser.close();
        console.log("🔚 Browser closed");
      }
    }
  } catch (error) {
    console.error("💥 Scraping error:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while scraping the website.",
      timestamp: new Date().toISOString(),
    });
  }
};
