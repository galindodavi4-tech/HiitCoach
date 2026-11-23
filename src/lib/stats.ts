import type { HistoryEntry } from '../types';

// Local calendar day, e.g. "2026-11-23"
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export interface DayTotal {
  count: number;
  seconds: number;
}

export function dailyTotals(entries: HistoryEntry[]): Map<string, DayTotal> {
  const map = new Map<string, DayTotal>();
  for (const e of entries) {
    const key = dayKey(new Date(e.date));
    const t = map.get(key) ?? { count: 0, seconds: 0 };
    t.count += 1;
    t.seconds += e.totalSeconds;
    map.set(key, t);
  }
  return map;
}

// Monday 00:00 of the week that contains d
export function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

export interface WeekTotal {
  start: Date;
  minutes: number;
  count: number;
}

// The last `weeks` weeks, oldest first, ending with the current week
export function weeklyTotals(entries: HistoryEntry[], weeks: number, now = new Date()): WeekTotal[] {
  const current = startOfWeek(now);
  const out: WeekTotal[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(current);
    start.setDate(start.getDate() - i * 7);
    out.push({ start, minutes: 0, count: 0 });
  }
  const first = out[0].start.getTime();
  for (const e of entries) {
    const t = new Date(e.date).getTime();
    if (t < first) continue;
    const idx = Math.floor((startOfWeek(new Date(e.date)).getTime() - first) / (7 * 864e5) + 0.01);
    if (idx >= 0 && idx < out.length) {
      out[idx].minutes += e.totalSeconds / 60;
      out[idx].count += 1;
    }
  }
  return out.map((w) => ({ ...w, minutes: Math.round(w.minutes) }));
}

// Consecutive training days: the current run (ending today or yesterday) and the longest
export function dayStreaks(days: Map<string, DayTotal>, now = new Date()): { current: number; longest: number } {
  const keys = [...days.keys()].sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const d = new Date(`${k}T12:00:00`);
    run = prev && Math.round((d.getTime() - prev.getTime()) / 864e5) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  let current = 0;
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, longest };
}

const DAY_FMT = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

// "qua, 18/11"
export function shortDay(d: Date): string {
  return DAY_FMT.format(d).replace('.', '');
}
