import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Session } from '../types';
import { deleteSession, loadSessions, saveSession } from '../lib/storage';
import { CATEGORY_LABEL } from '../lib/labels';
import { blockSeconds, createSession, duplicateSession, formatClock } from '../lib/session';
import { TEMPLATES, sessionFromTemplate } from '../lib/templates';
import { exportSession, importSessionFile } from '../lib/share';
import { unlockAudio } from '../lib/cues';
import ConfirmDialog from '../components/ConfirmDialog';
import { btnPrimary, btnSecondary } from '../components/ui';

function loadSorted(): Session[] {
  return loadSessions().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

interface Notice {
  ok: boolean;
  text: string;
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [sessions, setSessions] = useState(loadSorted);
  const [toDelete, setToDelete] = useState<Session | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  function create() {
    const session = createSession();
    saveSession(session);
    navigate(`/sessoes/${session.id}`);
  }

  function copyTemplate(template: Session) {
    const session = sessionFromTemplate(template);
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

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be picked again
    if (!file) return;
    try {
      const session = await importSessionFile(file);
      saveSession(session);
      setSessions(loadSorted());
      setNotice({ ok: true, text: `"${session.name}" foi importada.` });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : 'Não foi possível importar.' });
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Sessões</h1>

      <h2 className="text-xl font-bold text-neutral-400">Modelos</h2>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
        {TEMPLATES.map((t) => (
          <article key={t.id} className="flex w-64 shrink-0 snap-start flex-col rounded-2xl bg-neutral-900 p-4">
            <h3 className="mb-1 text-xl font-bold leading-tight">{t.name}</h3>
            <div className="mb-3 flex items-center justify-between text-lg text-neutral-400">
              <span className="rounded-full bg-neutral-800 px-3 py-0.5 text-base">{CATEGORY_LABEL[t.category]}</span>
              <span className="font-bold text-neutral-100 tabular-nums">{formatClock(blockSeconds(t.root))}</span>
            </div>
            <button className={`${btnSecondary} mt-auto`} onClick={() => copyTemplate(t)}>
              Usar modelo
            </button>
          </article>
        ))}
      </div>

      <h2 className="mt-2 text-xl font-bold text-neutral-400">Minhas sessões</h2>

      <div className="grid grid-cols-2 gap-2">
        <button className={`${btnPrimary} min-h-14 text-xl`} onClick={create}>
          + Nova
        </button>
        <button className={`${btnSecondary} min-h-14 text-xl`} onClick={() => fileInput.current?.click()}>
          Importar
        </button>
      </div>
      <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={onImport} />

      {notice && (
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 text-lg ${
            notice.ok ? 'bg-green-950 text-green-200' : 'bg-red-950 text-red-200'
          }`}
        >
          <p className="flex-1">{notice.text}</p>
          <button className="min-h-12 min-w-12 text-2xl" aria-label="Fechar aviso" onClick={() => setNotice(null)}>
            ✕
          </button>
        </div>
      )}

      {sessions.length === 0 && (
        <p className="text-lg text-neutral-400">Você ainda não tem sessões. Crie uma ou use um modelo!</p>
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
          <div className="grid grid-cols-2 gap-2">
            <Link to={`/sessoes/${s.id}`} className={`${btnSecondary} flex items-center justify-center`}>
              Abrir
            </Link>
            <button className={btnSecondary} onClick={() => duplicate(s)}>Duplicar</button>
            <button className={btnSecondary} onClick={() => exportSession(s)}>Exportar</button>
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
