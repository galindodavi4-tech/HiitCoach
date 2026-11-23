interface Props {
  value: string | number;
  label: string;
  size?: number;
  accent?: boolean;
  align?: 'left' | 'right' | 'center';
}

/** Big display numeral over a low-contrast label. */
export default function StatPair({ value, label, size = 34, accent = false, align = 'left' }: Props) {
  const items = align === 'right' ? 'items-end' : align === 'center' ? 'items-center' : 'items-start';
  return (
    <div className={`flex flex-col gap-0.5 ${items}`}>
      <span className="jb-num" style={{ fontSize: size, color: accent ? 'var(--text-accent)' : undefined }}>
        {value}
      </span>
      <span className="text-[13px] text-muted">{label}</span>
    </div>
  );
}
