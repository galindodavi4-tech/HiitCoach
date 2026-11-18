import { useState } from 'react';
import { Check, Flag } from 'lucide-react';
import type { Session } from '../types';
import { saveHistoryEntry } from '../lib/storage';
import { formatClock, newId } from '../lib/session';
import { effortColor } from '../lib/effort';
import RingGauge from './pulso/RingGauge';
import { btnGhost, btnPrimary, inputClass, labelClass } from './ui';

interface Props {
  session: Session;
  finished: boolean; // false when the user stopped early
  totalSeconds: number;
  stepsCompleted: number;
  stepsTotal: number;
  onDone: () => void;
}

const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function SummaryScreen({ session, finished, totalSeconds, stepsCompleted, stepsTotal, onDone }: Props) {
  const [rpe, setRpe] = useState<number | undefined>();
  const [notes, setNotes] = useState('');

  function save() {
    saveHistoryEntry({
      id: newId(),
      sessionId: session.id,
      sessionName: session.name,
      category: session.category,
      date: new Date().toISOString(),
      totalSeconds,
      stepsCompleted,
      stepsTotal,
      rpe,
      notes: notes.trim() || undefined,
    });
    onDone();
  }

  const done = stepsTotal > 0 ? stepsCompleted / stepsTotal : 0;
  const ringColor = finished ? 'var(--p-volt-500)' : 'var(--p-plasma-500)';

  return (
    <div className="flex h-full justify-center bg-[var(--surface-void)]">
      <div
        className="h-full w-full max-w-[430px] overflow-y-auto bg-app px-[var(--gutter)]"
        style={{
          paddingTop: 'calc(24px + env(safe-area-inset-top))',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <span className="p-label" style={{ color: finished ? 'var(--text-accent)' : 'var(--text-heat)' }}>
              {finished ? 'Sessão concluída' : 'Sessão encerrada'}
            </span>
            <h1 className="p-display text-[28px] leading-[1.05]">
              {finished ? 'Treino concluído' : 'Treino encerrado'}
              <span className="text-accent">.</span>
            </h1>
            <p className="text-[15px] text-secondary">{session.name}</p>
          </div>

          <div className="p-dot-grid flex items-center gap-5 rounded-lg border border-line-subtle bg-sunken p-[18px]">
            <RingGauge value={done} size={128} stroke={8} color={ringColor}>
              {finished ? (
                <Check size={34} strokeWidth={2.5} style={{ color: ringColor }} />
              ) : (
                <Flag size={30} strokeWidth={2} style={{ color: ringColor }} />
              )}
            </RingGauge>
            <div className="flex min-w-0 flex-1 flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">Tempo total</span>
                <span className="p-num text-[26px]">{formatClock(totalSeconds)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">Passos feitos</span>
                <span className="flex items-baseline gap-1">
                  <span className="p-num text-[26px]">{stepsCompleted}</span>
                  <span className="p-unit">/ {stepsTotal}</span>
                </span>
              </div>
            </div>
          </div>

          <div>
            <span className={labelClass}>Esforço · 1 muito leve, 10 máximo</span>
            <div className="grid grid-cols-5 gap-2">
              {RPE_VALUES.map((n) => {
                const selected = rpe === n;
                const color = effortColor(n);
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setRpe(selected ? undefined : n)}
                    className="p-num flex min-h-12 items-center justify-center rounded-md border text-[17px] transition-colors duration-[140ms]"
                    style={
                      selected
                        ? {
                            background: color,
                            borderColor: color,
                            color: 'var(--p-void)',
                            boxShadow: `0 0 18px color-mix(in oklab, ${color} 45%, transparent)`,
                          }
                        : { background: 'var(--surface-sunken)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }
                    }
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {/* Cold → hot: the one place the intensity gradient is used */}
            <div className="mt-2.5 h-1 rounded-full" style={{ background: 'var(--gradient-intensity)' }} />
          </div>

          <label>
            <span className={labelClass}>Observações</span>
            <textarea
              className={`${inputClass} min-h-28`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Como foi o treino?"
            />
          </label>

          <div className="flex flex-col gap-2">
            <button className={`${btnPrimary} p-btn-lg w-full`} onClick={save}>
              <Check size={19} strokeWidth={2.5} /> Salvar no histórico
            </button>
            <button className={`${btnGhost} w-full`} onClick={onDone}>Não salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
