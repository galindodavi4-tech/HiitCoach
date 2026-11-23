import { btnPrimary, btnSecondary } from './ui';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-overlay)] px-6"
      onClick={onCancel}
    >
      <div
        className="jb-reveal w-full max-w-sm rounded-[var(--radius-xl)] border border-line-subtle bg-card p-5"
        style={{ boxShadow: 'var(--elev-popover)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="jb-display jb-display--condensed mb-3 text-[30px]">{title}</h2>
        {message && <p className="mb-5 text-[16px] text-secondary">{message}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button className={btnSecondary} onClick={onCancel}>Cancelar</button>
          <button className={btnPrimary} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
