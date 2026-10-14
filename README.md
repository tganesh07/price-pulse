# PricePulse - Automated Deal & Price Drop Tracker

A full-stack automated price tracking and alert system that monitors products across your favorite retailers (Home Depot, Amazon, Lowe's, Best Buy, Walmart, etc.) and dispatches **push notifications** and sound alerts whenever a target price threshold is met.

Pre-configured to track the **Werner 6 ft. Fiberglass Step Ladder (Model: NXT1A06)** at Home Depot with an alert trigger set to **<$100**.

---

## ⚡ Features

- **Automated Price Check Engine**: Background worker that continuously monitors product prices at configurable intervals (every 5m, 15m, 30m, 1h, or manual).
- **Target Price Threshold Triggers**: Only alerts you when `currentPrice <= targetPrice` (e.g., Werner Ladder under $100).
- **Native Browser Push Notifications**: Real desktop push notifications with product image and direct link to the retail deal.
- **Audio Chime Alerts**: Built-in 2-tone harp chime alert powered by the Web Audio API.
- **Webhook Integration**: Optional instant alert pings to Discord or Slack channels.
- **Git File Persistence (`data/deals.json`)**: All deals and alert conditions persist in `data/deals.json`. Anyone can clone this repository, add their own products to the file or UI, and run it immediately.
- **Smart URL Inspector**: Paste any product URL (Home Depot, Amazon, Lowe's, etc.) and auto-detect product title, make/brand, model number, retailer, and live price using Gemini Search Grounding.
- **Interactive Price History Charts**: Visual sparkline / timeline tracking price trends vs. target price thresholds.
- **Export & Import**: Download `deals.json`, export to CSV spreadsheet, or import watchlists.

---

## 🚀 Quickstart for Git Users

### 1. Clone the repository
```bash
git clone https://github.com/your-username/deal-tracker.git
cd deal-tracker
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Managing Products via `data/deals.json`

You can add or update products directly through the web UI or by editing `data/deals.json`:

```json
[
  {
    "id": "deal-werner-ladder-nxt1a06",
    "title": "Werner 6 ft. Fiberglass Step Ladder (10 ft. Reach, 300 lb. Load Capacity, Type IA)",
    "make": "Werner",
    "model": "NXT1A06",
    "sku": "100662617",
    "url": "https://www.homedepot.com/p/Werner-6-ft-Fiberglass-Step-Ladder-10-ft-Reach-Height-with-300-lb-Load-Capacity-Type-IA-Duty-Rating-NXT1A06/100662617",
    "favoriteWebsites": ["Home Depot", "Lowe's", "Amazon"],
    "targetPrice": 100.00,
    "currentPrice": 119.00,
    "currency": "USD",
    "inStock": true,
    "isTriggered": false,
    "notifyOnDropOnly": true,
    "status": "active"
  }
]
```

To share your updated watchlist with others on Git:
```bash
git add data/deals.json
git commit -m "Add new tracked products and trigger thresholds"
git push origin main
```
