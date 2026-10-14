import React, { useState } from 'react';
import { 
  ExternalLink, 
  RefreshCw, 
  History, 
  Flame, 
  AlertCircle, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  BellRing,
  ShoppingBag,
  TrendingDown,
  Clock,
  Store,
  Tag
} from 'lucide-react';
import { DealItem } from '../types/deal';

interface DealCardProps {
  deal: DealItem;
  onCheckPrice: (id: string) => Promise<void>;
  onTestNotification: (deal: DealItem) => void;
  onOpenHistory: (deal: DealItem) => void;
  onEdit: (deal: DealItem) => void;
  onDelete: (id: string) => void;
}

export const DealCard: React.FC<DealCardProps> = ({
  deal,
  onCheckPrice,
  onTestNotification,
  onOpenHistory,
  onEdit,
  onDelete,
}) => {
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = async () => {
    try {
      setIsChecking(true);
      await onCheckPrice(deal.id);
    } finally {
      setIsChecking(false);
    }
  };

  const isTriggered = deal.currentPrice !== null && deal.currentPrice <= deal.targetPrice;
  const priceDiff = deal.currentPrice !== null ? deal.currentPrice - deal.targetPrice : null;

  const formatRelativeTime = (isoString: string | null) => {
    if (!isoString) return 'Never checked';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 ${
        isTriggered
          ? 'border-emerald-500/70 bg-gradient-to-b from-slate-900 via-emerald-950/20 to-slate-900 shadow-lg shadow-emerald-500/10'
          : 'border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900'
      }`}
    >
      {/* Top Banner if Triggered */}
      {isTriggered && (
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm">
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 animate-bounce" />
            <span>TARGET PRICE MET! ${deal.currentPrice?.toFixed(2)} &le; ${deal.targetPrice.toFixed(2)}</span>
          </div>
          <span className="text-[11px] opacity-90">Push notification triggered</span>
        </div>
      )}

      <div className="p-5">
        {/* Brand, Model & Status Pill */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {deal.make && (
              <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                {deal.make}
              </span>
            )}
            {deal.model && (
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-mono font-medium text-slate-300 border border-slate-700">
                #{deal.model}
              </span>
            )}
            {deal.category && (
              <span className="rounded-md bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-400">
                {deal.category}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {deal.status === 'paused' ? (
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                Paused
              </span>
            ) : isTriggered ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3" />
                Triggered
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-slate-800/90 px-2.5 py-0.5 text-xs font-medium text-slate-300 border border-slate-700">
                <Clock className="h-3 w-3 text-indigo-400" />
                Monitoring
              </span>
            )}
          </div>
        </div>

        {/* Product Title & Thumbnail */}
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-800 border border-slate-700/80 p-1 flex items-center justify-center">
            {deal.imageUrl ? (
              <img
                src={deal.imageUrl}
                alt={deal.title}
                className="h-full w-full object-contain"
                onError={(e) => {
                  // Fallback to icon if broken image link
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <ShoppingBag className="h-8 w-8 text-slate-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 hover:text-indigo-300 transition">
              {deal.title}
            </h3>

            {/* Favorite Websites / Retailers */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Store className="h-3 w-3" /> Retailers:
              </span>
              {(deal.favoriteWebsites || ['Home Depot']).map((site) => (
                <span
                  key={site}
                  className="rounded bg-slate-800/90 px-1.5 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700/60"
                >
                  {site}
                </span>
              ))}
            </div>

            {deal.notes && (
              <p className="mt-1 text-xs text-slate-400 italic line-clamp-1">
                "{deal.notes}"
              </p>
            )}
          </div>
        </div>

        {/* Pricing Comparison Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-950/60 p-3.5 border border-slate-800/80">
          <div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span>Current Price</span>
              {deal.inStock === false && (
                <span className="text-[10px] text-rose-400 font-medium">(Out of stock)</span>
              )}
            </div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-bold tracking-tight ${
                  isTriggered ? 'text-emerald-400' : 'text-white'
                }`}
              >
                {deal.currentPrice !== null ? `$${deal.currentPrice.toFixed(2)}` : 'Not checked'}
              </span>
              {deal.currency && <span className="text-xs text-slate-400">{deal.currency}</span>}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">Target Trigger Price</div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-indigo-400">
                ${deal.targetPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Status / Delta Note */}
        <div className="mt-2.5 flex items-center justify-between text-xs">
          {priceDiff !== null ? (
            priceDiff <= 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <TrendingDown className="h-3.5 w-3.5" />
                ${Math.abs(priceDiff).toFixed(2)} below trigger threshold!
              </span>
            ) : (
              <span className="text-slate-400">
                Needs <span className="text-amber-400 font-semibold">${priceDiff.toFixed(2)}</span> drop to trigger
              </span>
            )
          ) : (
            <span className="text-slate-400">Target price: ${deal.targetPrice.toFixed(2)}</span>
          )}

          <span className="text-slate-400 text-[11px]">
            Checked: {formatRelativeTime(deal.lastCheckedAt)}
          </span>
        </div>

        {deal.lastError && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-rose-500/10 p-2 text-xs text-rose-400 border border-rose-500/20">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{deal.lastError}</span>
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/40 px-4 py-2.5">
        <div className="flex items-center gap-1">
          {/* Live Check Button */}
          <button
            onClick={handleCheck}
            disabled={isChecking}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/20 px-2.5 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30 hover:text-white transition disabled:opacity-50"
            title="Check live price with Gemini search"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Check Price'}</span>
          </button>

          {/* Test Alert Simulator Button */}
          <button
            onClick={() => onTestNotification(deal)}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
            title="Simulate price meeting target threshold and trigger push alert"
          >
            <BellRing className="h-3.5 w-3.5 text-amber-400" />
            <span>Test Alert</span>
          </button>

          {/* History Chart Button */}
          <button
            onClick={() => onOpenHistory(deal)}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-800/80 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
            title="View price history logs & chart"
          >
            <History className="h-3.5 w-3.5 text-purple-400" />
            <span className="hidden sm:inline">History ({deal.history?.length || 0})</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {deal.url && (
            <a
              href={deal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-indigo-400 transition"
              title="Open product retailer page"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}

          <button
            onClick={() => onEdit(deal)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title="Edit deal settings"
          >
            <Edit3 className="h-4 w-4" />
          </button>

          <button
            onClick={() => onDelete(deal.id)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition"
            title="Delete product monitor"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
