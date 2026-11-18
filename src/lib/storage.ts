import type { Category, HistoryEntry, Session } from '../types';

const SESSIONS_KEY = 'hiitcoach.sessions';
const SETTINGS_KEY = 'hiitcoach.settings';
const HISTORY_KEY = 'hiitcoach.history';

// The app used to be called JogaBR. Move data saved under the old keys and
// category name so nothing is lost after the rename. Runs once per device.
const LEGACY_KEYS: [string, string][] = [
  ['jogabr.sessions', SESSIONS_KEY],
  ['jogabr.settings', SETTINGS_KEY],
  ['jogabr.history', HISTORY_KEY],
];

function renameCategory(category: string): Category {
  return (category === 'JogaBR' ? 'HIITCoach' : category) as Category;
}

function migrateLegacyData(): void {
  try {
    for (const [oldKey, newKey] of LEGACY_KEYS) {
      const raw = localStorage.getItem(oldKey);
      if (raw === null) continue;
      if (localStorage.getItem(newKey) === null) {
        const data = JSON.parse(raw);
        const migrated = Array.isArray(data)
          ? data.map((item) => ({ ...item, category: renameCategory(item.category) }))
          : data;
        localStorage.setItem(newKey, JSON.stringify(migrated));
      }
      localStorage.removeItem(oldKey);
    }
  } catch {
    // Storage unavailable or corrupt: start fresh under the new keys
  }
}

migrateLegacyData();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadSessions(): Session[] {
  const sessions = read<Session[]>(SESSIONS_KEY, []);
  return Array.isArray(sessions) ? sessions : [];
}

export function getSession(id: string): Session | undefined {
  return loadSessions().find((s) => s.id === id);
}

// Inserts the session, or replaces it when the id already exists
export function saveSession(session: Session): void {
  const sessions = loadSessions();
  const index = sessions.findIndex((s) => s.id === session.id);
  if (index >= 0) sessions[index] = session;
  else sessions.push(session);
  write(SESSIONS_KEY, sessions);
}

export function deleteSession(id: string): void {
  write(SESSIONS_KEY, loadSessions().filter((s) => s.id !== id));
}

export interface Settings {
  beeps: boolean;
  voice: boolean;
  vibration: boolean;
  volume: number; // 0-1
}

const DEFAULT_SETTINGS: Settings = { beeps: true, voice: true, vibration: true, volume: 0.8 };

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(SETTINGS_KEY, {}) };
}

export function saveSettings(settings: Settings): void {
  write(SETTINGS_KEY, settings);
}

// Newest first
export function loadHistory(): HistoryEntry[] {
  const entries = read<HistoryEntry[]>(HISTORY_KEY, []);
  return Array.isArray(entries) ? entries.sort((a, b) => b.date.localeCompare(a.date)) : [];
}

export function saveHistoryEntry(entry: HistoryEntry): void {
  write(HISTORY_KEY, [...loadHistory().filter((e) => e.id !== entry.id), entry]);
}

export function deleteHistoryEntry(id: string): void {
  write(HISTORY_KEY, loadHistory().filter((e) => e.id !== id));
}
