// Two-way merge of a user's data between the phone and the server.
// Pure code shared by the app and the API. Last write wins per item; a deletion
// is kept as a tombstone so it reaches the other side instead of the item coming back.
import type { HistoryEntry, Session } from '../types.js';

export interface SyncData {
  sessions: Session[];
  history: HistoryEntry[];
  deleted: Record<string, string>; // item id → ISO time it was deleted
}

export const EMPTY_SYNC_DATA: SyncData = { sessions: [], history: [], deleted: {} };

// Tombstones older than this are dropped; any device offline longer may resurrect items
const TOMBSTONE_DAYS = 180;

function later(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export function mergeSyncData(a: SyncData, b: SyncData, now = new Date()): SyncData {
  const cutoff = new Date(now.getTime() - TOMBSTONE_DAYS * 864e5).toISOString();
  const deleted: Record<string, string> = {};
  for (const src of [a.deleted, b.deleted]) {
    for (const [id, at] of Object.entries(src ?? {})) {
      const t = later(deleted[id], at);
      if (t && t >= cutoff) deleted[id] = t;
    }
  }

  const sessions = new Map<string, Session>();
  for (const s of [...(a.sessions ?? []), ...(b.sessions ?? [])]) {
    const prev = sessions.get(s.id);
    if (!prev || s.updatedAt > prev.updatedAt) sessions.set(s.id, s);
  }
  const history = new Map<string, HistoryEntry>();
  for (const e of [...(a.history ?? []), ...(b.history ?? [])]) history.set(e.id, e);

  return {
    // An edit after the deletion wins over the deletion
    sessions: [...sessions.values()].filter((s) => !deleted[s.id] || s.updatedAt > deleted[s.id]),
    history: [...history.values()].filter((e) => !deleted[e.id]).sort((x, y) => y.date.localeCompare(x.date)),
    deleted,
  };
}
