import React from 'react';
import { Flame, X, ExternalLink } from 'lucide-react';
import { DealItem } from '../types/deal';

interface NotificationToastProps {
  deal: DealItem | null;
  message?: string;
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  deal,
  message,
  onClose,
}) => {
  if (!deal && !message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border border-emerald-500/50 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md animate-bounce-short">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-500/20 p-2 text-emerald-400">
          <Flame className="h-5 w-5 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Deal Trigger Alert!
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs font-semibold text-white line-clamp-1">
            {deal?.title || 'Price Drop Alert'}
          </p>
          <p className="mt-0.5 text-xs text-slate-300">
            {message || `Current: $${deal?.currentPrice?.toFixed(2)} ≤ Target: $${deal?.targetPrice.toFixed(2)}`}
          </p>
          {deal?.url && (
            <a
              href={deal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
            >
              <span>View deal at store</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
