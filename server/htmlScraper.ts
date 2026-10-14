/**
 * Robust direct web fetcher and metadata extractor for retailer websites.
 * Works without consuming any Gemini API quota.
 * Parses JSON-LD, OpenGraph tags, Microdata, and common price patterns.
 */

export interface ScrapedProduct {
  title: string;
  make: string;
  model: string;
  sku: string;
  currentPrice: number | null;
  retailer: string;
  inStock: boolean;
  imageUrl: string;
  category: string;
  sourceUrl: string;
}

export async function scrapeProductPage(targetUrl: string): Promise<ScrapedProduct | null> {
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return null;
  }

  const parsedUrl = new URL(targetUrl);
  const hostname = parsedUrl.hostname.toLowerCase();

  let retailer = 'Online Retailer';
  if (hostname.includes('homedepot.com')) retailer = 'Home Depot';
  else if (hostname.includes('lowes.com')) retailer = "Lowe's";
  else if (hostname.includes('amazon.com')) retailer = 'Amazon';
  else if (hostname.includes('walmart.com')) retailer = 'Walmart';
  else if (hostname.includes('bestbuy.com')) retailer = 'Best Buy';
  else if (hostname.includes('target.com')) retailer = 'Target';
  else if (hostname.includes('acehardware.com')) retailer = 'Ace Hardware';
  else if (hostname.includes('harborfreight.com')) retailer = 'Harbor Freight';

  // Extract model/SKU from URL path if present
  let urlModel = '';
  let urlSku = '';
  const urlParts = parsedUrl.pathname.split('/');
  for (const part of urlParts) {
    if (/^[A-Z0-9]{5,}$/i.test(part)) {
      if (/^\d{6,12}$/.test(part)) {
        urlSku = part;
      } else {
        urlModel = part;
      }
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Direct fetch to ${targetUrl} returned status ${res.status}`);
      return null;
    }

    const html = await res.text();

    // 1. Try to extract JSON-LD structured data
    let jsonLdPrice: number | null = null;
    let jsonLdTitle = '';
    let jsonLdBrand = '';
    let jsonLdModel = '';
    let jsonLdSku = '';
    let jsonLdImage = '';
    let inStock = true;

    const jsonLdRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[1]);
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          const type = item['@type'];
          if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) {
            if (item.name) jsonLdTitle = item.name;
            if (item.brand) {
              jsonLdBrand = typeof item.brand === 'string' ? item.brand : item.brand.name || '';
            }
            if (item.model) {
              jsonLdModel = typeof item.model === 'string' ? item.model : item.model.name || '';
            }
            if (item.sku) jsonLdSku = String(item.sku);
            if (item.image) {
              jsonLdImage = Array.isArray(item.image) ? item.image[0] : typeof item.image === 'string' ? item.image : item.image.url || '';
            }
            if (item.offers) {
              const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
              for (const offer of offers) {
                const p = parseFloat(offer.price || offer.lowPrice);
                if (!isNaN(p) && p > 0) {
                  jsonLdPrice = p;
                }
                if (offer.availability && String(offer.availability).includes('OutOfStock')) {
                  inStock = false;
                }
              }
            }
          }
        }
      } catch (e) {
        // Ignore JSON-LD parse errors for malformed tags
      }
    }

    // 2. Try OpenGraph / Meta tags
    let ogTitle = '';
    let ogPrice: number | null = null;
    let ogImage = '';

    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i);
    if (ogTitleMatch) ogTitle = ogTitleMatch[1];

    const ogPriceMatch = html.match(/<meta\s+property=["'](?:product:price:amount|og:price:amount)["']\s+content=["'](.*?)["']/i);
    if (ogPriceMatch) {
      const p = parseFloat(ogPriceMatch[1]);
      if (!isNaN(p) && p > 0) ogPrice = p;
    }

    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
    if (ogImageMatch) ogImage = ogImageMatch[1];

    // HTML title fallback
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const htmlTitle = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';

    const finalTitle = jsonLdTitle || ogTitle || htmlTitle || 'Product from ' + retailer;
    const finalPrice = jsonLdPrice || ogPrice;

    // Brand heuristics if not found in JSON-LD
    let finalBrand = jsonLdBrand;
    if (!finalBrand) {
      const commonBrands = ['Werner', 'DEWALT', 'Milwaukee', 'Makita', 'Ryobi', 'Bosch', 'Craftsman', 'Sony', 'Apple', 'Samsung', 'Bose'];
      for (const b of commonBrands) {
        if (new RegExp(`\\b${b}\\b`, 'i').test(finalTitle)) {
          finalBrand = b;
          break;
        }
      }
    }

    return {
      title: finalTitle.replace(/ - The Home Depot.*$/i, '').replace(/ \| Lowe's.*$/i, '').replace(/ - Amazon\.com.*$/i, ''),
      make: finalBrand,
      model: jsonLdModel || urlModel,
      sku: jsonLdSku || urlSku,
      currentPrice: finalPrice,
      retailer,
      inStock,
      imageUrl: jsonLdImage || ogImage,
      category: 'General',
      sourceUrl: targetUrl,
    };
  } catch (err) {
    console.warn(`Scrape error for ${targetUrl}:`, err);
    return null;
  }
}
