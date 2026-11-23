import type { Category, Step, StepKind, StepMode } from '../types';

export const KIND_LABEL: Record<StepKind, string> = {
  prep: 'Aquecimento',
  work: 'Exercício',
  rest: 'Descanso',
  cooldown: 'Desaquecimento',
};

// JogaBR palette: amber = get ready, crimson = effort, blue = rest, magenta = cool down
export const KIND_COLOR: Record<StepKind, string> = {
  prep: '#FFB020',
  work: '#E30B60',
  rest: '#7E9CFF',
  cooldown: '#F320D7',
};

export const MODE_LABEL: Record<StepMode, string> = {
  time: 'Tempo',
  reps: 'Repetições',
  manual: 'Manual',
};

export const CATEGORIES: Category[] = ['HIITCoach', 'FQB', 'Cardio', 'Custom'];

export const CATEGORY_LABEL: Record<Category, string> = {
  HIITCoach: 'HIITCoach',
  FQB: 'FQB',
  Cardio: 'Cardio',
  Custom: 'Personalizado',
};

export function stepColor(step: Step): string {
  return step.color || KIND_COLOR[step.kind];
}

// Black or white text, whichever reads better on the given hex background
export function textOn(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  if (Number.isNaN(n)) return '#fff';
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#000000' : '#FFFFFF';
}

// 4px classification rail on session cards
export const CATEGORY_RAIL: Record<Category, string> = {
  HIITCoach: 'var(--rail-accent)',
  FQB: 'var(--jb-magenta-500)',
  Cardio: 'var(--rail-neutral)',
  Custom: 'var(--surface-muted)',
};
