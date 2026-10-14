import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  readDeals,
  writeDeals,
  readRawDealsJson,
  writeRawDealsJson,
  readSettings,
  writeSettings,
} from './server/dealsStore.js';
import {
  inspectProductUrl,
  checkDealPrice,
  checkAllDeals,
} from './server/priceEngine.js';
import { DealItem } from './src/types/deal.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// --- API ROUTES ---

// 1. Get all deals
app.get('/api/deals', (_req: Request, res: Response) => {
  try {
    const deals = readDeals();
    res.json(deals);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to read deals' });
  }
});

// 2. Add a new deal
app.post('/api/deals', (req: Request, res: Response) => {
  try {
    const {
      title,
      make,
      model,
      sku,
      url,
      favoriteWebsites,
      targetPrice,
      currentPrice,
      category,
      imageUrl,
      notes,
    } = req.body;

    if (!title || !targetPrice) {
      return res.status(400).json({ error: 'Title and target price are required.' });
    }

    const deals = readDeals();
    const newDealId = `deal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const parsedTarget = parseFloat(targetPrice);
    const parsedCurrent = currentPrice ? parseFloat(currentPrice) : null;
    const isTriggered = parsedCurrent !== null ? parsedCurrent <= parsedTarget : false;

    const newDeal: DealItem = {
      id: newDealId,
      title: title.trim(),
      make: make?.trim() || '',
      model: model?.trim() || '',
      sku: sku?.trim() || '',
      url: url?.trim() || '',
      favoriteWebsites: Array.isArray(favoriteWebsites) && favoriteWebsites.length > 0 ? favoriteWebsites : ['Home Depot', 'Amazon'],
      targetPrice: parsedTarget,
      currentPrice: parsedCurrent,
      initialPrice: parsedCurrent,
      lowestPrice: parsedCurrent,
      currency: 'USD',
      inStock: true,
      isTriggered,
      notifyOnDropOnly: true,
      lastCheckedAt: parsedCurrent ? new Date().toISOString() : null,
      status: isTriggered ? 'triggered' : 'active',
      category: category?.trim() || 'General',
      imageUrl: imageUrl?.trim() || '',
      notes: notes?.trim() || '',
      history: parsedCurrent
        ? [
            {
              id: `log-${Date.now()}`,
              timestamp: new Date().toISOString(),
              price: parsedCurrent,
              retailer: favoriteWebsites?.[0] || 'Initial',
              inStock: true,
              statusMessage: 'Item added with baseline price',
            },
          ]
        : [],
    };

    deals.unshift(newDeal);
    writeDeals(deals);
    res.status(201).json(newDeal);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create deal' });
  }
});

// 3. Update an existing deal
app.put('/api/deals/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deals = readDeals();
    const index = deals.findIndex((d) => d.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const currentDeal = deals[index];
    const updated = {
      ...currentDeal,
      ...req.body,
      id, // Preserve immutable id
    };

    // Clear any previous error when user updates deal
    delete updated.lastError;

    if (updated.currentPrice !== null && updated.targetPrice) {
      updated.isTriggered = updated.currentPrice <= updated.targetPrice;
      if (updated.status !== 'paused') {
        updated.status = updated.isTriggered ? 'triggered' : 'active';
      }
    }

    deals[index] = updated;
    writeDeals(deals);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update deal' });
  }
});

// 4. Delete a deal
app.delete('/api/deals/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deals = readDeals();
    const filtered = deals.filter((d) => d.id !== id);
    if (deals.length === filtered.length) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    writeDeals(filtered);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete deal' });
  }
});

// 5. Inspect URL with Gemini to auto-extract product title, make, model, price
app.post('/api/inspect-url', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid URL is required.' });
    }
    const metadata = await inspectProductUrl(url);
    res.json(metadata);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'URL inspection failed.' });
  }
});

// 6. Check price for a single deal
app.post('/api/check-price/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await checkDealPrice(id);
    const updatedDeals = readDeals();
    const updatedDeal = updatedDeals.find((d) => d.id === id);
    res.json({ result, deal: updatedDeal });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Price check failed' });
  }
});

// 7. Check all deals in batch
app.post('/api/check-all', async (_req: Request, res: Response) => {
  try {
    const results = await checkAllDeals();
    const deals = readDeals();
    res.json({ results, deals });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Batch price check failed' });
  }
});

// 8. Raw JSON access for Git file viewing & direct editing
app.get('/api/deals/raw', (_req: Request, res: Response) => {
  try {
    const raw = readRawDealsJson();
    res.setHeader('Content-Type', 'application/json');
    res.send(raw);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/deals/raw', (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Expected content as string.' });
    }
    const updated = writeRawDealsJson(content);
    res.json({ success: true, count: updated.length, deals: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid JSON format' });
  }
});

// 9. Export deals as CSV
app.get('/api/deals/export/csv', (_req: Request, res: Response) => {
  try {
    const deals = readDeals();
    const headers = ['id', 'title', 'make', 'model', 'sku', 'url', 'targetPrice', 'currentPrice', 'isTriggered', 'status', 'lastCheckedAt', 'favoriteWebsites'];
    const rows = deals.map((d) => [
      `"${d.id}"`,
      `"${(d.title || '').replace(/"/g, '""')}"`,
      `"${(d.make || '').replace(/"/g, '""')}"`,
      `"${(d.model || '').replace(/"/g, '""')}"`,
      `"${(d.sku || '').replace(/"/g, '""')}"`,
      `"${(d.url || '').replace(/"/g, '""')}"`,
      d.targetPrice,
      d.currentPrice !== null ? d.currentPrice : '',
      d.isTriggered ? 'TRUE' : 'FALSE',
      `"${d.status}"`,
      `"${d.lastCheckedAt || ''}"`,
      `"${(d.favoriteWebsites || []).join(';')}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="deals-tracker.csv"');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Settings API
app.get('/api/settings', (_req: Request, res: Response) => {
  try {
    res.json(readSettings());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', (req: Request, res: Response) => {
  try {
    const updated = writeSettings(req.body);
    restartScheduler();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. System monitor status
let nextScheduledCheckTimestamp: number | null = null;
let lastSchedulerRun: string | null = null;
let schedulerTimer: NodeJS.Timeout | null = null;

function runScheduledCheck() {
  const settings = readSettings();
  if (settings.autoCheckIntervalMinutes <= 0) return;

  console.log(`[AutoCheck] Running scheduled price checks across deals...`);
  lastSchedulerRun = new Date().toISOString();
  checkAllDeals()
    .then((results) => {
      console.log(`[AutoCheck] Completed check for ${results.length} deals.`);
    })
    .catch((err) => {
      console.error('[AutoCheck] Error during scheduled check:', err);
    });

  const nextDelayMs = settings.autoCheckIntervalMinutes * 60 * 1000;
  nextScheduledCheckTimestamp = Date.now() + nextDelayMs;
  schedulerTimer = setTimeout(runScheduledCheck, nextDelayMs);
}

function restartScheduler() {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
  const settings = readSettings();
  if (settings.autoCheckIntervalMinutes > 0) {
    const delayMs = settings.autoCheckIntervalMinutes * 60 * 1000;
    nextScheduledCheckTimestamp = Date.now() + delayMs;
    schedulerTimer = setTimeout(runScheduledCheck, delayMs);
    console.log(`[Scheduler] Next price check in ${settings.autoCheckIntervalMinutes} minutes.`);
  } else {
    nextScheduledCheckTimestamp = null;
    console.log('[Scheduler] Background auto-check is paused (manual mode).');
  }
}

app.get('/api/status', (_req: Request, res: Response) => {
  const deals = readDeals();
  const settings = readSettings();
  const triggeredCount = deals.filter((d) => d.isTriggered).length;
  const activeCount = deals.filter((d) => d.status === 'active' || d.status === 'triggered').length;

  res.json({
    totalDeals: deals.length,
    activeMonitors: activeCount,
    triggeredDeals: triggeredCount,
    lastSchedulerRun,
    nextScheduledCheckTimestamp,
    autoCheckIntervalMinutes: settings.autoCheckIntervalMinutes,
  });
});

// Initialize background scheduler
restartScheduler();

// --- FRONTEND INTEGRATION (Vite Dev / Dist Production) ---
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, () => {
    console.log(`PricePulse Deal Tracker running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
