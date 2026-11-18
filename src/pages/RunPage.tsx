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
import { KIND_LABEL, stepColor, textOn } from '../lib/labels';
import { formatClock } from '../lib/session';
import ConfirmDialog from '../components/ConfirmDialog';
import { btnPrimary } from '../components/ui';

type Timer = ReturnType<typeof createTimer>;

const timedSeconds = (s: RunStep) => (s.mode === 'manual' ? 0 : s.seconds ?? 0);

function nextLabel(step: RunStep): string {
  if (step.mode === 'manual') return `${step.name} · Manual`;
  const time = formatClock(step.seconds ?? 0);
  return step.mode === 'reps' ? `${step.name} · ${step.reps ?? 0}x` : `${step.name} · ${time}`;
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

  useEffect(() => {
    if (steps.length === 0) return;
    const settings = loadSettings();
    let lastBeep = '';

    const timer = createTimer(steps, {
      onTick: (s) => {
        setState(s);
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
        finishBeeps(settings);
        vibrate([200, 100, 200, 100, 400], settings);
        speak('Treino concluído', settings);
        allowScreenOff();
      },
    });
    timerRef.current = timer;
    keepScreenOn();
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
      <div className="flex h-full flex-col items-center justify-center gap-6 bg-neutral-950 px-6 text-center">
        <p className="text-2xl text-neutral-300">
          {session ? 'Esta sessão ainda não tem passos.' : 'Sessão não encontrada.'}
        </p>
        <Link to="/sessoes" className={`${btnPrimary} inline-flex items-center`}>Voltar às sessões</Link>
      </div>
    );
  }

  if (state?.finished) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-neutral-950 px-6 text-center">
        <p className="text-6xl">🎉</p>
        <h1 className="text-4xl font-black">Treino concluído!</h1>
        <p className="text-2xl text-neutral-300">{session.name}</p>
        <p className="text-xl text-neutral-400">
          Tempo total <strong className="text-neutral-100 tabular-nums">{formatClock(totalSeconds)}</strong>
        </p>
        <button className={`${btnPrimary} mt-4 min-h-14 w-full max-w-sm text-xl`} onClick={() => navigate('/sessoes')}>
          Voltar às sessões
        </button>
      </div>
    );
  }

  const timer = timerRef.current;
  const step = state?.step ?? null;
  if (!state || !step || !timer) return <div className="h-full bg-neutral-950" />;

  const bg = stepColor(step);
  const fg = textOn(bg);
  const remainingSec = state.remainingMs === null ? null : Math.ceil(state.remainingMs / 1000);

  const doneInStep = remainingSec === null ? 0 : timedSeconds(step) - state.remainingMs! / 1000;
  const progress = totalSeconds > 0
    ? (startsAt[state.index] + doneInStep) / totalSeconds
    : state.index / steps.length;

  const controlBtn = 'min-h-16 rounded-2xl bg-black/25 text-xl font-bold active:scale-95 disabled:opacity-40';

  return (
    <div
      className="flex h-full flex-col transition-colors duration-300"
      // After a page reload there was no Start tap, so any tap here turns sound on
      onPointerDown={() => {
        if (!audioReady()) unlockAudio();
      }}
      style={{
        backgroundColor: bg,
        color: fg,
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="h-2 w-full bg-black/25">
        <div className="h-full bg-current" style={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%` }} />
      </div>

      <header className="flex items-center gap-3 px-4 pt-3">
        <button
          className="min-h-12 rounded-xl bg-black/25 px-4 text-lg font-bold active:scale-95"
          onClick={() => {
            // Hold the clock while the dialog is open, unless it was already stopped
            pausedForDialog.current = remainingSec !== null && !state.paused;
            if (pausedForDialog.current) timer.pause();
            setConfirmStop(true);
          }}
        >
          ✕ Parar
        </button>
        <div className="min-w-0 flex-1 text-right">
          <p className="text-2xl font-bold">Rodada {step.round} de {step.totalRounds}</p>
          <p className="truncate text-lg opacity-80">{step.blockName}</p>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-lg font-semibold uppercase tracking-wide opacity-80">{KIND_LABEL[step.kind]}</p>
        <h1 className="mb-2 text-5xl leading-tight font-black">{step.name}</h1>

        {step.mode === 'manual' && (
          <>
            <p className="mb-6 text-3xl font-bold opacity-80">Manual</p>
            <button
              className="min-h-32 w-full max-w-md rounded-3xl bg-black/30 text-5xl font-black active:scale-95"
              onClick={() => timer.next()}
            >
              CONCLUÍDO
            </button>
          </>
        )}

        {step.mode === 'reps' && (
          <>
            <p className="text-[30vw] leading-none font-black tabular-nums">{step.reps ?? 0}x</p>
            {remainingSec !== null && (
              <p className="text-[14vw] leading-none font-bold tabular-nums opacity-90">{formatClock(remainingSec)}</p>
            )}
          </>
        )}

        {step.mode === 'time' && remainingSec !== null && (
          <p className="text-[28vw] leading-none font-black tabular-nums">{formatClock(remainingSec)}</p>
        )}

        {state.paused && <p className="mt-4 rounded-xl bg-black/30 px-6 py-2 text-3xl font-black">PAUSADO</p>}
        {step.notes && <p className="mt-4 text-xl opacity-90">{step.notes}</p>}
      </main>

      <div className="mx-4 mb-3 rounded-xl bg-black/25 px-4 py-3 text-xl">
        {state.next ? (
          <>
            <span className="opacity-80">A seguir: </span>
            <strong>{nextLabel(state.next)}</strong>
          </>
        ) : (
          <strong>Último passo!</strong>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 pb-4">
        <button className={controlBtn} onClick={() => timer.previous()}>⏮ Voltar</button>
        <button
          className={controlBtn}
          disabled={remainingSec === null}
          onClick={() => (state.paused ? timer.resume() : timer.pause())}
        >
          {state.paused ? '▶ Retomar' : '⏸ Pausar'}
        </button>
        <button className={controlBtn} onClick={() => timer.next()}>Pular ⏭</button>
      </div>

      {confirmStop && (
        <ConfirmDialog
          title="Parar o treino?"
          message="O treino será encerrado."
          confirmLabel="Parar"
          onConfirm={() => {
            timer.stop();
            navigate('/sessoes');
          }}
          onCancel={() => {
            setConfirmStop(false);
            if (pausedForDialog.current) timer.resume();
          }}
        />
      )}
    </div>
  );
}
