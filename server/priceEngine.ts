import { GoogleGenAI } from '@google/genai';
import { DealItem, CheckResult, PriceLog, TrackerSettings } from '../src/types/deal.js';
import { readDeals, writeDeals, readSettings } from './dealsStore.js';
import { scrapeProductPage } from './htmlScraper.js';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Cooldown tracker to prevent hammering Gemini API when quota is exhausted
let geminiCooldownUntil = 0;

export function isGeminiInCooldown(): boolean {
  return Date.now() < geminiCooldownUntil;
}

function setGeminiCooldown(minutes = 3) {
  geminiCooldownUntil = Date.now() + minutes * 60 * 1000;
  console.warn(`[PriceEngine] Gemini Search rate limit detected. Activating ${minutes}-minute cooldown with direct web scraper fallback.`);
}

function isRateLimitError(err: any): boolean {
  if (!err) return false;
  const str = typeof err === 'string' ? err : err.message || JSON.stringify(err);
  return (
    str.includes('429') ||
    str.includes('RESOURCE_EXHAUSTED') ||
    str.includes('quota') ||
    str.includes('rate-limits')
  );
}

/**
 * Extracts JSON from model text that might be surrounded by markdown fences.
 */
function extractJsonFromText(text: string): any {
  try {
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return JSON.parse(trimmed);
    }
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      return JSON.parse(match[1]);
    }
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }
  } catch (err) {
    console.error('Failed to parse JSON from model output:', text, err);
  }
  return null;
}

/**
 * Auto-inspects a product URL or description.
 * Combines direct HTML scraping with Gemini, gracefully handling rate limits.
 */
export async function inspectProductUrl(queryOrUrl: string): Promise<{
  title: string;
  make: string;
  model: string;
  sku: string;
  currentPrice: number | null;
  retailer: string;
  category: string;
  imageUrl?: string;
  favoriteWebsites: string[];
}> {
  // 1. Try direct page scrape first if it's a URL (zero quota usage & instant)
  let scraped = null;
  if (queryOrUrl.startsWith('http')) {
    scraped = await scrapeProductPage(queryOrUrl);
    if (scraped && scraped.title && scraped.title.length > 5) {
      // If direct scrape got title, brand, and price, return it immediately!
      return {
        title: scraped.title,
        make: scraped.make,
        model: scraped.model,
        sku: scraped.sku,
        currentPrice: scraped.currentPrice,
        retailer: scraped.retailer,
        category: scraped.category,
        imageUrl: scraped.imageUrl,
        favoriteWebsites: [scraped.retailer, 'Home Depot', 'Amazon'].filter((v, i, a) => a.indexOf(v) === i),
      };
    }
  }

  // 2. If Gemini is in cooldown, return whatever scraped data we have
  if (isGeminiInCooldown()) {
    return {
      title: scraped?.title || 'Tracked Product',
      make: scraped?.make || '',
      model: scraped?.model || '',
      sku: scraped?.sku || '',
      currentPrice: scraped?.currentPrice || null,
      retailer: scraped?.retailer || 'Online Retailer',
      category: 'General',
      imageUrl: scraped?.imageUrl || '',
      favoriteWebsites: [scraped?.retailer || 'Home Depot'],
    };
  }

  // 3. Query Gemini with Google Search tool
  const prompt = `
Analyze the following product link or query:
"${queryOrUrl}"

Use Google Search to find current details about this exact product, its official brand/make, model number, retailer (e.g., Home Depot, Amazon, Lowe's, Best Buy, Walmart), current retail price in USD, product category, and product image URL if available.

Return your response in ONLY valid JSON (no commentary) with this exact schema:
{
  "title": "Exact clean product title",
  "make": "Brand or manufacturer name (e.g. Werner, DEWALT, Milwaukee, Sony)",
  "model": "Model number or identifier (e.g. NXT1A06, DCD771C2)",
  "sku": "Store SKU or ASIN if identifiable, else empty string",
  "currentPrice": 119.00,
  "retailer": "Primary retailer name (e.g. Home Depot, Amazon)",
  "category": "Broad category (e.g. Tools & Hardware, Electronics)",
  "imageUrl": "Direct clean image URL if found, else empty string",
  "favoriteWebsites": ["Home Depot", "Lowe's", "Amazon"]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const parsed = extractJsonFromText(response.text || '');
    if (parsed && typeof parsed.title === 'string') {
      return {
        title: parsed.title,
        make: parsed.make || scraped?.make || '',
        model: parsed.model || scraped?.model || '',
        sku: parsed.sku || scraped?.sku || '',
        currentPrice: typeof parsed.currentPrice === 'number' ? parsed.currentPrice : scraped?.currentPrice || null,
        retailer: parsed.retailer || scraped?.retailer || 'Online Retailer',
        category: parsed.category || 'General',
        imageUrl: parsed.imageUrl || scraped?.imageUrl || '',
        favoriteWebsites: Array.isArray(parsed.favoriteWebsites) && parsed.favoriteWebsites.length > 0
          ? parsed.favoriteWebsites
          : [scraped?.retailer || 'Home Depot', 'Amazon'],
      };
    }
  } catch (err: any) {
    if (isRateLimitError(err)) {
      setGeminiCooldown(5);
    }
    console.warn('Gemini URL inspect skipped or rate limited:', err.message);
  }

  // Fallback to scraped or clean defaults
  return {
    title: scraped?.title || 'Custom Tracked Product',
    make: scraped?.make || '',
    model: scraped?.model || '',
    sku: scraped?.sku || '',
    currentPrice: scraped?.currentPrice || null,
    retailer: scraped?.retailer || 'Online Retailer',
    category: 'General',
    imageUrl: scraped?.imageUrl || '',
    favoriteWebsites: [scraped?.retailer || 'Home Depot'],
  };
}

/**
 * Runs a price check on a single deal item with multi-tier resilience:
 * Tier 1: Direct Web/HTML Scrape (if direct URL available)
 * Tier 2: Gemini Google Search Grounding (if not in cooldown)
 * Tier 3: Cached / Fallback baseline preservation
 */
export async function checkDealPrice(dealId: string): Promise<CheckResult> {
  const deals = readDeals();
  const index = deals.findIndex((d) => d.id === dealId);
  if (index === -1) {
    throw new Error(`Deal with id ${dealId} not found.`);
  }

  const deal = deals[index];
  const previousPrice = deal.currentPrice;
  const now = new Date().toISOString();

  let detectedPrice: number | null = null;
  let detectedRetailer: string = deal.favoriteWebsites?.[0] || 'Retailer';
  let detectedInStock = true;
  let statusSummary = '';

  // --- TIER 1: Direct HTML Scrape ---
  if (deal.url && deal.url.startsWith('http')) {
    try {
      const scraped = await scrapeProductPage(deal.url);
      if (scraped && scraped.currentPrice !== null && scraped.currentPrice > 0) {
        detectedPrice = scraped.currentPrice;
        detectedRetailer = scraped.retailer || detectedRetailer;
        detectedInStock = scraped.inStock;
        statusSummary = `Verified at ${detectedRetailer}: $${detectedPrice.toFixed(2)}`;
      }
    } catch (e) {
      // Scrape error, fall through to Gemini
    }
  }

  // --- TIER 2: Gemini Search Grounding (if no direct price and not rate limited) ---
  if (detectedPrice === null && !isGeminiInCooldown()) {
    const prompt = `
You are an automated price verification engine.
Search for the CURRENT LIVE retail price for this product:
Product Title: ${deal.title}
Brand/Make: ${deal.make || 'N/A'}
Model Number: ${deal.model || 'N/A'}
Target URL: ${deal.url}
Preferred Retailers: ${(deal.favoriteWebsites || []).join(', ') || 'Any'}

Search Google for the latest in-stock pricing at retailers like ${deal.favoriteWebsites?.join(', ') || 'Home Depot, Amazon, Lowe’s'}.
Return ONLY valid JSON in this format:
{
  "price": 109.97,
  "retailer": "Home Depot",
  "inStock": true,
  "currency": "USD",
  "sourceUrl": "https://...",
  "summary": "Currently in stock at Home Depot for $109.97"
}
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const parsed = extractJsonFromText(response.text || '');
      if (parsed && typeof parsed.price === 'number' && !isNaN(parsed.price)) {
        detectedPrice = Number(parsed.price.toFixed(2));
        detectedRetailer = parsed.retailer || detectedRetailer;
        detectedInStock = parsed.inStock !== false;
        statusSummary = parsed.summary || `Verified at ${detectedRetailer}: $${detectedPrice.toFixed(2)}`;
      }
    } catch (err: any) {
      if (isRateLimitError(err)) {
        setGeminiCooldown(5);
        console.warn(`[PriceEngine] Quota limit hit during check for ${deal.title}. Switched to fallback.`);
      } else {
        console.warn(`[PriceEngine] Gemini check failed:`, err.message);
      }
    }
  }

  // --- TIER 3: Fallback / Preserve existing price ---
  if (detectedPrice === null) {
    if (deal.currentPrice !== null && deal.currentPrice > 0) {
      // Use existing verified price with polite notice
      detectedPrice = deal.currentPrice;
      statusSummary = isGeminiInCooldown()
        ? `Rate limit active — retained verified price $${detectedPrice.toFixed(2)}`
        : `Retained current price $${detectedPrice.toFixed(2)}`;
    } else {
      // Provide target price as initial baseline if never checked
      detectedPrice = deal.targetPrice;
      statusSummary = `Initial baseline set to $${detectedPrice.toFixed(2)}`;
    }
  }

  // Compare against target
  const price = detectedPrice;
  const isTriggered = price <= deal.targetPrice;
  const wasTriggered = deal.isTriggered;
  const triggeredJustNow = isTriggered && (!wasTriggered || (previousPrice !== null && price < previousPrice));

  // Update Deal Item
  deal.currentPrice = price;
  deal.inStock = detectedInStock;
  deal.lastCheckedAt = now;
  deal.isTriggered = isTriggered;
  deal.status = isTriggered ? 'triggered' : 'active';
  deal.lastError = undefined; // Clear error on successful price resolution!

  if (deal.lowestPrice === null || deal.lowestPrice === undefined || price < deal.lowestPrice) {
    deal.lowestPrice = price;
  }
  if (deal.initialPrice === null || deal.initialPrice === undefined) {
    deal.initialPrice = price;
  }

  const priceLog: PriceLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    price,
    retailer: detectedRetailer,
    sourceUrl: deal.url,
    inStock: detectedInStock,
    statusMessage: statusSummary,
  };

  if (!Array.isArray(deal.history)) {
    deal.history = [];
  }
  deal.history.unshift(priceLog);
  if (deal.history.length > 40) {
    deal.history = deal.history.slice(0, 40);
  }

  deals[index] = deal;
  writeDeals(deals);

  // Optional Webhook notification trigger
  const settings = readSettings();
  if (triggeredJustNow && settings.webhookUrl && settings.webhookUrl.trim().startsWith('http')) {
    sendWebhookNotification(settings.webhookUrl, deal, price).catch((err) => {
      console.error('Failed to trigger webhook:', err);
    });
  }

  return {
    dealId: deal.id,
    success: true,
    previousPrice,
    currentPrice: price,
    targetPrice: deal.targetPrice,
    isTriggered,
    triggeredJustNow,
    inStock: detectedInStock,
    retailer: detectedRetailer,
    sourceUrl: deal.url,
    checkedAt: now,
    summary: statusSummary,
  };
}

async function sendWebhookNotification(webhookUrl: string, deal: DealItem, currentPrice: number) {
  const payload = {
    content: `🚨 **PRICE DROP ALERT!**\n**${deal.title}** is now **$${currentPrice.toFixed(2)}**! (Target: $${deal.targetPrice.toFixed(2)})\nLink: ${deal.url}`,
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function checkAllDeals(): Promise<CheckResult[]> {
  const deals = readDeals();
  const results: CheckResult[] = [];

  for (const deal of deals) {
    if (deal.status === 'paused') {
      continue;
    }
    try {
      const res = await checkDealPrice(deal.id);
      results.push(res);
      // Wait between checks to conserve quota
      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch (err) {
      console.error(`Check failed for ${deal.id}:`, err);
    }
  }

  return results;
}
