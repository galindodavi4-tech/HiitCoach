interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

/** Pill toggle with label + description. Crimson track when on. */
export default function Switch({ checked, onChange, label, description }: Props) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-4">
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[18px] font-bold">{label}</span>
        {description && <span className="text-[14px] text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="h-8 w-14 flex-none cursor-pointer rounded-full border-none p-1"
        style={{
          background: checked ? 'var(--surface-accent)' : 'var(--surface-muted)',
          transition: 'background var(--duration-fast) var(--ease-standard)',
        }}
      >
        <span
          className="block h-6 w-6 rounded-full bg-white"
          style={{
            transform: checked ? 'translateX(24px)' : 'none',
            transition: 'transform var(--duration-base) var(--ease-standard)',
          }}
        />
      </button>
    </label>
  );
}
