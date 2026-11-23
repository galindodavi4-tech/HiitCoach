interface Option<T extends string> {
  value: T;
  label: string;
  color?: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: number;
}

/** Pill choices: crimson when selected (or the option's own colour), gray otherwise. */
export default function ChoiceGroup<T extends string>({ options, value, onChange, columns = 2 }: Props<T>) {
  return (
    <div role="radiogroup" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const selected = o.value === value;
        const color = o.color ?? 'var(--jb-crimson-500)';
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full px-2.5 font-display text-[13px] font-black tracking-[0.01em] uppercase [font-stretch:85%] transition-colors duration-[140ms]"
            style={
              selected
                ? { background: color, color: '#fff' }
                : { background: 'var(--surface-muted)', color: 'var(--text-secondary)' }
            }
          >
            {o.color && !selected && (
              <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: o.color }} />
            )}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
