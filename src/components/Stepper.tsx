import { Minus, Plus } from 'lucide-react';

interface Props {
  value: number;
  min?: number;
  unit?: string;
  onChange: (value: number) => void;
}

/** Display-numeral −/+ input with round gray buttons. */
export default function Stepper({ value, min = 1, unit, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        className="jb-icon-btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Diminuir"
      >
        <Minus size={20} strokeWidth={2.4} />
      </button>
      <span className="flex min-w-14 items-baseline justify-center gap-0.5">
        <span className="jb-num text-[28px]">{value}</span>
        {unit && <span className="text-[15px] font-semibold text-muted">{unit}</span>}
      </span>
      <button type="button" className="jb-icon-btn" onClick={() => onChange(value + 1)} aria-label="Aumentar">
        <Plus size={20} strokeWidth={2.4} />
      </button>
    </div>
  );
}
