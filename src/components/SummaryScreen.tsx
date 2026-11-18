import { useState } from 'react';
import type { Session } from '../types';
import { saveHistoryEntry } from '../lib/storage';
import { formatClock, newId } from '../lib/session';
import { btnPrimary, btnSecondary, inputClass, labelClass } from './ui';

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

  return (
    <div
      className="h-full overflow-y-auto bg-neutral-950 px-4 text-neutral-100"
      style={{
        paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
      }}
    >
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <div className="text-center">
          <p className="text-5xl">{finished ? '🎉' : '🏁'}</p>
          <h1 className="mt-2 text-4xl font-black">{finished ? 'Treino concluído!' : 'Treino encerrado'}</h1>
          <p className="mt-1 text-2xl text-neutral-300">{session.name}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-neutral-900 p-4 text-center">
            <p className="text-base text-neutral-400">Tempo total</p>
            <p className="text-3xl font-black tabular-nums">{formatClock(totalSeconds)}</p>
          </div>
          <div className="rounded-2xl bg-neutral-900 p-4 text-center">
            <p className="text-base text-neutral-400">Passos feitos</p>
            <p className="text-3xl font-black tabular-nums">{stepsCompleted} / {stepsTotal}</p>
          </div>
        </div>

        <div>
          <span className={labelClass}>Esforço (1 = muito leve, 10 = máximo)</span>
          <div className="grid grid-cols-5 gap-2">
            {RPE_VALUES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRpe(rpe === n ? undefined : n)}
                className={`min-h-12 rounded-xl border-2 text-xl font-bold ${
                  rpe === n ? 'border-green-600 bg-green-600 text-white' : 'border-neutral-700 bg-neutral-900 text-neutral-300'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <label>
          <span className={labelClass}>Observações</span>
          <textarea
            className={`${inputClass} min-h-28 py-3`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Como foi o treino?"
          />
        </label>

        <button className={`${btnPrimary} min-h-14 text-xl`} onClick={save}>Salvar no histórico</button>
        <button className={btnSecondary} onClick={onDone}>Não salvar</button>
      </div>
    </div>
  );
}
