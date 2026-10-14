import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Filter, 
  Flame, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  FolderGit2, 
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
  Store,
  Layers,
  ShoppingBag
} from 'lucide-react';
import { DealItem, TrackerSettings, CheckResult } from './types/deal';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { DealCard } from './components/DealCard';
import { AddDealModal } from './components/AddDealModal';
import { EditDealModal } from './components/EditDealModal';
import { PriceHistoryModal } from './components/PriceHistoryModal';
import { GitFileManagerModal } from './components/GitFileManagerModal';
import { SettingsModal } from './components/SettingsModal';
import { NotificationToast } from './components/NotificationToast';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendPushAlert 
} from './utils/notifications';
import { playAlertChime } from './utils/sound';

export default function App() {
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [settings, setSettings] = useState<TrackerSettings>({
    autoCheckIntervalMinutes: 15,
    browserNotificationsEnabled: true,
    soundAlertsEnabled: true,
    webhookUrl: '',
    emailAlertsEnabled: false,
    notificationEmail: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'triggered' | 'active' | 'paused'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'difference' | 'lowest' | 'highest' | 'recent' | 'name'>('difference');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealItem | null>(null);
  const [historyDeal, setHistoryDeal] = useState<DealItem | null>(null);
  const [isGitOpen, setIsGitOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Notification & Toasts
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [activeToast, setActiveToast] = useState<{ deal: DealItem | null; message: string } | null>(null);

  // Status & Countdown
  const [nextCheckSeconds, setNextCheckSeconds] = useState<number | null>(null);
  const nextTimestampRef = useRef<number | null>(null);

  // Initialize
  useEffect(() => {
    setNotificationPermission(getNotificationPermission());
    fetchInitialData();

    // Polling status countdown
    const statusTimer = setInterval(fetchStatus, 10000);
    // Countdown tick
    const tickTimer = setInterval(() => {
      if (nextTimestampRef.current) {
        const remaining = Math.max(0, Math.floor((nextTimestampRef.current - Date.now()) / 1000));
        setNextCheckSeconds(remaining);
      }
    }, 1000);

    return () => {
      clearInterval(statusTimer);
      clearInterval(tickTimer);
    };
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadDeals(), loadSettings(), fetchStatus()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeals = async () => {
    try {
      const res = await fetch('/api/deals');
      if (res.ok) {
        const data = await res.json();
        setDeals(data);
      }
    } catch (err) {
      console.error('Failed to load deals:', err);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        if (data.nextScheduledCheckTimestamp) {
          nextTimestampRef.current = data.nextScheduledCheckTimestamp;
          const remaining = Math.max(0, Math.floor((data.nextScheduledCheckTimestamp - Date.now()) / 1000));
          setNextCheckSeconds(remaining);
        } else {
          nextTimestampRef.current = null;
          setNextCheckSeconds(null);
        }
      }
    } catch (err) {
      // ignore status polling errors
    }
  };

  const handleRequestNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
  };

  const handleAddDeal = async (dealData: Partial<DealItem>) => {
    const res = await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dealData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add deal');
    }
    const created: DealItem = await res.json();
    setDeals((prev) => [created, ...prev]);

    // Check price immediately for the newly added item
    handleCheckPrice(created.id);
  };

  const handleUpdateDeal = async (id: string, updates: Partial<DealItem>) => {
    const res = await fetch(`/api/deals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update deal');
    }
    const updated: DealItem = await res.json();
    setDeals((prev) => prev.map((d) => (d.id === id ? updated : d)));
  };

  const handleDeleteDeal = async (id: string) => {
    if (!confirm('Are you sure you want to stop tracking this item?')) return;
    try {
      const res = await fetch(`/api/deals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeals((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleCheckPrice = async (id: string) => {
    try {
      const res = await fetch(`/api/check-price/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.deal) {
        setDeals((prev) => prev.map((d) => (d.id === id ? data.deal : d)));
      }

      if (data.result?.isTriggered) {
        // Trigger push alert
        sendPushAlert(data.deal, {
          sound: settings.soundAlertsEnabled,
        });

        // Trigger in-app toast
        setActiveToast({
          deal: data.deal,
          message: `Target met! Current price is $${data.result.currentPrice?.toFixed(2)} (Target: $${data.result.targetPrice.toFixed(2)})`,
        });
      }
    } catch (err) {
      console.error(`Check price failed for ${id}:`, err);
    }
  };

  const handleCheckAll = async () => {
    setIsCheckingAll(true);
    try {
      const res = await fetch('/api/check-all', { method: 'POST' });
      const data = await res.json();
      if (data.deals) {
        setDeals(data.deals);
      }

      // Check if any triggered
      const triggeredResults: CheckResult[] = (data.results || []).filter((r: CheckResult) => r.isTriggered);
      if (triggeredResults.length > 0) {
        if (settings.soundAlertsEnabled) {
          playAlertChime();
        }
        const first = data.deals?.find((d: DealItem) => d.id === triggeredResults[0].dealId);
        if (first) {
          sendPushAlert(first, {
            sound: false,
            customBody: `${triggeredResults.length} product(s) hit their trigger price! E.g. ${first.title} at $${first.currentPrice}`,
          });
          setActiveToast({
            deal: first,
            message: `${triggeredResults.length} deal(s) hit target thresholds! Check your deals list.`,
          });
        }
      }
      fetchStatus();
    } catch (err) {
      console.error('Batch check failed:', err);
    } finally {
      setIsCheckingAll(false);
    }
  };

  const handleTestNotification = (deal: DealItem) => {
    // Simulate drop below target threshold
    const simulatedPrice = Number((deal.targetPrice * 0.95).toFixed(2));
    const simulatedDeal: DealItem = {
      ...deal,
      currentPrice: simulatedPrice,
      isTriggered: true,
      status: 'triggered',
    };

    sendPushAlert(simulatedDeal, {
      sound: settings.soundAlertsEnabled,
      customBody: `🔥 TEST ALERT: ${deal.make || ''} ${deal.model || deal.title.slice(0, 30)} dropped to $${simulatedPrice}! Target was $${deal.targetPrice}.`,
    });

    setActiveToast({
      deal: simulatedDeal,
      message: `Test Alert Triggered! Simulated drop to $${simulatedPrice} (Below $${deal.targetPrice} target).`,
    });
  };

  const handleSaveSettings = async (newSettings: Partial<TrackerSettings>) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    if (res.ok) {
      const updated = await res.json();
      setSettings(updated);
      fetchStatus();
    }
  };

  // Filter & Search Logic
  const categories = Array.from(new Set(deals.map((d) => d.category).filter(Boolean))) as string[];

  const filteredDeals = deals.filter((deal) => {
    // Search match
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchTitle = deal.title?.toLowerCase().includes(q);
      const matchMake = deal.make?.toLowerCase().includes(q);
      const matchModel = deal.model?.toLowerCase().includes(q);
      const matchSku = deal.sku?.toLowerCase().includes(q);
      const matchRetailer = deal.favoriteWebsites?.some((w) => w.toLowerCase().includes(q));
      if (!matchTitle && !matchMake && !matchModel && !matchSku && !matchRetailer) {
        return false;
      }
    }

    // Status filter
    if (statusFilter === 'triggered' && !deal.isTriggered) return false;
    if (statusFilter === 'active' && deal.status !== 'active') return false;
    if (statusFilter === 'paused' && deal.status !== 'paused') return false;

    // Category filter
    if (categoryFilter !== 'all' && deal.category !== categoryFilter) return false;

    return true;
  });

  // Sort logic
  const sortedDeals = [...filteredDeals].sort((a, b) => {
    if (sortBy === 'difference') {
      // Prioritize triggered first, then by closest to target
      if (a.isTriggered && !b.isTriggered) return -1;
      if (!a.isTriggered && b.isTriggered) return 1;
      const diffA = a.currentPrice !== null ? a.currentPrice - a.targetPrice : 9999;
      const diffB = b.currentPrice !== null ? b.currentPrice - b.targetPrice : 9999;
      return diffA - diffB;
    }
    if (sortBy === 'lowest') {
      return (a.currentPrice || 9999) - (b.currentPrice || 9999);
    }
    if (sortBy === 'highest') {
      return (b.currentPrice || 0) - (a.currentPrice || 0);
    }
    if (sortBy === 'name') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'recent') {
      return (
        new Date(b.lastCheckedAt || 0).getTime() - new Date(a.lastCheckedAt || 0).getTime()
      );
    }
    return 0;
  });

  const triggeredCount = deals.filter((d) => d.isTriggered).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        onOpenAddModal={() => setIsAddOpen(true)}
        onOpenGitModal={() => setIsGitOpen(true)}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        onCheckAll={handleCheckAll}
        isCheckingAll={isCheckingAll}
        totalDeals={deals.length}
        triggeredCount={triggeredCount}
        notificationPermission={notificationPermission}
        onRequestNotifications={handleRequestNotifications}
        settings={settings}
        nextCheckSeconds={nextCheckSeconds}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner with Highlighted Feature for User's Example */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 p-5 sm:p-6 shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Target Price Monitor Active
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Never Overpay. Instant Push Alerts on Price Drops.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Add any product link or model from Home Depot, Amazon, Lowe's, or favorite stores with your target price. PricePulse checks live pricing in the background and sends push notifications the moment thresholds are met. All deals sync directly to <code className="text-emerald-400 font-mono">data/deals.json</code> for easy Git sharing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsAddOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Track New Product</span>
              </button>
              <button
                onClick={() => setIsGitOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition"
              >
                <FolderGit2 className="h-4 w-4 text-emerald-400" />
                <span>View data/deals.json</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <StatsOverview
          deals={deals}
          settings={settings}
          onFilterTriggered={() => setStatusFilter(statusFilter === 'triggered' ? 'all' : 'triggered')}
          isTriggeredFilterActive={statusFilter === 'triggered'}
        />

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 shadow-sm backdrop-blur-sm">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by product, make, model (#NXT1A06), SKU, or retailer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status filters */}
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  statusFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({deals.length})
              </button>
              <button
                onClick={() => setStatusFilter('triggered')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition ${
                  statusFilter === 'triggered'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="h-3 w-3 text-amber-300" />
                Triggered ({triggeredCount})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  statusFilter === 'active'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Active
              </button>
            </div>

            {/* Category filter */}
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg bg-slate-950 py-1.5 px-2.5 text-xs text-slate-300 border border-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg bg-slate-950 py-1.5 px-2.5 text-xs text-slate-300 border border-slate-800 focus:border-indigo-500 focus:outline-none"
            >
              <option value="difference">Sort: Trigger Status & Distance</option>
              <option value="lowest">Sort: Lowest Price</option>
              <option value="highest">Sort: Highest Price</option>
              <option value="recent">Sort: Recently Checked</option>
              <option value="name">Sort: Product Title</option>
            </select>
          </div>
        </div>

        {/* Deals Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-72 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 animate-pulse"
              />
            ))}
          </div>
        ) : sortedDeals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onCheckPrice={handleCheckPrice}
                onTestNotification={handleTestNotification}
                onOpenHistory={(d) => setHistoryDeal(d)}
                onEdit={(d) => setEditingDeal(d)}
                onDelete={handleDeleteDeal}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-white">No products found</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'Start tracking products like the Werner 6-ft Step Ladder by clicking the button below.'}
            </p>
            <div className="mt-5">
              <button
                onClick={() => setIsAddOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Track Product</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AddDealModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddDeal={handleAddDeal}
      />

      <EditDealModal
        isOpen={!!editingDeal}
        deal={editingDeal}
        onClose={() => setEditingDeal(null)}
        onUpdateDeal={handleUpdateDeal}
      />

      <PriceHistoryModal
        isOpen={!!historyDeal}
        deal={historyDeal}
        onClose={() => setHistoryDeal(null)}
      />

      <GitFileManagerModal
        isOpen={isGitOpen}
        onClose={() => setIsGitOpen(false)}
        onReloadDeals={loadDeals}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        sampleDeal={deals[0]}
      />

      {/* In-app Toast Banner */}
      {activeToast && (
        <NotificationToast
          deal={activeToast.deal}
          message={activeToast.message}
          onClose={() => setActiveToast(null)}
        />
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-800/80 bg-slate-950/80 py-6 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">PricePulse Deal Tracker</span>
            <span>•</span>
            <span>Powered by Gemini Search Grounding & Web Push</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Watchlist: <code className="text-emerald-400">data/deals.json</code></span>
            <span>•</span>
            <button
              onClick={() => setIsGitOpen(true)}
              className="text-indigo-400 hover:text-indigo-300"
            >
              Git Instructions
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
