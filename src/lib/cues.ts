import type { StepKind } from '../types';
import type { Settings } from './storage';

let ctx: AudioContext | null = null;

// Higher tone for work, lower for rest
const TONE: Record<StepKind, number> = {
  work: 880,
  prep: 660,
  cooldown: 523,
  rest: 440,
};

export function audioReady(): boolean {
  return ctx?.state === 'running';
}

// Must run inside a user tap: browsers only allow sound after a gesture
export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    // A silent one-sample buffer fully wakes the audio output on iOS
    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 1, 22050);
    source.connect(ctx.destination);
    source.start();
  } catch {
    // Web Audio not available
  }
  if ('speechSynthesis' in window) {
    const warmUp = new SpeechSynthesisUtterance('');
    warmUp.volume = 0;
    speechSynthesis.speak(warmUp);
  }
}

function tone(freq: number, ms: number, volume: number): void {
  if (!ctx || volume <= 0) return;
  if (ctx.state === 'suspended') void ctx.resume();
  const t = ctx.currentTime;
  const end = t + ms / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  // Short fade in/out avoids clicks
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.setValueAtTime(volume, end - 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(end + 0.02);
}

export function countdownBeep(kind: StepKind, settings: Settings): void {
  if (settings.beeps) tone(TONE[kind], 120, settings.volume);
}

export function startBeep(kind: StepKind, settings: Settings): void {
  if (settings.beeps) tone(TONE[kind], 600, settings.volume);
}

export function finishBeeps(settings: Settings): void {
  if (!settings.beeps) return;
  [523, 659, 784].forEach((freq, i) => setTimeout(() => tone(freq, 250, settings.volume), i * 280));
}

function ptVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  const lang = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase();
  return voices.find((v) => lang(v) === 'pt-br') ?? voices.find((v) => lang(v).startsWith('pt'));
}

export function speak(text: string, settings: Settings): void {
  if (!settings.voice || !text || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  const voice = ptVoice();
  if (voice) utterance.voice = voice;
  utterance.volume = settings.volume;
  utterance.rate = 1.05;
  speechSynthesis.speak(utterance);
}

export function stopSpeech(): void {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

export function vibrate(pattern: number | number[], settings: Settings): void {
  if (settings.vibration) navigator.vibrate?.(pattern);
}
