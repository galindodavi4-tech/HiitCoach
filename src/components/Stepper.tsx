import { Minus, Plus } from 'lucide-react';

interface Props {
  value: number;
  min?: number;
  unit?: string;
  onChange: (value: number) => void;
}

/** Big-number −/+ input. */
export default function Stepper({ value, min = 1, unit, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-line bg-sunken p-1">
      <button
        type="button"
        className="p-icon-btn p-icon-btn-ghost"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Diminuir"
      >
        <Minus size={19} strokeWidth={2} />
      </button>
      <span className="flex min-w-14 items-baseline justify-center gap-1">
        <span className="p-num text-[24px]">{value}</span>
        {unit && <span className="p-unit">{unit}</span>}
      </span>
      <button type="button" className="p-icon-btn p-icon-btn-ghost" onClick={() => onChange(value + 1)} aria-label="Aumentar">
        <Plus size={19} strokeWidth={2} />
      </button>
    </div>
  );
}
