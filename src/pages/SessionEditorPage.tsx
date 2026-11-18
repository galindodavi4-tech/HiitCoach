import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Block, Session, Step } from '../types';
import { getSession, saveSession } from '../lib/storage';
import { CATEGORIES, CATEGORY_LABEL } from '../lib/labels';
import {
  addToBlock,
  blockSeconds,
  createBlock,
  createStep,
  formatClock,
  removeItem,
  replaceItem,
} from '../lib/session';
import { unlockAudio } from '../lib/cues';
import BlockSheet from '../components/BlockSheet';
import ChoiceGroup from '../components/ChoiceGroup';
import ItemList from '../components/ItemList';
import StepSheet from '../components/StepSheet';
import Stepper from '../components/Stepper';
import Eyebrow from '../components/pulso/Eyebrow';
import { btnPrimary, btnSecondary, inputClass, labelClass } from '../components/ui';
import { ChevronLeft, Play, Plus } from 'lucide-react';

// parentId is set only for a new item that has not been added yet
type StepEdit = { step: Step; parentId: string | null };
type BlockEdit = { block: Block; parentId: string | null };

export default function SessionEditorPage() {
  const { id } = useParams();
  const [session, setSession] = useState<Session | undefined>(() => (id ? getSession(id) : undefined));
  const [stepEdit, setStepEdit] = useState<StepEdit | null>(null);
  const [blockEdit, setBlockEdit] = useState<BlockEdit | null>(null);

  if (!session) {
    return (
      <section>
        <p className="mb-4 text-[15px] text-muted">Sessão não encontrada.</p>
        <Link to="/sessoes" className={btnSecondary}>
          <ChevronLeft size={17} strokeWidth={2} /> Voltar
        </Link>
      </section>
    );
  }

  function update(changes: Partial<Session>) {
    if (!session) return;
    const next = { ...session, ...changes, updatedAt: new Date().toISOString() };
    saveSession(next);
    setSession(next);
  }

  const root = session.root;
  const setRoot = (next: Block) => update({ root: next });

  function saveStep(step: Step) {
    if (!stepEdit) return;
    setRoot(stepEdit.parentId ? addToBlock(root, stepEdit.parentId, step) : replaceItem(root, step));
    setStepEdit(null);
  }

  function saveBlock(block: Block) {
    if (!blockEdit) return;
    setRoot(blockEdit.parentId ? addToBlock(root, blockEdit.parentId, block) : replaceItem(root, block));
    setBlockEdit(null);
  }

  function deleteItem(itemId: string) {
    setRoot(removeItem(root, itemId));
    setStepEdit(null);
    setBlockEdit(null);
  }

  return (
    <section className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-3">
        <Link to="/sessoes" className="-ml-2 flex min-h-11 items-center gap-1 pr-2 text-[14px] font-semibold text-accent">
          <ChevronLeft size={20} strokeWidth={2} /> Sessões
        </Link>
        <span className="flex items-baseline gap-2">
          <span className="p-label">Total</span>
          <span className="p-num text-[22px]">{formatClock(blockSeconds(root))}</span>
        </span>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className={labelClass} htmlFor="session-name">Nome da sessão</label>
          <input
            id="session-name"
            className={`${inputClass} font-display text-[18px] font-semibold tracking-[-0.02em]`}
            value={session.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>

        <div>
          <span className={labelClass}>Categoria</span>
          <ChoiceGroup
            options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
            value={session.category}
            onChange={(category) => update({ category })}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-medium text-secondary">Repetir a sessão inteira</span>
          <Stepper value={root.repeat} unit="×" onChange={(repeat) => setRoot({ ...root, repeat })} />
        </div>
      </div>

      <Link
        to={`/rodar/${session.id}`}
        onClick={unlockAudio}
        className={`${btnPrimary} p-btn-lg w-full`}
      >
        <Play size={19} strokeWidth={2} fill="currentColor" /> Iniciar sessão
      </Link>

      <div className="flex flex-col gap-3">
        <Eyebrow tone="volt" trailing={`${root.items.length} itens`}>Passos</Eyebrow>
        <p className="text-[13px] text-muted">
          Toque num cartão para editar. Segure e arraste para mudar a ordem ou para colocar dentro ou fora de um bloco.
        </p>
        {root.items.length === 0 ? (
          <p className="rounded-md border border-dashed border-line-strong p-6 text-center text-[14px] text-muted">
            Nenhum passo ainda. Use os botões abaixo.
          </p>
        ) : (
          <ItemList
            root={root}
            onChange={setRoot}
            onEditStep={(step) => setStepEdit({ step, parentId: null })}
            onEditBlock={(block) => setBlockEdit({ block, parentId: null })}
            onAddStep={(blockId) => setStepEdit({ step: createStep(), parentId: blockId })}
            onAddBlock={(blockId) => setBlockEdit({ block: createBlock(), parentId: blockId })}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <button className={btnSecondary} onClick={() => setStepEdit({ step: createStep(), parentId: root.id })}>
            <Plus size={17} strokeWidth={2} /> Passo
          </button>
          <button className={btnSecondary} onClick={() => setBlockEdit({ block: createBlock(), parentId: root.id })}>
            <Plus size={17} strokeWidth={2} /> Bloco
          </button>
        </div>
      </div>
      {stepEdit && (
        <StepSheet
          step={stepEdit.step}
          isNew={stepEdit.parentId !== null}
          onSave={saveStep}
          onDelete={() => deleteItem(stepEdit.step.id)}
          onClose={() => setStepEdit(null)}
        />
      )}
      {blockEdit && (
        <BlockSheet
          block={blockEdit.block}
          isNew={blockEdit.parentId !== null}
          onSave={saveBlock}
          onDelete={() => deleteItem(blockEdit.block.id)}
          onClose={() => setBlockEdit(null)}
        />
      )}
    </section>
  );
}
