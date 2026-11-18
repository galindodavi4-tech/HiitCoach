import { useState } from 'react';
import type { Category, HistoryEntry } from '../types';
import { deleteHistoryEntry, loadHistory } from '../lib/storage';
import { CATEGORIES, CATEGORY_LABEL } from '../lib/labels';
import { formatClock } from '../lib/session';
import BottomSheet from '../components/BottomSheet';
import ConfirmDialog from '../components/ConfirmDialog';
import { btnSecondary } from '../components/ui';

// Monday 00:00 of the current week, local time
function startOfWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

export default function HistoryPage() {
  const [entries, setEntries] = useState(loadHistory);
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const [toDelete, setToDelete] = useState<HistoryEntry | null>(null);

  const weekStart = startOfWeek().toISOString();
  const weekMinutes = Math.round(
    entries.filter((e) => e.date >= weekStart).reduce((sum, e) => sum + e.totalSeconds, 0) / 60,
  );
  const shown = filter === 'all' ? entries : entries.filter((e) => e.category === filter);

  function confirmDelete() {
    if (!toDelete) return;
    deleteHistoryEntry(toDelete.id);
    setToDelete(null);
    setSelected(null);
    setEntries(loadHistory());
  }

  const chip = (active: boolean) =>
    `min-h-12 shrink-0 rounded-full px-4 text-base font-semibold ${
      active ? 'bg-green-600 text-white' : 'bg-neutral-800 text-neutral-300'
    }`;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Histórico</h1>

      <div className="rounded-2xl bg-neutral-900 p-4">
        <p className="text-lg text-neutral-400">Treino nesta semana</p>
        <p className="text-4xl font-black tabular-nums">
          {weekMinutes} <span className="text-2xl font-bold">min</span>
        </p>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button className={chip(filter === 'all')} onClick={() => setFilter('all')}>Todas</button>
        {CATEGORIES.map((c) => (
          <button key={c} className={chip(filter === c)} onClick={() => setFilter(c)}>
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="text-lg text-neutral-400">
          {entries.length === 0 ? 'Os treinos que você fizer vão aparecer aqui.' : 'Nenhum treino nesta categoria.'}
        </p>
      )}

      {shown.map((e) => (
        <button key={e.id} className="rounded-2xl bg-neutral-900 p-4 text-left active:scale-[0.98]" onClick={() => setSelected(e)}>
          <p className="text-base text-neutral-400">{formatDate(e.date)}</p>
          <h2 className="truncate text-2xl font-bold">{e.sessionName}</h2>
          <div className="mt-1 flex items-center justify-between gap-2 text-lg text-neutral-400">
            <span className="rounded-full bg-neutral-800 px-3 py-0.5 text-base">{CATEGORY_LABEL[e.category]}</span>
            {e.rpe !== undefined && <span>Esforço {e.rpe}</span>}
            <span className="font-bold text-neutral-100 tabular-nums">{formatClock(e.totalSeconds)}</span>
          </div>
        </button>
      ))}

      {selected && (
        <BottomSheet title={selected.sessionName} onClose={() => setSelected(null)}>
          <dl className="mb-5 grid grid-cols-2 gap-3 text-lg">
            <div className="col-span-2">
              <dt className="text-neutral-400">Data</dt>
              <dd className="font-bold">{formatDate(selected.date)}</dd>
            </div>
            <div>
              <dt className="text-neutral-400">Categoria</dt>
              <dd className="font-bold">{CATEGORY_LABEL[selected.category]}</dd>
            </div>
            <div>
              <dt className="text-neutral-400">Tempo total</dt>
              <dd className="font-bold tabular-nums">{formatClock(selected.totalSeconds)}</dd>
            </div>
            <div>
              <dt className="text-neutral-400">Passos feitos</dt>
              <dd className="font-bold tabular-nums">{selected.stepsCompleted} / {selected.stepsTotal}</dd>
            </div>
            <div>
              <dt className="text-neutral-400">Esforço</dt>
              <dd className="font-bold">{selected.rpe !== undefined ? `${selected.rpe} de 10` : '—'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-neutral-400">Observações</dt>
              <dd className="whitespace-pre-wrap">{selected.notes || '—'}</dd>
            </div>
          </dl>
          <div className="grid grid-cols-2 gap-3">
            <button className={btnSecondary} onClick={() => setSelected(null)}>Fechar</button>
            <button className={`${btnSecondary} text-red-400`} onClick={() => setToDelete(selected)}>Excluir</button>
          </div>
        </BottomSheet>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Excluir do histórico?"
          message={`O registro de "${toDelete.sessionName}" será apagado.`}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </section>
  );
}
