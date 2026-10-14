import React from 'react';
import { X, TrendingDown, Clock, CheckCircle2, AlertCircle, ArrowDown } from 'lucide-react';
import { DealItem } from '../types/deal';

interface PriceHistoryModalProps {
  deal: DealItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({
  deal,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !deal) return null;

  const logs = [...(deal.history || [])].reverse(); // Oldest to newest for plotting

  // Calculate coordinates for SVG sparkline chart
  const prices = logs.map((l) => l.price);
  const target = deal.targetPrice;
  const allValues = [...prices, target];
  const minVal = Math.max(0, Math.min(...allValues) * 0.9);
  const maxVal = Math.max(...allValues) * 1.1;
  const range = maxVal - minVal || 1;

  const chartWidth = 500;
  const chartHeight = 180;
  const padding = 30;

  const points = logs.map((l, idx) => {
    const x = padding + (idx / Math.max(logs.length - 1, 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((l.price - minVal) / range) * (chartHeight - padding * 2);
    return { x, y, price: l.price, timestamp: l.timestamp, retailer: l.retailer };
  });

  const pathD = points.length > 1
    ? points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '')
    : '';

  const targetY = chartHeight - padding - ((target - minVal) / range) * (chartHeight - padding * 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-400">Price Trend & Log History</span>
              {deal.make && (
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300">
                  {deal.make}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-white line-clamp-1">{deal.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current vs Target banner */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-950/60 p-3.5 border border-slate-800">
          <div>
            <span className="text-xs text-slate-400">Current Price</span>
            <div className="text-xl font-bold text-white">
              {deal.currentPrice !== null ? `$${deal.currentPrice.toFixed(2)}` : 'Not checked'}
            </div>
          </div>
          <div>
            <span className="text-xs text-indigo-400">Target Trigger</span>
            <div className="text-xl font-bold text-indigo-400">${deal.targetPrice.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-xs text-slate-400">All-time Lowest</span>
            <div className="text-xl font-bold text-emerald-400">
              {deal.lowestPrice !== null && deal.lowestPrice !== undefined
                ? `$${deal.lowestPrice.toFixed(2)}`
                : `$${deal.targetPrice.toFixed(2)}`}
            </div>
          </div>
        </div>

        {/* SVG Sparkline Chart */}
        <div className="mt-4 rounded-xl bg-slate-950 p-3 border border-slate-800">
          <div className="flex items-center justify-between mb-2 px-2 text-xs">
            <span className="text-slate-400">Price Movement vs Target</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] text-indigo-400">
                <span className="h-0.5 w-3 bg-indigo-400 border-dashed inline-block"></span>
                Target: ${deal.targetPrice.toFixed(2)}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block"></span>
                Checked Price
              </span>
            </div>
          </div>

          {points.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44">
                {/* Grid lines */}
                <line
                  x1={padding}
                  y1={chartHeight - padding}
                  x2={chartWidth - padding}
                  y2={chartHeight - padding}
                  stroke="#334155"
                  strokeWidth="1"
                />

                {/* Target Price line */}
                <line
                  x1={padding}
                  y1={targetY}
                  x2={chartWidth - padding}
                  y2={targetY}
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text
                  x={chartWidth - padding + 5}
                  y={targetY + 4}
                  fill="#818cf8"
                  fontSize="10"
                  textAnchor="start"
                >
                  ${deal.targetPrice.toFixed(0)}
                </text>

                {/* Price history line */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Points */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4.5"
                      fill={p.price <= deal.targetPrice ? '#10b981' : '#38bdf8'}
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                    <text
                      x={p.x}
                      y={p.y - 8}
                      fill="#e2e8f0"
                      fontSize="10"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      ${p.price.toFixed(0)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">
              No historical price checks logged yet. Click "Check Price" to log the first baseline.
            </div>
          )}
        </div>

        {/* Historical Logs List */}
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-slate-300 mb-2">Check Log History</h3>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 divide-y divide-slate-800/80">
            {deal.history && deal.history.length > 0 ? (
              deal.history.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`rounded-full p-1 ${
                        log.price <= deal.targetPrice
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {log.price <= deal.targetPrice ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        ${log.price.toFixed(2)}{' '}
                        <span className="text-[11px] font-normal text-slate-400">
                          at {log.retailer || 'Retailer'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{log.statusMessage}</div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-400">
                    {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">No logs available</div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
