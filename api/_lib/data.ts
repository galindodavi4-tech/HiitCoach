import type { HistoryEntry, Session } from '../../src/types.js';
import { mergeSyncData } from '../../src/shared/merge.js';
import type { SyncData } from '../../src/shared/merge.js';
import { getStore } from './store.js';

// Each user's data lives in three hashes keyed by item id, so a single write
// (for example a training created through MCP) never overwrites a whole list.
const keys = (userId: string) => ({
  sessions: `data:${userId}:sessions`,
  history: `data:${userId}:history`,
  deleted: `data:${userId}:deleted`,
});

export async function loadUserData(userId: string): Promise<SyncData> {
  const store = getStore();
  const k = keys(userId);
  const [sessions, history, deleted] = await Promise.all([
    store.hGetAll<Session>(k.sessions),
    store.hGetAll<HistoryEntry>(k.history),
    store.hGetAll<string>(k.deleted),
  ]);
  return {
    sessions: Object.values(sessions),
    history: Object.values(history).sort((a, b) => b.date.localeCompare(a.date)),
    deleted,
  };
}

export async function saveSession(userId: string, session: Session) {
  await getStore().hSet(keys(userId).sessions, { [session.id]: session });
}

// Merges what the phone sent with what the server has, stores the result and returns it
export async function syncUserData(userId: string, incoming: SyncData): Promise<SyncData> {
  const store = getStore();
  const k = keys(userId);
  const current = await loadUserData(userId);
  const merged = mergeSyncData(current, incoming);

  const curSessions = new Map(current.sessions.map((s) => [s.id, s]));
  const changedSessions = merged.sessions.filter((s) => curSessions.get(s.id)?.updatedAt !== s.updatedAt);
  const keptSessions = new Set(merged.sessions.map((s) => s.id));
  const curHistory = new Set(current.history.map((e) => e.id));
  const newHistory = merged.history.filter((e) => !curHistory.has(e.id));
  const keptHistory = new Set(merged.history.map((e) => e.id));

  await Promise.all([
    store.hSet(k.sessions, Object.fromEntries(changedSessions.map((s) => [s.id, s]))),
    store.hDel(k.sessions, current.sessions.filter((s) => !keptSessions.has(s.id)).map((s) => s.id)),
    store.hSet(k.history, Object.fromEntries(newHistory.map((e) => [e.id, e]))),
    store.hDel(k.history, current.history.filter((e) => !keptHistory.has(e.id)).map((e) => e.id)),
    store.hSet(k.deleted, merged.deleted),
    store.hDel(k.deleted, Object.keys(current.deleted).filter((id) => !(id in merged.deleted))),
  ]);
  return merged;
}

// Light shape check of what the phone sends; sessions are the user's own data
export function parseIncoming(body: Record<string, unknown>): SyncData {
  const d = (body.data ?? {}) as Partial<SyncData>;
  const sessions = Array.isArray(d.sessions) ? d.sessions : [];
  const history = Array.isArray(d.history) ? d.history : [];
  const deleted = d.deleted && typeof d.deleted === 'object' ? d.deleted : {};
  const okId = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length < 100;
  return {
    sessions: sessions
      .filter((s) => s && okId(s.id) && typeof s.updatedAt === 'string' && s.root?.type === 'block')
      .slice(0, 2000),
    history: history.filter((e) => e && okId(e.id) && typeof e.date === 'string').slice(0, 20000),
    deleted: Object.fromEntries(
      Object.entries(deleted)
        .filter(([id, at]) => okId(id) && typeof at === 'string')
        .slice(0, 20000),
    ),
  };
}
