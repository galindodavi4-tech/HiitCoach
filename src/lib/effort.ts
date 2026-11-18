// Maps effort (RPE 1–10) onto the PULSO intensity zones Z1–Z5
export function effortZone(rpe: number): number {
  return Math.min(5, Math.max(1, Math.ceil(rpe / 2)));
}

export function effortColor(rpe: number): string {
  return `var(--zone-${effortZone(rpe)})`;
}
