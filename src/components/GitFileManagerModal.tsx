import React, { useState, useEffect } from 'react';
import { 
  X, 
  FolderGit2, 
  Download, 
  Upload, 
  Save, 
  FileCode, 
  FileSpreadsheet, 
  Check, 
  AlertCircle,
  Copy,
  Terminal,
  BookOpen
} from 'lucide-react';

interface GitFileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReloadDeals: () => Promise<void>;
}

export const GitFileManagerModal: React.FC<GitFileManagerModalProps> = ({
  isOpen,
  onClose,
  onReloadDeals,
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'gitGuide'>('editor');
  const [jsonContent, setJsonContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRawJson();
    }
  }, [isOpen]);

  const fetchRawJson = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/deals/raw');
      if (!res.ok) throw new Error('Failed to load deals.json from server');
      const text = await res.text();
      // Format prettily
      const parsed = JSON.parse(text);
      setJsonContent(JSON.stringify(parsed, null, 2));
    } catch (err: any) {
      setError(err.message || 'Error loading file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveJson = async () => {
    setError(null);
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Validate JSON syntax locally first
      JSON.parse(jsonContent);

      const res = await fetch('/api/deals/raw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: jsonContent }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save deals.json');
      }

      setSaveSuccess(true);
      await onReloadDeals();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Invalid JSON syntax. Please check brackets and commas.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deals.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    window.open('/api/deals/export/csv', '_blank');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // Verify it is JSON
        const parsed = JSON.parse(text);
        setJsonContent(JSON.stringify(parsed, null, 2));
        setError(null);
      } catch (err) {
        setError('Uploaded file is not valid JSON.');
      }
    };
    reader.readAsText(file);
  };

  const copyGitCommands = () => {
    const cmds = `git add data/deals.json\ngit commit -m "Update tracked deals and trigger thresholds"\ngit push origin main`;
    navigator.clipboard.writeText(cmds);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400">
              <FolderGit2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Git Repository & File Store</h2>
              <p className="text-xs text-slate-400">
                Tracked products are stored in <code className="text-emerald-400 font-mono">data/deals.json</code> ready to commit to Git
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

        {/* Tab switch */}
        <div className="mt-4 flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('editor')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'editor'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <FileCode className="h-3.5 w-3.5 inline mr-1.5" />
              data/deals.json Editor
            </button>
            <button
              onClick={() => setActiveTab('gitGuide')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'gitGuide'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 inline mr-1.5" />
              Git Publishing & Share Guide
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title="Download deals.json file"
            >
              <Download className="h-3 w-3" />
              <span>deals.json</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title="Export as CSV spreadsheet"
            >
              <FileSpreadsheet className="h-3 w-3" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-400 border border-rose-500/20">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-400 border border-emerald-500/20">
            <Check className="h-4 w-4 flex-shrink-0" />
            <span>deals.json updated successfully on server file system!</span>
          </div>
        )}

        {activeTab === 'editor' ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Directly edit the raw JSON watchlist array below:</span>
              <label className="cursor-pointer inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300">
                <Upload className="h-3 w-3" />
                <span>Upload JSON file</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="relative">
              <textarea
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                disabled={isLoading}
                rows={16}
                className="w-full font-mono text-xs rounded-xl bg-slate-950 p-4 text-emerald-300 border border-slate-800 focus:border-indigo-500 focus:outline-none leading-relaxed"
                spellCheck={false}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] text-slate-400">
                Changes saved here persist directly to <span className="font-mono text-slate-300">data/deals.json</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={fetchRawJson}
                  className="rounded-lg bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  Reset / Reload
                </button>
                <button
                  type="button"
                  onClick={handleSaveJson}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Saving...' : 'Save to deals.json'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Git Guide Tab */
          <div className="mt-4 space-y-4 text-xs">
            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Terminal className="h-4 w-4 text-indigo-400" />
                How Git Sharing Works for Any User
              </h3>
              <p className="text-slate-300 leading-relaxed">
                When you publish this project to GitHub, anyone who clones it can immediately run it and track products by editing <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded font-mono">data/deals.json</code> or by using the browser UI.
              </p>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white">Step 1: Commit your deals to Git</span>
                <button
                  onClick={copyGitCommands}
                  className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <pre className="font-mono bg-slate-900 p-3 rounded-lg text-emerald-300 overflow-x-auto text-[11px] leading-relaxed">
                git add data/deals.json{'\n'}
                git commit -m "Update tracked deals and trigger thresholds"{'\n'}
                git push origin main
              </pre>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-2">
              <span className="font-semibold text-white">Step 2: How others clone and run this app</span>
              <pre className="font-mono bg-slate-900 p-3 rounded-lg text-indigo-300 overflow-x-auto text-[11px] leading-relaxed">
                git clone https://github.com/your-username/deal-tracker.git{'\n'}
                cd deal-tracker{'\n'}
                npm install{'\n'}
                npm run dev
              </pre>
              <p className="text-slate-400 text-[11px]">
                The app will start on port 3000, read all products from <code className="text-slate-300">data/deals.json</code>, and automatically begin price checks and push notifications!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
