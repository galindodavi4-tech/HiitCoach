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
import type { RunStep } from '../lib/flatten';
import { createTimer } from '../lib/timer';
import type { TimerState } from '../lib/timer';
import { KIND_LABEL, stepColor } from '../lib/labels';
import { formatClock } from '../lib/session';
import { Check, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import SummaryScreen from '../components/SummaryScreen';
import Badge from '../components/pulso/Badge';
import RingGauge from '../components/pulso/RingGauge';
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
  return step.mode === 'reps' ? `${step.reps ?? 0} reps` : formatClock(step.seconds ?? 0);
}

// Ring diameter that fits the phone screen, in px
function useRingSize(): number {
  const measure = () => Math.round(Math.min(window.innerWidth - 64, window.innerHeight * 0.4, 340));
  const [size, setSize] = useState(measure);
  useEffect(() => {
    const onResize = () => setSize(measure());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

export default function RunPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useMemo(() => (id ? getSession(id) : undefined), [id]);
  const steps = useMemo(() => (session ? flatten(session.root) : []), [session]);

  const ringSize = useRingSize();
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
      onStepStart: (step) => {
        startBeep(step.kind, settings);
        vibrate(200, settings);
        speak(step.voiceCue || step.name, settings);
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
        <p className="text-[17px] text-secondary">
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

  // How much of the current timed step is left, for the ring
  const stepFraction = remainingSec === null || timedSeconds(step) === 0
    ? 1
    : state.remainingMs! / 1000 / timedSeconds(step);
  const next = state.next;

  return (
    <div
      className="flex h-full justify-center bg-[var(--surface-void)]"
      // After a page reload there was no Start tap, so any tap here turns sound on
      onPointerDown={() => {
        if (!audioReady()) unlockAudio();
      }}
    >
      <div
        className="relative flex h-full w-full max-w-[430px] flex-col"
        style={{
          // Flat tint of the step colour: the whole screen changes with the step kind
          backgroundColor: `color-mix(in oklab, ${color} 13%, var(--surface-app))`,
          transition: 'background-color var(--dur-base) var(--ease-out)',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div className="h-1.5 w-full bg-[var(--p-carbon-700)]">
          <div
            className="h-full"
            style={{
              width: `${Math.min(1, Math.max(0, progress)) * 100}%`,
              background: color,
              boxShadow: `0 0 12px ${color}`,
            }}
          />
        </div>

        <header className="flex items-center justify-between gap-3 px-[var(--gutter)] pt-3">
          <button
            className="p-icon-btn p-icon-btn-ghost"
            aria-label="Parar treino"
            onClick={() => {
              // Hold the clock while the dialog is open, unless it was already stopped
              pausedForDialog.current = remainingSec !== null && !state.paused;
              if (pausedForDialog.current) timer.pause();
              setConfirmStop(true);
            }}
          >
            <X size={22} strokeWidth={2} />
          </button>
          {state.paused ? (
            <Badge color="var(--warning)">Pausado</Badge>
          ) : (
            <Badge color="var(--p-plasma-400)" live>Ao vivo</Badge>
          )}
          <div className="min-w-0 text-right">
            <p className="p-label text-primary">
              Rodada {step.round} de {step.totalRounds}
            </p>
            <p className="truncate text-[13px] text-muted">{step.blockName}</p>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-[var(--gutter)] text-center">
          <div className="flex flex-col items-center gap-3">
            <span className="font-mono text-[12px] font-medium tracking-[0.14em] uppercase" style={{ color }}>
              {KIND_LABEL[step.kind]}
            </span>
            <h1 className="p-display text-[30px] leading-[1.08] font-semibold">{step.name}</h1>
          </div>

          {step.mode === 'manual' && (
            <button className={`${btnPrimary} p-btn-lg h-28 w-full text-[18px]`} onClick={() => timer.next()}>
              <Check size={26} strokeWidth={2.5} /> Concluído
            </button>
          )}

          {step.mode === 'reps' && (
            <RingGauge value={stepFraction} size={ringSize} color={color}>
              <span className="flex items-baseline gap-1">
                <span className="p-num" style={{ fontSize: Math.round(ringSize * 0.3), letterSpacing: '-0.05em' }}>
                  {step.reps ?? 0}
                </span>
                <span className="p-unit text-[14px]">reps</span>
              </span>
              {remainingSec !== null && (
                <span className="font-mono text-[18px] font-medium" style={{ color }}>
                  {formatClock(remainingSec)}
                </span>
              )}
            </RingGauge>
          )}

          {step.mode === 'time' && remainingSec !== null && (
            <RingGauge value={stepFraction} size={ringSize} color={color}>
              <span
                className="p-num"
                style={{
                  fontSize: Math.round(ringSize * (remainingSec >= 600 ? 0.2 : 0.25)),
                  letterSpacing: '-0.05em',
                }}
              >
                {formatClock(remainingSec)}
              </span>
            </RingGauge>
          )}

          {step.notes && <p className="max-w-sm text-[15px] text-secondary">{step.notes}</p>}
        </main>

        {/* Docked action panel */}
        <div
          className="flex flex-col gap-3 border-t border-line bg-surface-1 px-[var(--gutter)] pt-3.5"
          style={{ boxShadow: 'var(--shadow-sheet)', paddingBottom: 'calc(18px + env(safe-area-inset-bottom))' }}
        >
          <div className="flex min-h-11 items-center gap-3">
            {next ? (
              <>
                <span className="p-label shrink-0">A seguir</span>
                <span
                  aria-hidden="true"
                  className="h-5 w-1.5 shrink-0 rounded-xs"
                  style={{ background: stepColor(next) }}
                />
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{next.name}</span>
                <span className="shrink-0 font-mono text-[12px] tracking-[0.06em] text-muted uppercase">
                  {nextDetail(next)}
                </span>
              </>
            ) : (
              <span className="p-label text-accent">Último passo. Vai até o fim.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              className="p-icon-btn h-[60px] w-[60px]"
              aria-label="Voltar ao passo anterior"
              onClick={() => timer.previous()}
            >
              <SkipBack size={22} strokeWidth={2} />
            </button>
            <button
              className={`p-btn p-btn-lg flex-1 ${state.paused ? 'p-btn-primary' : 'p-btn-secondary'}`}
              disabled={remainingSec === null}
              onClick={() => (state.paused ? timer.resume() : timer.pause())}
            >
              {state.paused ? (
                <>
                  <Play size={19} strokeWidth={2} fill="currentColor" /> Retomar
                </>
              ) : (
                <>
                  <Pause size={19} strokeWidth={2} fill="currentColor" /> Pausar
                </>
              )}
            </button>
            <button className="p-icon-btn h-[60px] w-[60px]" aria-label="Pular passo" onClick={() => timer.next()}>
              <SkipForward size={22} strokeWidth={2} />
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
