import type { Session } from '../types';

const SESSIONS_KEY = 'jogabr.sessions';

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
