// Account and cloud sync. Data stays in localStorage (the app works offline);
// when signed in, it is merged both ways with the server.
import { mergeSyncData } from '../shared/merge';
import { CHANGED_EVENT, SYNCED_EVENT, loadDeleted, loadHistory, loadSessions, replaceSyncedData } from './storage';

const ACCOUNT_KEY = 'hiitcoach.account';

export interface Account {
  email: string;
  token: string;
  lastSync?: string;
}

export type SyncStatus =
  | { state: 'signed-out' }
  | { state: 'idle'; lastSync?: string }
  | { state: 'syncing' }
  | { state: 'error'; message: string; lastSync?: string };

export function getAccount(): Account | null {
  try {
    const a = JSON.parse(localStorage.getItem(ACCOUNT_KEY) ?? 'null');
    return a && typeof a.token === 'string' ? a : null;
  } catch {
    return null;
  }
}

function setAccount(a: Account | null) {
  if (a) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(a));
  else localStorage.removeItem(ACCOUNT_KEY);
}

let status: SyncStatus = getAccount() ? { state: 'idle', lastSync: getAccount()?.lastSync } : { state: 'signed-out' };
const listeners = new Set<(s: SyncStatus) => void>();

function setStatus(s: SyncStatus) {
  status = s;
  listeners.forEach((l) => l(s));
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function onSyncStatus(listener: (s: SyncStatus) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function api<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch {
    throw new SyncError('Sem conexão com a internet.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new SyncError(body.error_description ?? 'Não foi possível falar com o servidor.', res.status);
  return body as T;
}

export class SyncError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

// Signs in (or creates the account) and uploads what is already on the phone
export async function signIn(action: 'login' | 'signup', email: string, password: string) {
  const r = await api<{ token: string; email: string }>('/api/account', {
    method: 'POST',
    body: JSON.stringify({ action, email, password }),
  });
  setAccount({ email: r.email, token: r.token });
  setStatus({ state: 'idle' });
  await syncNow();
}

// Data stays on the phone after signing out
export async function signOut() {
  const a = getAccount();
  setAccount(null);
  setStatus({ state: 'signed-out' });
  if (a) await api('/api/account', { method: 'DELETE', token: a.token }).catch(() => undefined);
}

let running: Promise<void> | null = null;
let again = false;

export async function syncNow(): Promise<void> {
  if (running) {
    again = true; // a change came in during this sync: run once more afterwards
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await syncOnce();
    } while (again);
  })().finally(() => (running = null));
  return running;
}

async function syncOnce() {
  const account = getAccount();
  if (!account) return;
  setStatus({ state: 'syncing' });
  const local = { sessions: loadSessions(), history: loadHistory(), deleted: loadDeleted() };
  try {
    const r = await api<{ data: typeof local; syncedAt: string }>('/api/sync', {
      method: 'POST',
      token: account.token,
      body: JSON.stringify({ data: local }),
    });
    // Merge again with the current local data, in case something changed during the request
    const now = { sessions: loadSessions(), history: loadHistory(), deleted: loadDeleted() };
    replaceSyncedData(mergeSyncData(now, r.data));
    setAccount({ ...account, lastSync: r.syncedAt });
    setStatus({ state: 'idle', lastSync: r.syncedAt });
    window.dispatchEvent(new Event(SYNCED_EVENT));
  } catch (err) {
    if (err instanceof SyncError && err.status === 401) {
      setAccount(null);
      setStatus({ state: 'signed-out' });
      return;
    }
    setStatus({ state: 'error', message: err instanceof Error ? err.message : 'Erro ao sincronizar.', lastSync: account.lastSync });
  }
}

// Syncs when the app opens or comes back to the screen, when the phone gets
// back online, and shortly after any local change
export function startAutoSync() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const soon = (ms: number) => {
    if (!getAccount()) return;
    clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), ms);
  };
  window.addEventListener(CHANGED_EVENT, () => soon(1500));
  window.addEventListener('online', () => soon(500));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') soon(300);
  });
  soon(500);
}
