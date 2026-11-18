import type { RunStep } from './flatten';

export interface TimerState {
  index: number;
  step: RunStep | null;
  next: RunStep | null;
  remainingMs: number | null;   // null for manual steps
  paused: boolean;
  finished: boolean;
}

interface TimerEvents {
  onTick: (s: TimerState) => void;
  onStepStart: (step: RunStep, index: number) => void;
  onFinish: () => void;
}

export function createTimer(steps: RunStep[], events: TimerEvents) {
  let index = -1;
  let endsAt = 0;            // timestamp (ms) when the timed step ends
  let paused = false;
  let pausedRemaining = 0;
  let interval: ReturnType<typeof setInterval> | undefined;

  const current = () => steps[index] ?? null;
  // time and reps steps run on their own; manual steps wait for DONE
  const isTimed = (s: RunStep | null) =>
    !!s && s.mode !== 'manual' && (s.seconds ?? 0) > 0;

  function state(): TimerState {
    const step = current();
    const remainingMs = !isTimed(step) ? null
      : paused ? pausedRemaining
      : Math.max(0, endsAt - Date.now());
    return {
      index, step, next: steps[index + 1] ?? null, remainingMs,
      paused, finished: index >= steps.length,
    };
  }

  function goTo(i: number) {
    index = i;
    paused = false;
    if (index >= steps.length) {
      stop();
      events.onTick(state());
      events.onFinish();
      return;
    }
    const step = steps[index];
    if (isTimed(step)) endsAt = Date.now() + (step.seconds ?? 0) * 1000;
    events.onStepStart(step, index);
    events.onTick(state());
  }

  function tick() {
    const step = current();
    if (!step || paused) return;
    if (isTimed(step) && Date.now() >= endsAt) goTo(index + 1);
    else events.onTick(state());
  }

  function start() {
    stop();
    goTo(0);
    interval = setInterval(tick, 100);
  }

  function stop() {
    if (interval) clearInterval(interval);
    interval = undefined;
  }

  function pause() {
    if (paused) return;
    pausedRemaining = Math.max(0, endsAt - Date.now());
    paused = true;
    events.onTick(state());
  }

  function resume() {
    if (!paused) return;
    endsAt = Date.now() + pausedRemaining;
    paused = false;
    events.onTick(state());
  }

  const next = () => goTo(index + 1);              // Skip and DONE buttons
  const previous = () => goTo(Math.max(0, index - 1));

  return { start, stop, pause, resume, next, previous, state };
}
