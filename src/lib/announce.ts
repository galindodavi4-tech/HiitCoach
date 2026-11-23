import type { RunStep } from './flatten';

// The exercise the athlete is about to switch to, when the step at `index` is a
// break (rest, set-up, warm-up) that leads straight into a different exercise
// than the last one done. Returns null otherwise, so repeating the same
// exercise (Tabata, sets of one drill) stays quiet.
export function upcomingExercise(steps: RunStep[], index: number): RunStep | null {
  const step = steps[index];
  const next = steps[index + 1];
  if (!step || step.kind === 'work' || !next || next.kind !== 'work') return null;
  for (let i = index - 1; i >= 0; i--) {
    if (steps[i].kind === 'work') return steps[i].name === next.name ? null : next;
  }
  return next;
}

// What the voice says when a step starts
export function stepCue(steps: RunStep[], index: number): string {
  const step = steps[index];
  const cue = step.voiceCue || step.name;
  const upcoming = upcomingExercise(steps, index);
  return upcoming ? `${cue}. Próximo exercício: ${upcoming.name}` : cue;
}
