import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Link as LinkIcon, 
  DollarSign, 
  Store, 
  Tag, 
  AlertCircle,
  Plus,
  Loader2
} from 'lucide-react';
import { DealItem } from '../types/deal';

interface AddDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDeal: (dealData: Partial<DealItem>) => Promise<void>;
}

const POPULAR_RETAILERS = [
  'Home Depot',
  "Lowe's",
  'Amazon',
  'Walmart',
  'Best Buy',
  'Target',
  'Harbor Freight',
  'Ace Hardware',
];

export const AddDealModal: React.FC<AddDealModalProps> = ({
  isOpen,
  onClose,
  onAddDeal,
}) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [sku, setSku] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [category, setCategory] = useState('Tools & Hardware');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedWebsites, setSelectedWebsites] = useState<string[]>(['Home Depot']);
  const [customWebsite, setCustomWebsite] = useState('');

  const [isInspecting, setIsInspecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInspectUrl = async () => {
    if (!url.trim()) {
      setError('Please enter a product URL or title first.');
      return;
    }
    setError(null);
    setIsInspecting(true);

    try {
      const res = await fetch('/api/inspect-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to inspect URL');
      }

      if (data.title) setTitle(data.title);
      if (data.make) setMake(data.make);
      if (data.model) setModel(data.model);
      if (data.sku) setSku(data.sku);
      if (data.currentPrice) setCurrentPrice(data.currentPrice.toString());
      if (data.category) setCategory(data.category);
      if (data.imageUrl) setImageUrl(data.imageUrl);
      if (Array.isArray(data.favoriteWebsites) && data.favoriteWebsites.length > 0) {
        setSelectedWebsites(data.favoriteWebsites);
      } else if (data.retailer) {
        setSelectedWebsites([data.retailer]);
      }
    } catch (err: any) {
      setError(err.message || 'Auto-detect failed. You can still fill details manually.');
    } finally {
      setIsInspecting(false);
    }
  };

  const toggleRetailer = (retailer: string) => {
    if (selectedWebsites.includes(retailer)) {
      setSelectedWebsites(selectedWebsites.filter((r) => r !== retailer));
    } else {
      setSelectedWebsites([...selectedWebsites, retailer]);
    }
  };

  const handleAddCustomRetailer = () => {
    if (!customWebsite.trim()) return;
    if (!selectedWebsites.includes(customWebsite.trim())) {
      setSelectedWebsites([...selectedWebsites, customWebsite.trim()]);
    }
    setCustomWebsite('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Product title is required.');
      return;
    }
    const parsedTarget = parseFloat(targetPrice);
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setError('Please provide a valid target price threshold greater than 0.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onAddDeal({
        title: title.trim(),
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        sku: sku.trim() || undefined,
        url: url.trim(),
        targetPrice: parsedTarget,
        currentPrice: currentPrice ? parseFloat(currentPrice) : null,
        favoriteWebsites: selectedWebsites.length > 0 ? selectedWebsites : ['Home Depot'],
        category: category.trim() || 'General',
        imageUrl: imageUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // Reset form
      setUrl('');
      setTitle('');
      setMake('');
      setModel('');
      setSku('');
      setTargetPrice('');
      setCurrentPrice('');
      setImageUrl('');
      setNotes('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add deal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Track New Product & Set Target Price</h2>
              <p className="text-xs text-slate-400">
                Provide a product link or name with make, model, and favorite stores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
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
          {/* Smart URL Box */}
          <div className="rounded-xl bg-slate-950/60 p-3.5 border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Product URL (Home Depot, Amazon, Lowe's, etc.)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="url"
                  placeholder="https://www.homedepot.com/p/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleInspectUrl}
                disabled={isInspecting || !url.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50"
              >
                {isInspecting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Detecting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Auto-Detect</span>
                  </>
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Paste a link to auto-fill title, brand/make, model, and current price via Gemini Google Search
            </p>
          </div>

          {/* Product Title */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Product Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Werner 6 ft. Fiberglass Step Ladder"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-slate-950 py-2 px-3 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Make / Brand & Model & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Make / Brand
              </label>
              <input
                type="text"
                placeholder="e.g. Werner, DEWALT"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="w-full rounded-lg bg-slate-950 py-2 px-3 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Model Number
              </label>
              <input
                type="text"
                placeholder="e.g. NXT1A06"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg bg-slate-950 py-2 px-3 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                SKU / Store ID
              </label>
              <input
                type="text"
                placeholder="e.g. 100662617"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full rounded-lg bg-slate-950 py-2 px-3 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Target Price & Current Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-slate-950/60 p-3.5 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-indigo-400 mb-1">
                Target Trigger Price ($) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-indigo-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="100.00"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 py-2 pl-7 pr-3 text-sm font-bold text-white placeholder-slate-500 border border-indigo-500/40 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                You will only receive push notifications when price drops &le; this amount!
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Current Known Price ($) (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="119.00"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 py-2 pl-7 pr-3 text-xs text-white placeholder-slate-500 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Baseline starting price if known
              </p>
            </div>
          </div>

          {/* Favorite Retailers / Websites */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-indigo-400" />
              <span>Favorite Websites to Check Price:</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {POPULAR_RETAILERS.map((retailer) => {
                const isSelected = selectedWebsites.includes(retailer);
                return (
                  <button
                    key={retailer}
                    type="button"
                    onClick={() => toggleRetailer(retailer)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {retailer}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add other favorite retailer..."
                value={customWebsite}
                onChange={(e) => setCustomWebsite(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomRetailer();
                  }
                }}
                className="flex-1 rounded-lg bg-slate-950 py-1.5 px-3 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomRetailer}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Add
              </button>
            </div>
          </div>

          {/* Category & Image URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. Tools & Hardware, Ladders"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg bg-slate-950 py-2 px-3 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Image URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full rounded-lg bg-slate-950 py-2 px-3 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Personal Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Wait for seasonal promotion or clearance"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg bg-slate-950 py-2 px-3 text-xs text-white placeholder-slate-500 border border-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Start Tracking</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
