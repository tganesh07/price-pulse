import React from 'react';
import { 
  Bell, 
  BellRing, 
  RefreshCw, 
  Plus, 
  FolderGit2, 
  Settings, 
  Flame, 
  Activity,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { TrackerSettings } from '../types/deal';

interface HeaderProps {
  onOpenAddModal: () => void;
  onOpenGitModal: () => void;
  onOpenSettingsModal: () => void;
  onCheckAll: () => void;
  isCheckingAll: boolean;
  totalDeals: number;
  triggeredCount: number;
  notificationPermission: NotificationPermission;
  onRequestNotifications: () => void;
  settings: TrackerSettings;
  nextCheckSeconds: number | null;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddModal,
  onOpenGitModal,
  onOpenSettingsModal,
  onCheckAll,
  isCheckingAll,
  totalDeals,
  triggeredCount,
  notificationPermission,
  onRequestNotifications,
  settings,
  nextCheckSeconds,
}) => {
  const formatCountdown = (seconds: number | null) => {
    if (seconds === null || seconds <= 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-18 items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 shadow-lg shadow-indigo-500/20">
              <Activity className="h-6 w-6 text-white" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">PricePulse</h1>
                <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                  Deal Tracker
                </span>
              </div>
              <p className="text-xs text-slate-400">Automated price drop monitor & push alerts</p>
            </div>
          </div>

          {/* Center Info Badges (hidden on small screens) */}
          <div className="hidden lg:flex items-center gap-3">
            {triggeredCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20 animate-pulse">
                <Flame className="h-3.5 w-3.5 text-emerald-400" />
                <span>{triggeredCount} Target Price{triggeredCount > 1 ? 's' : ''} Met!</span>
              </div>
            )}

            {settings.autoCheckIntervalMinutes > 0 ? (
              <div className="flex items-center gap-1.5 rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-300 border border-slate-700">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                <span>
                  Next check: {formatCountdown(nextCheckSeconds) || `${settings.autoCheckIntervalMinutes}m`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-400 border border-slate-700">
                <span>Auto-check paused (manual)</span>
              </div>
            )}

            {/* Notification Permission Quick Status */}
            {notificationPermission === 'granted' ? (
              <div className="flex items-center gap-1 rounded-full bg-indigo-950/60 px-2.5 py-1 text-xs text-indigo-300 border border-indigo-800/40" title="Push notifications active">
                <BellRing className="h-3 w-3 text-indigo-400" />
                <span>Push Active</span>
              </div>
            ) : (
              <button
                onClick={onRequestNotifications}
                className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition"
              >
                <Bell className="h-3 w-3" />
                <span>Enable Push Alerts</span>
              </button>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Run All Checks */}
            <button
              onClick={onCheckAll}
              disabled={isCheckingAll || totalDeals === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-200 border border-slate-700 hover:bg-slate-700/80 hover:text-white transition disabled:opacity-50"
              title="Run price check across all deals right now"
            >
              <RefreshCw className={`h-4 w-4 text-indigo-400 ${isCheckingAll ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isCheckingAll ? 'Checking...' : 'Check All'}</span>
            </button>

            {/* Git & File Manager */}
            <button
              onClick={onOpenGitModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-2 text-xs sm:text-sm font-medium text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition"
              title="Git & deals.json file manager"
            >
              <FolderGit2 className="h-4 w-4 text-emerald-400" />
              <span className="hidden sm:inline">Git & Files</span>
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettingsModal}
              className="inline-flex items-center justify-center rounded-lg bg-slate-800/80 p-2 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition"
              title="Settings & notification triggers"
            >
              <Settings className="h-4 w-4 text-slate-300" />
            </button>

            {/* Add Deal Primary Button */}
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-indigo-600/30 hover:from-indigo-500 hover:to-indigo-400 transition transform active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Track Product</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
