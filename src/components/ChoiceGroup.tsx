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

/** Mono segmented choice. Options with a colour show it as a dot and a tinted selected state. */
export default function ChoiceGroup<T extends string>({ options, value, onChange, columns = 2 }: Props<T>) {
  return (
    <div
      role="radiogroup"
      className="grid gap-1 rounded-md border border-line-subtle bg-sunken p-1"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const selected = o.value === value;
        const color = o.color ?? 'var(--p-volt-500)';
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-sm px-2 font-mono text-[11px] font-medium tracking-[0.1em] uppercase transition-colors duration-[140ms]"
            style={
              selected
                ? {
                    background: `color-mix(in oklab, ${color} 12%, var(--surface-3))`,
                    boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 55%, transparent)`,
                    color: 'var(--text-primary)',
                  }
                : { color: 'var(--text-muted)' }
            }
          >
            {o.color && (
              <span
                className="h-2 w-2 flex-none rounded-full"
                style={{ background: o.color, boxShadow: selected ? `0 0 8px ${o.color}` : 'none' }}
              />
            )}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
