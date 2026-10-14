import { GoogleGenAI } from '@google/genai';
import { DealItem, CheckResult, PriceLog, TrackerSettings } from '../src/types/deal.js';
import { readDeals, writeDeals, readSettings } from './dealsStore.js';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

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
    // Fallback: search for first { to last }
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
 * Auto-inspects a product URL or description to extract brand, model, title, current price, retailer
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
  "currentPrice": 119.00 (numeric price in USD, or null if unknown),
  "retailer": "Primary retailer name (e.g. Home Depot, Amazon)",
  "category": "Broad category (e.g. Tools & Hardware, Electronics, Home Improvement)",
  "imageUrl": "Direct clean image URL if found, else empty string",
  "favoriteWebsites": ["Home Depot", "Lowe's", "Amazon"] (top 2-4 competitive stores for this product)
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
        make: parsed.make || '',
        model: parsed.model || '',
        sku: parsed.sku || '',
        currentPrice: typeof parsed.currentPrice === 'number' ? parsed.currentPrice : null,
        retailer: parsed.retailer || 'Online Retailer',
        category: parsed.category || 'General',
        imageUrl: parsed.imageUrl || '',
        favoriteWebsites: Array.isArray(parsed.favoriteWebsites) ? parsed.favoriteWebsites : ['Home Depot', 'Amazon'],
      };
    }
  } catch (err) {
    console.error('Error inspecting product URL with Gemini:', err);
  }

  // Graceful fallback heuristics if search returns unexpected response
  const isHomeDepot = queryOrUrl.includes('homedepot.com');
  const isAmazon = queryOrUrl.includes('amazon.com');
  let fallbackRetailer = isHomeDepot ? 'Home Depot' : isAmazon ? 'Amazon' : 'Online Store';

  return {
    title: 'Custom Product Entry',
    make: '',
    model: '',
    sku: '',
    currentPrice: null,
    retailer: fallbackRetailer,
    category: 'General',
    imageUrl: '',
    favoriteWebsites: [fallbackRetailer],
  };
}

/**
 * Runs a real price check on a single deal item
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

  const prompt = `
You are an automated price verification engine.
Search for the CURRENT LIVE retail price for this product:
Product Title: ${deal.title}
Brand/Make: ${deal.make || 'N/A'}
Model Number: ${deal.model || 'N/A'}
Target URL: ${deal.url}
Preferred Retailers: ${(deal.favoriteWebsites || []).join(', ') || 'Any'}

Search Google for the latest in-stock pricing at retailers like ${deal.favoriteWebsites?.join(', ') || 'Home Depot, Amazon, Lowe’s'}.
Return ONLY valid JSON (no markdown explanation) in this format:
{
  "price": 109.97,
  "retailer": "Home Depot",
  "inStock": true,
  "currency": "USD",
  "sourceUrl": "https://...",
  "summary": "Currently in stock at Home Depot for $109.97 (regular $124.00)"
}

Rules:
- "price" must be a positive number in USD (e.g. 99.97). Do not include dollar signs in the numeric field.
- If out of stock, "inStock" should be false.
- Keep "summary" under 120 characters.
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
    const price = parsed && typeof parsed.price === 'number' && !isNaN(parsed.price) ? Number(parsed.price.toFixed(2)) : null;

    if (price === null) {
      throw new Error('Unable to parse verified numeric price from retailer search.');
    }

    const retailer = parsed?.retailer || 'Retailer';
    const inStock = parsed?.inStock !== false;
    const summary = parsed?.summary || `Price checked: $${price.toFixed(2)} at ${retailer}`;
    const sourceUrl = parsed?.sourceUrl || deal.url;

    const isTriggered = price <= deal.targetPrice;
    // Check if triggered just now (was not triggered before, or price dropped further)
    const wasTriggered = deal.isTriggered;
    const triggeredJustNow = isTriggered && (!wasTriggered || (previousPrice !== null && price < previousPrice));

    // Update Deal Item
    deal.currentPrice = price;
    deal.inStock = inStock;
    deal.lastCheckedAt = now;
    deal.isTriggered = isTriggered;
    deal.status = isTriggered ? 'triggered' : 'active';
    deal.lastError = undefined;

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
      retailer,
      sourceUrl,
      inStock,
      statusMessage: summary,
    };

    if (!Array.isArray(deal.history)) {
      deal.history = [];
    }
    deal.history.unshift(priceLog);
    // Keep last 40 history entries
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
      inStock,
      retailer,
      sourceUrl,
      checkedAt: now,
      summary,
    };
  } catch (err: any) {
    console.error(`Error checking price for deal ${dealId}:`, err);
    deal.lastCheckedAt = now;
    deal.lastError = err.message || 'Price check error';
    deals[index] = deal;
    writeDeals(deals);

    return {
      dealId: deal.id,
      success: false,
      previousPrice,
      currentPrice: deal.currentPrice,
      targetPrice: deal.targetPrice,
      isTriggered: deal.isTriggered,
      triggeredJustNow: false,
      inStock: deal.inStock,
      checkedAt: now,
      summary: `Failed to verify price: ${err.message || 'Network error'}`,
    };
  }
}

/**
 * Dispatches an alert to an external webhook (e.g., Discord or Slack)
 */
async function sendWebhookNotification(webhookUrl: string, deal: DealItem, currentPrice: number) {
  const payload = {
    content: `🚨 **PRICE DROP ALERT!**\n**${deal.title}** (${deal.make || ''} ${deal.model || ''}) is now **$${currentPrice.toFixed(2)}**! (Target: $${deal.targetPrice.toFixed(2)})\nLink: ${deal.url}`,
    embeds: [
      {
        title: deal.title,
        url: deal.url,
        color: 0x10b981, // emerald green
        fields: [
          { name: 'Current Price', value: `$${currentPrice.toFixed(2)}`, inline: true },
          { name: 'Target Threshold', value: `$${deal.targetPrice.toFixed(2)}`, inline: true },
          { name: 'Savings', value: `$${Math.max(0, deal.targetPrice - currentPrice).toFixed(2)} below trigger`, inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Runs price checks for all active deals in sequence
 */
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
      // Small pause between external search requests to stay within rate quotas
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (err) {
      console.error(`Check failed for ${deal.id}:`, err);
    }
  }

  return results;
}
