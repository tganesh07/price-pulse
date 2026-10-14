import { DealItem } from '../types/deal';
import { playAlertChime } from './sound';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    console.warn('Web Notifications are not supported in this environment.');
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

export function sendPushAlert(
  deal: DealItem,
  opts?: { sound?: boolean; customBody?: string }
): boolean {
  const soundEnabled = opts?.sound !== false;
  if (soundEnabled) {
    playAlertChime();
  }

  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const savings = deal.targetPrice && deal.currentPrice ? (deal.targetPrice - deal.currentPrice).toFixed(2) : '0';
    const title = `🚨 Deal Alert: ${deal.make ? deal.make + ' ' : ''}${deal.model || deal.title.slice(0, 30)}`;
    const body = opts?.customBody || `Price reached $${deal.currentPrice?.toFixed(2)}! Below your target of $${deal.targetPrice.toFixed(2)} (Save $${savings}).`;

    const notification = new Notification(title, {
      body,
      icon: deal.imageUrl || '/favicon.ico',
      badge: deal.imageUrl || undefined,
      tag: `deal-${deal.id}`,
    });

    notification.onclick = () => {
      window.focus();
      if (deal.url) {
        window.open(deal.url, '_blank', 'noopener,noreferrer');
      }
      notification.close();
    };

    return true;
  } catch (err) {
    console.error('Error dispatching native notification:', err);
    return false;
  }
}
