import React from 'react';
import { 
  CheckCircle2, 
  Flame, 
  TrendingDown, 
  Cpu, 
  ArrowUpRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { DealItem, TrackerSettings } from '../types/deal';

interface StatsOverviewProps {
  deals: DealItem[];
  settings: TrackerSettings;
  onFilterTriggered: () => void;
  isTriggeredFilterActive: boolean;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  deals,
  settings,
  onFilterTriggered,
  isTriggeredFilterActive,
}) => {
  const total = deals.length;
  const triggered = deals.filter((d) => d.isTriggered);
  const triggeredCount = triggered.length;
  const activeCount = deals.filter((d) => d.status === 'active' || d.status === 'triggered').length;

  // Calculate potential savings for triggered items
  const totalSavings = triggered.reduce((acc, item) => {
    if (item.targetPrice && item.currentPrice && item.currentPrice <= item.targetPrice) {
      return acc + (item.targetPrice - item.currentPrice);
    }
    return acc;
  }, 0);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {/* 1. Monitored Products */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Monitored Items</span>
          <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">{total}</span>
          <span className="text-xs text-slate-400">({activeCount} active)</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">Tracked in data/deals.json</p>
      </div>

      {/* 2. Triggered Deals (Clickable filter) */}
      <div 
        onClick={onFilterTriggered}
        className={`group cursor-pointer rounded-xl border p-4 shadow-sm backdrop-blur-sm transition ${
          triggeredCount > 0 
            ? isTriggeredFilterActive
              ? 'border-emerald-500 bg-emerald-950/40 ring-2 ring-emerald-500/30'
              : 'border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-500/60 hover:bg-emerald-950/30'
            : 'border-slate-800 bg-slate-900/60'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 group-hover:text-emerald-300 transition">
            Triggered Thresholds
          </span>
          <div className={`rounded-lg p-2 ${triggeredCount > 0 ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
            <Flame className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${triggeredCount > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
            {triggeredCount}
          </span>
          {triggeredCount > 0 && (
            <span className="inline-flex items-center text-xs font-semibold text-emerald-400">
              Ready to buy <ArrowUpRight className="h-3 w-3" />
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {triggeredCount > 0 ? 'Click to filter target hits' : 'Watching for drops'}
        </p>
      </div>

      {/* 3. Realized Savings */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Trigger Savings</span>
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
            <TrendingDown className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">
            ${totalSavings > 0 ? totalSavings.toFixed(2) : '0.00'}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">Savings below target threshold</p>
      </div>

      {/* 4. Automated Monitor Status */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Live Engine</span>
          <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
            <Cpu className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-bold text-white">
            {settings.autoCheckIntervalMinutes > 0 ? `Every ${settings.autoCheckIntervalMinutes}m` : 'Manual Run'}
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
          <Sparkles className="h-3 w-3 text-indigo-400" />
          <span>Gemini Search Grounded</span>
        </p>
      </div>
    </div>
  );
};
