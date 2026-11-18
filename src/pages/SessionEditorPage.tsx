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
import BlockSheet from '../components/BlockSheet';
import ChoiceGroup from '../components/ChoiceGroup';
import ItemList from '../components/ItemList';
import StepSheet from '../components/StepSheet';
import Stepper from '../components/Stepper';
import { btnSecondary, inputClass, labelClass } from '../components/ui';

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
        <p className="mb-4 text-lg text-neutral-400">Sessão não encontrada.</p>
        <Link to="/sessoes" className={`${btnSecondary} inline-flex items-center`}>‹ Voltar</Link>
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
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <Link to="/sessoes" className="flex min-h-12 items-center text-lg font-semibold text-green-400">
          ‹ Sessões
        </Link>
        <span className="text-lg text-neutral-400">
          Total <strong className="text-2xl text-neutral-100 tabular-nums">{formatClock(blockSeconds(root))}</strong>
        </span>
      </div>

      <div>
        <label className={labelClass} htmlFor="session-name">Nome da sessão</label>
        <input
          id="session-name"
          className={`${inputClass} text-2xl font-bold`}
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
        <span className="text-lg font-semibold text-neutral-300">Repetir a sessão inteira</span>
        <Stepper value={root.repeat} onChange={(repeat) => setRoot({ ...root, repeat })} />
      </div>

      <div>
        <h2 className="mb-1 text-xl font-bold">Passos</h2>
        <p className="mb-3 text-sm text-neutral-400">
          Toque num cartão para editar. Segure e arraste para mudar a ordem ou para colocar dentro ou fora de um bloco.
        </p>
        {root.items.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-neutral-700 p-6 text-center text-lg text-neutral-400">
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className={btnSecondary} onClick={() => setStepEdit({ step: createStep(), parentId: root.id })}>
          + Passo
        </button>
        <button className={btnSecondary} onClick={() => setBlockEdit({ block: createBlock(), parentId: root.id })}>
          + Bloco
        </button>
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
