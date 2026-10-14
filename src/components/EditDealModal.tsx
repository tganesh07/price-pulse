import React, { useState } from 'react';
import { X, Save, DollarSign, Store, Tag, AlertCircle } from 'lucide-react';
import { DealItem } from '../types/deal';

interface EditDealModalProps {
  deal: DealItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateDeal: (id: string, updates: Partial<DealItem>) => Promise<void>;
}

export const EditDealModal: React.FC<EditDealModalProps> = ({
  deal,
  isOpen,
  onClose,
  onUpdateDeal,
}) => {
  if (!isOpen || !deal) return null;

  const [title, setTitle] = useState(deal.title);
  const [make, setMake] = useState(deal.make || '');
  const [model, setModel] = useState(deal.model || '');
  const [targetPrice, setTargetPrice] = useState(deal.targetPrice.toString());
  const [currentPrice, setCurrentPrice] = useState(deal.currentPrice?.toString() || '');
  const [url, setUrl] = useState(deal.url || '');
  const [status, setStatus] = useState(deal.status);
  const [notes, setNotes] = useState(deal.notes || '');
  const [favoriteWebsites, setFavoriteWebsites] = useState(
    deal.favoriteWebsites?.join(', ') || 'Home Depot'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTarget = parseFloat(targetPrice);
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setError('Target price must be a valid positive number.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const parsedCurrent = currentPrice ? parseFloat(currentPrice) : null;
      const sites = favoriteWebsites
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await onUpdateDeal(deal.id, {
        title: title.trim(),
        make: make.trim(),
        model: model.trim(),
        targetPrice: parsedTarget,
        currentPrice: parsedCurrent,
        url: url.trim(),
        status: status as any,
        notes: notes.trim(),
        favoriteWebsites: sites.length > 0 ? sites : ['Home Depot'],
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update deal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-base font-bold text-white">Edit Deal Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-400 border border-rose-500/20">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-slate-950 py-2 px-3 text-xs text-white border border-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Brand / Make</label>
              <input
                type="text"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="w-full rounded-lg bg-slate-950 py-2 px-3 text-xs text-white border border-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Model #</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg bg-slate-950 py-2 px-3 text-xs text-white border border-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-950/60 p-3.5 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-indigo-400 mb-1">
                Target Trigger Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="w-full rounded-lg bg-slate-900 py-2 px-3 text-sm font-bold text-white border border-indigo-500/40 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Current Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                className="w-full rounded-lg bg-slate-900 py-2 px-3 text-xs text-white border border-slate-700 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Product URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg bg-slate-950 py-2 px-3 text-xs text-white border border-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Favorite Retailers (comma separated)
            </label>
            <input
              type="text"
              value={favoriteWebsites}
              onChange={(e) => setFavoriteWebsites(e.target.value)}
              className="w-full rounded-lg bg-slate-950 py-2 px-3 text-xs text-white border border-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tracking Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-lg bg-slate-950 py-2 px-3 text-xs text-white border border-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="active">Active Monitoring</option>
                <option value="paused">Paused</option>
                <option value="triggered">Triggered</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg bg-slate-950 py-2 px-3 text-xs text-white border border-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
