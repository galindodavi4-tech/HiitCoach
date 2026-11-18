import type { Category, Step, StepKind, StepMode } from '../types';

export const KIND_LABEL: Record<StepKind, string> = {
  prep: 'Aquecimento',
  work: 'Exercício',
  rest: 'Descanso',
  cooldown: 'Desaquecimento',
};

// PULSO energy colours: volt = ready, plasma = effort, ion = recovery, zone 1 = cool down
export const KIND_COLOR: Record<StepKind, string> = {
  prep: '#CCFF00',
  work: '#FF4A1F',
  rest: '#1FE2FF',
  cooldown: '#6E8BFF',
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
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#0A0D00' : '#F5F7F9';
}
