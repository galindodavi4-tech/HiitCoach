interface Props {
  value: number;
  min?: number;
  onChange: (value: number) => void;
}

export default function Stepper({ value, min = 1, onChange }: Props) {
  const btn = 'h-12 w-14 rounded-xl bg-neutral-800 text-2xl font-bold active:scale-95';
  return (
    <div className="flex items-center gap-3">
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} aria-label="Diminuir">
        −
      </button>
      <span className="min-w-12 text-center text-2xl font-bold tabular-nums">{value}</span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} aria-label="Aumentar">
        +
      </button>
    </div>
  );
}
