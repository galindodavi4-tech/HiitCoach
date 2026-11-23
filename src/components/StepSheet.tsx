import { useState } from 'react';
import type { Step, StepKind, StepMode } from '../types';
import { KIND_COLOR, KIND_LABEL, MODE_LABEL } from '../lib/labels';
import BottomSheet from './BottomSheet';
import ChoiceGroup from './ChoiceGroup';
import ConfirmDialog from './ConfirmDialog';
import Switch from './jb/Switch';
import { btnDanger, btnPrimary, btnSecondary, inputClass, labelClass } from './ui';

interface Props {
  step: Step;
  isNew: boolean;
  onSave: (step: Step) => void;
  onDelete: () => void;
  onClose: () => void;
}

const KINDS: StepKind[] = ['prep', 'work', 'rest', 'cooldown'];
const MODES: StepMode[] = ['time', 'reps', 'manual'];

export default function StepSheet({ step, isNew, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(step.name);
  const [kind, setKind] = useState<StepKind>(step.kind);
  const [mode, setMode] = useState<StepMode>(step.mode);
  const [minutes, setMinutes] = useState(String(Math.floor((step.seconds ?? 0) / 60)));
  const [seconds, setSeconds] = useState(String((step.seconds ?? 0) % 60));
  const [reps, setReps] = useState(String(step.reps ?? 10));
  const [notes, setNotes] = useState(step.notes ?? '');
  const [voiceCue, setVoiceCue] = useState(step.voiceCue ?? '');
  const [customColor, setCustomColor] = useState(!!step.color);
  const [color, setColor] = useState(step.color ?? KIND_COLOR[step.kind]);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  function save() {
    const total = (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
    const repsCount = parseInt(reps) || 0;
    if (!name.trim()) return setError('Dê um nome ao passo.');
    if (mode === 'reps' && repsCount <= 0) return setError('Informe quantas repetições.');
    if (mode !== 'manual' && total <= 0) {
      return setError(mode === 'reps' ? 'Informe o tempo estimado.' : 'Informe a duração.');
    }

    const out: Step = { type: 'step', id: step.id, name: name.trim(), kind, mode };
    if (mode !== 'manual') out.seconds = total;
    if (mode === 'reps') out.reps = repsCount;
    if (notes.trim()) out.notes = notes.trim();
    if (voiceCue.trim()) out.voiceCue = voiceCue.trim();
    if (customColor) out.color = color;
    onSave(out);
  }

  return (
    <BottomSheet title={isNew ? 'Novo passo' : 'Editar passo'} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div>
          <label className={labelClass} htmlFor="step-name">Nome</label>
          <input id="step-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <span className={labelClass}>Tipo</span>
          <ChoiceGroup
            options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k], color: KIND_COLOR[k] }))}
            value={kind}
            onChange={setKind}
          />
        </div>

        <div>
          <span className={labelClass}>Modo</span>
          <ChoiceGroup
            options={MODES.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
            value={mode}
            onChange={setMode}
            columns={3}
          />
        </div>

        {mode === 'reps' && (
          <div>
            <label className={labelClass} htmlFor="step-reps">Repetições</label>
            <input
              id="step-reps"
              type="number"
              inputMode="numeric"
              min={1}
              className={inputClass}
              value={reps}
              onChange={(e) => setReps(e.target.value)}
            />
          </div>
        )}

        {mode !== 'manual' && (
          <div>
            <span className={labelClass}>{mode === 'reps' ? 'Tempo estimado' : 'Duração'}</span>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className={inputClass}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  aria-label="Minutos"
                />
                <span className="text-[15px] font-semibold text-muted">min</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  className={inputClass}
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  aria-label="Segundos"
                />
                <span className="text-[15px] font-semibold text-muted">s</span>
              </label>
            </div>
          </div>
        )}

        {mode === 'manual' && (
          <p className="text-[15px] text-muted">No modo manual, o passo espera você tocar em Concluído.</p>
        )}

        <div>
          <label className={labelClass} htmlFor="step-voice">Frase falada no início (opcional)</label>
          <input
            id="step-voice"
            className={inputClass}
            value={voiceCue}
            placeholder={name || 'Ex.: Sprint de quinze'}
            onChange={(e) => setVoiceCue(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="step-notes">Observações (opcional)</label>
          <textarea
            id="step-notes"
            rows={2}
            className={inputClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-line-subtle bg-sunken p-4">
          <Switch
            label="Cor personalizada"
            description="Por padrão, a cor vem do tipo do passo."
            checked={customColor}
            onChange={setCustomColor}
          />
          {customColor && (
            <label className="flex items-center justify-between gap-3">
              <span className="jb-eyebrow jb-eyebrow--muted">Cor</span>
              <input
                type="color"
                className="h-11 w-16 cursor-pointer rounded-md border border-line bg-[var(--surface-input)] p-1"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Cor"
              />
            </label>
          )}
        </div>

        {error && (
          <p className="rounded-md border border-[var(--border-accent-soft)] bg-[var(--jb-crimson-wash)] px-3.5 py-3 text-[15px] font-semibold text-[var(--jb-magenta-300)]">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button className={btnPrimary} onClick={save}>Salvar</button>
        </div>
        {!isNew && (
          <button className={btnDanger} onClick={() => setConfirmDelete(true)}>Excluir passo</button>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Excluir passo?"
          message={`"${step.name}" será removido.`}
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </BottomSheet>
  );
}
