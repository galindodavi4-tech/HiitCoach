import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getSession, loadSettings } from '../lib/storage';
import {
  audioReady,
  countdownBeep,
  finishBeeps,
  speak,
  startBeep,
  stopSpeech,
  unlockAudio,
  vibrate,
} from '../lib/cues';
import { allowScreenOff, keepScreenOn } from '../lib/wakeLock';
import { flatten } from '../lib/flatten';
import { stepCue, upcomingExercise } from '../lib/announce';
import type { RunStep } from '../lib/flatten';
import { createTimer } from '../lib/timer';
import type { TimerState } from '../lib/timer';
import { KIND_LABEL, stepColor, textOn } from '../lib/labels';
import { formatClock } from '../lib/session';
import { Check, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import SummaryScreen from '../components/SummaryScreen';
import { btnPrimary } from '../components/ui';

type Timer = ReturnType<typeof createTimer>;

interface Summary {
  finished: boolean;
  totalSeconds: number;
  stepsCompleted: number;
}

const timedSeconds = (s: RunStep) => (s.mode === 'manual' ? 0 : s.seconds ?? 0);

function nextDetail(step: RunStep): string {
  if (step.mode === 'manual') return 'Manual';
  return step.mode === 'reps' ? `${step.reps ?? 0}×` : formatClock(step.seconds ?? 0);
}

export default function RunPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useMemo(() => (id ? getSession(id) : undefined), [id]);
  const steps = useMemo(() => (session ? flatten(session.root) : []), [session]);

  const timerRef = useRef<Timer | null>(null);
  const [state, setState] = useState<TimerState | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const pausedForDialog = useRef(false);
  const [stopped, setStopped] = useState<Summary | null>(null);

  // Real training time: wall clock since start, minus time spent paused
  const startedAt = useRef(0);
  const pausedMs = useRef(0);
  const pausedSince = useRef<number | null>(null);
  const elapsedSeconds = () => {
    const end = pausedSince.current ?? Date.now();
    return Math.max(0, Math.round((end - startedAt.current - pausedMs.current) / 1000));
  };

  useEffect(() => {
    if (steps.length === 0) return;
    const settings = loadSettings();
    let lastBeep = '';

    const timer = createTimer(steps, {
      onTick: (s) => {
        setState(s);
        if (s.paused && pausedSince.current === null) pausedSince.current = Date.now();
        if (!s.paused && pausedSince.current !== null) {
          pausedMs.current += Date.now() - pausedSince.current;
          pausedSince.current = null;
        }
        if (!s.step || s.paused || s.remainingMs === null) return;
        // Short beep at 3, 2 and 1 s before a timed step ends, once each
        const sec = Math.ceil(s.remainingMs / 1000);
        const key = `${s.index}:${sec}`;
        if (sec >= 1 && sec <= 3 && sec < (s.step.seconds ?? 0) && key !== lastBeep) {
          lastBeep = key;
          countdownBeep(s.step.kind, settings);
        }
      },
      onStepStart: (step, index) => {
        startBeep(step.kind, settings);
        vibrate(200, settings);
        // Also names the next exercise when the athlete is about to switch drills
        speak(stepCue(steps, index), settings);
      },
      onFinish: () => {
        setStopped({ finished: true, totalSeconds: elapsedSeconds(), stepsCompleted: steps.length });
        finishBeeps(settings);
        vibrate([200, 100, 200, 100, 400], settings);
        speak('Treino concluído', settings);
        allowScreenOff();
      },
    });
    timerRef.current = timer;
    keepScreenOn();
    startedAt.current = Date.now();
    timer.start();
    return () => {
      timer.stop();
      allowScreenOff();
      stopSpeech();
    };
  }, [steps]);

  // Seconds elapsed before each step, for the whole-session progress bar
  const { startsAt, totalSeconds } = useMemo(() => {
    const starts: number[] = [];
    let sum = 0;
    for (const s of steps) {
      starts.push(sum);
      sum += timedSeconds(s);
    }
    return { startsAt: starts, totalSeconds: sum };
  }, [steps]);

  if (!session || steps.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 bg-app px-6 text-center">
        <p className="text-[18px] text-secondary">
          {session ? 'Esta sessão ainda não tem passos.' : 'Sessão não encontrada.'}
        </p>
        <Link to="/sessoes" className={btnPrimary}>Voltar às sessões</Link>
      </div>
    );
  }

  if (stopped) {
    return (
      <SummaryScreen
        session={session}
        finished={stopped.finished}
        totalSeconds={stopped.totalSeconds}
        stepsCompleted={stopped.stepsCompleted}
        stepsTotal={steps.length}
        onDone={() => navigate('/sessoes')}
      />
    );
  }

  const timer = timerRef.current;
  const step = state?.step ?? null;
  if (!state || !step || !timer) return <div className="h-full bg-app" />;

  const color = stepColor(step);
  const remainingSec = state.remainingMs === null ? null : Math.ceil(state.remainingMs / 1000);

  const doneInStep = remainingSec === null ? 0 : timedSeconds(step) - state.remainingMs! / 1000;
  const progress = totalSeconds > 0
    ? (startsAt[state.index] + doneInStep) / totalSeconds
    : state.index / steps.length;

  // How much of the current timed step is done, for the step progress bar
  const stepDone = remainingSec === null || timedSeconds(step) === 0
    ? 0
    : 1 - state.remainingMs! / 1000 / timedSeconds(step);
  const fg = textOn(color);
  const pct = Math.min(1, Math.max(0, progress));
  const next = state.next;
  const switching = upcomingExercise(steps, state.index) !== null;

  return (
    <div
      className="flex h-full justify-center bg-[var(--jb-ink-900)]"
      // After a page reload there was no Start tap, so any tap here turns sound on
      onPointerDown={() => {
        if (!audioReady()) unlockAudio();
      }}
    >
      <div
        className="relative flex h-full w-full max-w-[430px] flex-col bg-app"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <header className="flex items-center gap-3 px-[var(--screen-gutter)] pt-3">
          <button
            className="jb-icon-btn"
            aria-label="Parar treino"
            onClick={() => {
              // Hold the clock while the dialog is open, unless it was already stopped
              pausedForDialog.current = remainingSec !== null && !state.paused;
              if (pausedForDialog.current) timer.pause();
              setConfirmStop(true);
            }}
          >
            <X size={22} strokeWidth={2.4} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="jb-eyebrow">Rodada {step.round} de {step.totalRounds}</p>
            <p className="truncate text-[15px] text-secondary">{step.blockName}</p>
          </div>
          {state.paused ? (
            <span className="jb-pill jb-pill-neutral">Pausado</span>
          ) : (
            <span className="jb-pill jb-pill-crimson">Ao vivo</span>
          )}
        </header>

        {/* Whole-session progress */}
        <div className="flex items-center gap-3 px-[var(--screen-gutter)] pt-3">
          <div className="jb-track h-2 flex-1">
            <span style={{ width: `${pct * 100}%` }} />
          </div>
          <span className="text-[15px] font-bold text-accent">{Math.round(pct * 100)}%</span>
        </div>

        <main className="flex flex-1 flex-col gap-3 overflow-y-auto px-[var(--screen-gutter)] py-4">
          {/* Scoreboard panel: a flat block in the step colour, readable from a distance */}
          <div
            className="flex flex-1 flex-col items-center justify-center gap-4 rounded-[var(--radius-xl)] px-4 py-6 text-center"
            style={{ background: color, color: fg, transition: 'background var(--duration-base) var(--ease-standard)' }}
          >
            <span className="text-[13px] font-bold tracking-[0.14em] uppercase opacity-85">{KIND_LABEL[step.kind]}</span>
            <h1 className="jb-display jb-display--condensed m-0 text-[44px] break-words">{step.name}</h1>

            {step.mode === 'manual' && (
              <button
                className="jb-btn jb-btn-lg mt-2 w-full bg-[var(--jb-ink-950)] text-white"
                onClick={() => timer.next()}
              >
                <Check size={24} strokeWidth={3} /> Concluído
              </button>
            )}

            {step.mode === 'reps' && (
              <>
                <span className="jb-num" style={{ fontSize: 'min(36vw, 150px)', fontStretch: '110%' }}>
                  {step.reps ?? 0}×
                </span>
                {remainingSec !== null && (
                  <span className="jb-num text-[34px] opacity-85">{formatClock(remainingSec)}</span>
                )}
              </>
            )}

            {step.mode === 'time' && remainingSec !== null && (
              <span
                className="jb-num"
                style={{ fontSize: remainingSec >= 600 ? 'min(22vw, 100px)' : 'min(30vw, 128px)', fontStretch: '110%' }}
              >
                {formatClock(remainingSec)}
              </span>
            )}

            {step.notes && <p className="max-w-sm text-[17px] font-semibold opacity-90">{step.notes}</p>}
          </div>

          {remainingSec !== null && (
            <div className="jb-track">
              <span style={{ width: `${Math.min(1, Math.max(0, stepDone)) * 100}%`, background: color }} />
            </div>
          )}
        </main>

        {/* Docked CTA band */}
        <div
          className="flex flex-col gap-3 border-t border-line-subtle bg-app px-[var(--screen-gutter)] pt-3"
          style={{ boxShadow: 'var(--elev-dock)', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
        >
          {next ? (
            <div
              className={`flex min-h-12 items-center gap-3 rounded-lg px-4 py-2.5 ${
                switching ? 'border border-[var(--border-accent-soft)] bg-[var(--jb-crimson-wash)]' : 'bg-fill'
              }`}
            >
              <span
                className={`shrink-0 text-[12px] font-bold tracking-[0.08em] uppercase ${
                  switching ? 'text-accent' : 'text-secondary'
                }`}
              >
                {switching ? 'Troca' : 'A seguir'}
              </span>
              <span className="w-px self-stretch bg-line-strong" />
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: stepColor(next) }} />
              <span className="min-w-0 flex-1 truncate text-[17px] font-bold">{next.name}</span>
              <span className="jb-num shrink-0 text-[18px]">{nextDetail(next)}</span>
            </div>
          ) : (
            <div className="flex min-h-12 items-center rounded-lg bg-[var(--jb-crimson-wash)] px-4">
              <span className="jb-display text-[18px] text-accent">Último passo. Até o fim.</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              className="jb-icon-btn h-[60px] w-[60px]"
              aria-label="Voltar ao passo anterior"
              onClick={() => timer.previous()}
            >
              <SkipBack size={24} strokeWidth={2.2} />
            </button>
            <button
              className={`jb-btn jb-btn-lg flex-1 ${state.paused ? 'jb-btn-primary' : 'jb-btn-neutral'}`}
              disabled={remainingSec === null}
              onClick={() => (state.paused ? timer.resume() : timer.pause())}
            >
              {state.paused ? (
                <>
                  <Play size={20} strokeWidth={2} fill="currentColor" /> Retomar
                </>
              ) : (
                <>
                  <Pause size={20} strokeWidth={2} fill="currentColor" /> Pausar
                </>
              )}
            </button>
            <button className="jb-icon-btn h-[60px] w-[60px]" aria-label="Pular passo" onClick={() => timer.next()}>
              <SkipForward size={24} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {confirmStop && (
          <ConfirmDialog
            title="Parar o treino?"
            message="O treino será encerrado."
            confirmLabel="Parar"
            onConfirm={() => {
              timer.stop();
              allowScreenOff();
              stopSpeech();
              setConfirmStop(false);
              // Steps before the current one count as done
              setStopped({ finished: false, totalSeconds: elapsedSeconds(), stepsCompleted: state.index });
            }}
            onCancel={() => {
              setConfirmStop(false);
              if (pausedForDialog.current) timer.resume();
            }}
          />
        )}
      </div>
    </div>
  );
}
