import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Session } from '../types';
import { saveHistoryEntry } from '../lib/storage';
import { formatClock, newId } from '../lib/session';
import ConfirmDialog from './ConfirmDialog';
import StatPair from './jb/StatPair';
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
  const [confirmDiscard, setConfirmDiscard] = useState(false);

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

  const pct = stepsTotal > 0 ? Math.round((stepsCompleted / stepsTotal) * 100) : 0;

  return (
    <div className="flex h-full justify-center bg-[var(--jb-ink-900)]">
      <div
        className="h-full w-full max-w-[430px] overflow-y-auto bg-app px-[var(--screen-gutter)]"
        style={{
          paddingTop: 'calc(24px + env(safe-area-inset-top))',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex flex-col gap-[var(--section-gap)]">
          <div className="flex flex-col gap-1">
            <span className="jb-eyebrow">{session.name}</span>
            <h1 className="jb-display jb-display--condensed m-0 text-[52px]">
              {finished ? 'Treino concluído' : 'Treino encerrado'}
            </h1>
          </div>

          <div className="jb-card-hero flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="jb-eyebrow">Resultado</span>
              {finished ? (
                <span className="jb-pill jb-pill-crimson">Meta atingida</span>
              ) : (
                <span className="jb-pill jb-pill-neutral">Parcial</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatPair value={formatClock(totalSeconds)} label="Tempo total" size={40} accent />
              <StatPair value={`${stepsCompleted}/${stepsTotal}`} label="Passos feitos" size={40} />
            </div>
            <div className="flex items-center gap-3.5">
              <div className="jb-track flex-1">
                <span style={{ width: `${pct}%`, transition: 'width var(--duration-slow) var(--ease-standard)' }} />
              </div>
              <span className="text-[18px] font-bold text-accent">{pct}%</span>
            </div>
          </div>

          <div>
            <span className={labelClass}>Esforço · 1 muito leve, 10 máximo</span>
            <div className="grid grid-cols-5 gap-2">
              {RPE_VALUES.map((n) => {
                const selected = rpe === n;
                return (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setRpe(selected ? undefined : n)}
                    className={`jb-num flex min-h-12 items-center justify-center rounded-full text-[20px] transition-colors duration-[140ms] ${
                      selected ? 'bg-crimson text-white shadow-[var(--glow-accent)]' : 'bg-fill text-secondary'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
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
            <button className={`${btnPrimary} jb-btn-lg w-full`} onClick={save}>
              <Check size={22} strokeWidth={3} /> Salvar no histórico
            </button>
            {/* Asks first, so a stray tap does not throw the workout away */}
            <button type="button" className={`${btnGhost} w-full`} onClick={() => setConfirmDiscard(true)}>
              Não salvar ›
            </button>
          </div>
        </div>
      </div>

      {confirmDiscard && (
        <ConfirmDialog
          title="Tem certeza?"
          message="Este treino não vai para o histórico."
          confirmLabel="Não salvar"
          onConfirm={onDone}
          onCancel={() => setConfirmDiscard(false)}
        />
      )}
    </div>
  );
}
