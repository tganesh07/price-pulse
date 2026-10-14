import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Bell, 
  BellRing, 
  Volume2, 
  Globe, 
  Mail, 
  Clock, 
  Save, 
  Check, 
  Play,
  ShieldCheck
} from 'lucide-react';
import { TrackerSettings, DealItem } from '../types/deal';
import { playAlertChime } from '../utils/sound';
import { sendPushAlert, requestNotificationPermission } from '../utils/notifications';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TrackerSettings;
  onSaveSettings: (newSettings: Partial<TrackerSettings>) => Promise<void>;
  sampleDeal?: DealItem;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  sampleDeal,
}) => {
  if (!isOpen) return null;

  const [intervalMinutes, setIntervalMinutes] = useState(settings.autoCheckIntervalMinutes);
  const [browserNotifications, setBrowserNotifications] = useState(settings.browserNotificationsEnabled);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundAlertsEnabled);
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl || '');
  const [emailAlerts, setEmailAlerts] = useState(settings.emailAlertsEnabled || false);
  const [notificationEmail, setNotificationEmail] = useState(settings.notificationEmail || '');

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleTestChime = () => {
    playAlertChime();
  };

  const handleTestNotification = async () => {
    const perm = await requestNotificationPermission();
    const testDeal: DealItem = sampleDeal || {
      id: 'test-deal',
      title: 'Werner 6 ft. Fiberglass Step Ladder (NXT1A06)',
      make: 'Werner',
      model: 'NXT1A06',
      url: 'https://www.homedepot.com',
      targetPrice: 100,
      currentPrice: 94.97,
      currency: 'USD',
      inStock: true,
      isTriggered: true,
      notifyOnDropOnly: true,
      lastCheckedAt: new Date().toISOString(),
      status: 'triggered',
      history: [],
    };

    sendPushAlert(testDeal, {
      sound: soundEnabled,
      customBody: `TEST ALERT: Werner Ladder dropped to $94.97 (Trigger: $100.00)! Save $5.03!`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      await onSaveSettings({
        autoCheckIntervalMinutes: Number(intervalMinutes),
        browserNotificationsEnabled: browserNotifications,
        soundAlertsEnabled: soundEnabled,
        webhookUrl: webhookUrl.trim(),
        emailAlertsEnabled: emailAlerts,
        notificationEmail: notificationEmail.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-purple-500/10 p-2 text-purple-400">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Deal Tracker Settings</h2>
              <p className="text-xs text-slate-400">Configure background price checks and push alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {savedSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-400 border border-emerald-500/20">
            <Check className="h-4 w-4" />
            <span>Settings saved and background scheduler updated!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Automated Check Interval */}
          <div className="rounded-xl bg-slate-950/60 p-4 border border-slate-800">
            <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-indigo-400" />
              <span>Automated Background Price Check Interval</span>
            </label>
            <select
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Number(e.target.value))}
              className="mt-2 w-full rounded-lg bg-slate-900 py-2 px-3 text-xs text-white border border-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value={5}>Every 5 minutes (Fast checking)</option>
              <option value={15}>Every 15 minutes (Recommended balance)</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 1 hour</option>
              <option value={0}>Manual only (Pause auto-check)</option>
            </select>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Server automatically iterates across all active products and runs live price checks.
            </p>
          </div>

          {/* Browser Desktop Push Notification */}
          <div className="rounded-xl bg-slate-950/60 p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Browser Push Notifications</div>
                  <div className="text-[11px] text-slate-400">Send desktop alert when target price is met</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={browserNotifications}
                onChange={(e) => setBrowserNotifications(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400">Verify your browser notifications:</span>
              <button
                type="button"
                onClick={handleTestNotification}
                className="inline-flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
              >
                <Bell className="h-3 w-3 text-amber-400" />
                <span>Send Test Alert</span>
              </button>
            </div>
          </div>

          {/* Audio Chime Alert */}
          <div className="rounded-xl bg-slate-950/60 p-4 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-purple-400" />
              <div>
                <div className="text-xs font-semibold text-white">Audio Chime Alert</div>
                <div className="text-[11px] text-slate-400">Play pleasant harp chime on price drop trigger</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestChime}
                className="rounded bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
                title="Play test chime"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Webhook Alerts (Discord / Slack) */}
          <div className="rounded-xl bg-slate-950/60 p-4 border border-slate-800">
            <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-indigo-400" />
              <span>Discord or Slack Webhook URL (Optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="mt-1 w-full rounded-lg bg-slate-900 py-2 px-3 text-xs text-white placeholder-slate-500 border border-slate-700 focus:border-indigo-500 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              When a price drops below threshold, an alert ping is instantly posted to your webhook channel.
            </p>
          </div>

          {/* Email Notification */}
          <div className="rounded-xl bg-slate-950/60 p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-pink-400" />
                <span className="text-xs font-semibold text-white">Email Digest / Alerts</span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            {emailAlerts && (
              <input
                type="email"
                placeholder="you@example.com"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                className="w-full rounded-lg bg-slate-900 py-1.5 px-3 text-xs text-white border border-slate-700 focus:border-indigo-500 focus:outline-none"
              />
            )}
          </div>

          {/* Footer actions */}
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
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
