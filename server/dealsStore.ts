import fs from 'fs';
import path from 'path';
import { DealItem, TrackerSettings } from '../src/types/deal.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DEALS_FILE = path.join(DATA_DIR, 'deals.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readDeals(): DealItem[] {
  try {
    if (!fs.existsSync(DEALS_FILE)) {
      fs.writeFileSync(DEALS_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const content = fs.readFileSync(DEALS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading deals.json:', err);
    return [];
  }
}

export function writeDeals(deals: DealItem[]): void {
  try {
    fs.writeFileSync(DEALS_FILE, JSON.stringify(deals, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing deals.json:', err);
    throw err;
  }
}

export function readRawDealsJson(): string {
  if (!fs.existsSync(DEALS_FILE)) {
    return '[]';
  }
  return fs.readFileSync(DEALS_FILE, 'utf-8');
}

export function writeRawDealsJson(content: string): DealItem[] {
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error('Deals file content must be a JSON array of deal items.');
  }
  fs.writeFileSync(DEALS_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
  return parsed;
}

const DEFAULT_SETTINGS: TrackerSettings = {
  autoCheckIntervalMinutes: 15,
  browserNotificationsEnabled: true,
  soundAlertsEnabled: true,
  webhookUrl: '',
  emailAlertsEnabled: false,
  notificationEmail: 'tganesh07@gmail.com',
};

export function readSettings(): TrackerSettings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
      return DEFAULT_SETTINGS;
    }
    const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
  } catch (err) {
    console.error('Error reading settings.json:', err);
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settings: Partial<TrackerSettings>): TrackerSettings {
  try {
    const current = readSettings();
    const updated = { ...current, ...settings };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (err) {
    console.error('Error writing settings.json:', err);
    throw err;
  }
}
