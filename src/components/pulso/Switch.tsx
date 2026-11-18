interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

/** On/off toggle with label + description. Volt track and glow when on. */
export default function Switch({ checked, onChange, label, description }: Props) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3.5">
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-medium">{label}</span>
        {description && <span className="text-[13px] text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="h-7 w-[46px] flex-none cursor-pointer rounded-full border-none p-[3px]"
        style={{
          background: checked ? 'var(--surface-accent)' : 'var(--surface-4)',
          boxShadow: checked ? 'var(--glow-volt)' : 'none',
          transition: 'background var(--dur-base) var(--ease-snap)',
        }}
      >
        <span
          className="block h-[22px] w-[22px] rounded-full"
          style={{
            background: checked ? 'var(--text-on-accent)' : 'var(--p-carbon-200)',
            transform: checked ? 'translateX(18px)' : 'none',
            transition: 'transform var(--dur-base) var(--ease-snap)',
          }}
        />
      </button>
    </label>
  );
}
