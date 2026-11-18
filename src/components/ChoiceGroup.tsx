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

export default function ChoiceGroup<T extends string>({ options, value, onChange, columns = 2 }: Props<T>) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const selected = o.value === value;
        const color = o.color ?? '#16A34A';
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`min-h-12 rounded-xl border-2 px-2 text-base font-semibold ${
              selected ? 'text-white' : 'border-neutral-700 bg-neutral-900 text-neutral-300'
            }`}
            style={selected ? { borderColor: color, backgroundColor: color } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
