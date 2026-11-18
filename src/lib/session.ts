import type { Block, Session, Step } from '../types';

// crypto.randomUUID is unavailable over plain http on the LAN, so build ids by hand
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Sum of all step seconds (manual steps excluded), multiplied by block repeats
export function blockSeconds(block: Block): number {
  let sum = 0;
  for (const item of block.items) {
    if (item.type === 'block') sum += blockSeconds(item);
    else if (item.mode !== 'manual') sum += item.seconds ?? 0;
  }
  return sum * block.repeat;
}

export function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function createStep(): Step {
  return { type: 'step', id: newId(), name: 'Exercício', kind: 'work', mode: 'time', seconds: 30 };
}

export function createBlock(): Block {
  return { type: 'block', id: newId(), name: 'Bloco', repeat: 3, items: [] };
}

export function createSession(): Session {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name: 'Nova sessão',
    category: 'Custom',
    root: { type: 'block', id: newId(), name: 'Sessão', repeat: 1, items: [] },
    createdAt: now,
    updatedAt: now,
  };
}

function cloneItem(item: Step | Block): Step | Block {
  return item.type === 'step' ? { ...item, id: newId() } : cloneBlock(item);
}

export function cloneBlock(block: Block): Block {
  return { ...block, id: newId(), items: block.items.map(cloneItem) };
}

export function duplicateSession(session: Session): Session {
  const now = new Date().toISOString();
  return {
    ...session,
    id: newId(),
    name: `${session.name} (cópia)`,
    root: cloneBlock(session.root),
    createdAt: now,
    updatedAt: now,
  };
}

// Immutable tree edits

export function replaceItem(block: Block, item: Step | Block): Block {
  return {
    ...block,
    items: block.items.map((i) =>
      i.id === item.id ? item : i.type === 'block' ? replaceItem(i, item) : i,
    ),
  };
}

export function removeItem(block: Block, id: string): Block {
  return {
    ...block,
    items: block.items
      .filter((i) => i.id !== id)
      .map((i) => (i.type === 'block' ? removeItem(i, id) : i)),
  };
}

export function addToBlock(block: Block, blockId: string, item: Step | Block): Block {
  if (block.id === blockId) return { ...block, items: [...block.items, item] };
  return {
    ...block,
    items: block.items.map((i) => (i.type === 'block' ? addToBlock(i, blockId, item) : i)),
  };
}
