import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Session } from '../types';
import { deleteSession, loadSessions, saveSession } from '../lib/storage';
import { CATEGORY_LABEL } from '../lib/labels';
import { blockSeconds, createSession, duplicateSession, formatClock } from '../lib/session';
import { unlockAudio } from '../lib/cues';
import ConfirmDialog from '../components/ConfirmDialog';
import { btnPrimary, btnSecondary } from '../components/ui';

function loadSorted(): Session[] {
  return loadSessions().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState(loadSorted);
  const [toDelete, setToDelete] = useState<Session | null>(null);

  function create() {
    const session = createSession();
    saveSession(session);
    navigate(`/sessoes/${session.id}`);
  }

  function duplicate(session: Session) {
    saveSession(duplicateSession(session));
    setSessions(loadSorted());
  }

  function confirmDelete() {
    if (!toDelete) return;
    deleteSession(toDelete.id);
    setToDelete(null);
    setSessions(loadSorted());
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Sessões</h1>

      <button className={`${btnPrimary} min-h-14 text-xl`} onClick={create}>
        + Nova sessão
      </button>

      {sessions.length === 0 && (
        <p className="text-lg text-neutral-400">Você ainda não tem sessões. Crie a primeira!</p>
      )}

      {sessions.map((s) => (
        <article key={s.id} className="rounded-2xl bg-neutral-900 p-4">
          <Link to={`/sessoes/${s.id}`} className="mb-3 block">
            <h2 className="truncate text-2xl font-bold">{s.name}</h2>
            <div className="mt-1 flex items-center justify-between text-lg text-neutral-400">
              <span className="rounded-full bg-neutral-800 px-3 py-0.5 text-base">{CATEGORY_LABEL[s.category]}</span>
              <span className="font-bold text-neutral-100 tabular-nums">{formatClock(blockSeconds(s.root))}</span>
            </div>
          </Link>
          <Link
            to={`/rodar/${s.id}`}
            onClick={unlockAudio}
            className={`${btnPrimary} mb-2 flex min-h-14 items-center justify-center text-xl`}
          >
            ▶ Iniciar
          </Link>
          <div className="grid grid-cols-3 gap-2">
            <Link to={`/sessoes/${s.id}`} className={`${btnSecondary} flex items-center justify-center`}>
              Abrir
            </Link>
            <button className={btnSecondary} onClick={() => duplicate(s)}>Duplicar</button>
            <button className={`${btnSecondary} text-red-400`} onClick={() => setToDelete(s)}>Excluir</button>
          </div>
        </article>
      ))}

      {toDelete && (
        <ConfirmDialog
          title="Excluir sessão?"
          message={`"${toDelete.name}" será apagada deste celular.`}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </section>
  );
}
