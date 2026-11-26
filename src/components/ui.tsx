// Primitivos compartidos del sistema Papel & Tinta.

export function PageHeader({
  kicker,
  title,
  action,
}: {
  kicker: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-ink pb-4">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-spot">
          {kicker}
        </p>
        <h1 className="font-display text-[1.75rem] font-semibold leading-tight md:text-3xl">{title}</h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-none border-0 border-b border-ink bg-transparent py-2 text-base outline-none focus:border-spot md:text-[15px]"
      />
    </label>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "spot" | "ink";
}) {
  const cls =
    tone === "spot"
      ? "border-spot text-spot"
      : tone === "ink"
        ? "border-ink text-ink"
        : "border-line text-ink-2";
  return (
    <span
      className={`rounded-[2px] border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] ${cls}`}
    >
      {children}
    </span>
  );
}

export function buttonCls(
  variant: "spot" | "ink" | "ghost" = "spot",
): string {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] px-4 py-2.5 text-sm font-semibold disabled:opacity-60";
  if (variant === "spot") return `${base} border border-spot bg-spot text-paper`;
  if (variant === "ink") return `${base} border border-ink bg-ink text-paper`;
  return `${base} border border-ink text-ink hover:bg-paper-2`;
}
