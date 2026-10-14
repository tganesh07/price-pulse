export interface PriceLog {
  id: string;
  timestamp: string;
  price: number;
  retailer?: string;
  sourceUrl?: string;
  inStock?: boolean;
  statusMessage?: string;
}

export interface DealItem {
  id: string;
  title: string;
  make?: string; // Brand/Make e.g. "Werner", "DeWalt", "Sony"
  model?: string; // Model # e.g. "NXT1A06"
  sku?: string;
  url: string; // Target product URL
  favoriteWebsites?: string[]; // e.g. ["Home Depot", "Amazon", "Lowe's"]
  targetPrice: number; // The trigger threshold e.g. 100.00
  currentPrice: number | null; // Latest detected price
  initialPrice?: number | null; // Price when added
  lowestPrice?: number | null; // Lowest seen price
  currency: string; // "USD"
  inStock: boolean;
  isTriggered: boolean; // true if currentPrice <= targetPrice
  notifyOnDropOnly: boolean;
  lastCheckedAt: string | null;
  status: 'active' | 'paused' | 'error' | 'triggered';
  lastError?: string;
  imageUrl?: string;
  category?: string;
  notes?: string;
  history: PriceLog[];
}

export interface CheckResult {
  dealId: string;
  success: boolean;
  previousPrice: number | null;
  currentPrice: number | null;
  targetPrice: number;
  isTriggered: boolean;
  triggeredJustNow: boolean;
  inStock: boolean;
  retailer?: string;
  sourceUrl?: string;
  checkedAt: string;
  summary: string;
  rawDetails?: string;
}

export interface TrackerSettings {
  autoCheckIntervalMinutes: number; // 0, 5, 15, 30, 60
  browserNotificationsEnabled: boolean;
  soundAlertsEnabled: boolean;
  webhookUrl?: string;
  emailAlertsEnabled?: boolean;
  notificationEmail?: string;
}
