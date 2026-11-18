import { btnDanger, btnSecondary } from './ui';

interface Props {
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel = 'Excluir', onConfirm, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,6,7,.72)] px-6"
      onClick={onCancel}
    >
      <div
        className="p-sheet w-full max-w-sm rounded-lg border border-line bg-surface-2 p-5"
        style={{ boxShadow: 'var(--shadow-pop)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="p-display mb-2 text-[20px] leading-[1.15]">{title}</h2>
        {message && <p className="mb-5 text-[15px] text-secondary">{message}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button className={btnSecondary} onClick={onCancel}>Cancelar</button>
          <button className={btnDanger} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
