type PointsCardProps = {
  brandName: string;
  brandSub?: string;
  logoText: string;
  reward: React.ReactNode;
  points: number;
  who?: string;
  code: string;
};

export function PointsCard({
  brandName,
  brandSub,
  logoText,
  reward,
  points,
  who,
  code,
}: PointsCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius)] border border-ink">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-[var(--radius)] border border-ink font-display text-lg font-semibold">
            {logoText}
          </div>
          <div>
            <div className="font-display text-base font-semibold leading-tight">
              {brandName}
            </div>
            {brandSub && <div className="text-[11px] text-faint">{brandSub}</div>}
          </div>
        </div>
        <span className="rounded-[2px] border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-2">
          Puntos
        </span>
      </div>

      <hr className="border-t border-dashed border-ink" />

      <div className="p-4">
        <p className="font-display text-xl font-semibold">{reward}</p>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-mono text-5xl font-bold leading-none">
            {points.toLocaleString("es-AR")}
          </span>
          <span className="text-sm text-faint">puntos acumulados</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line p-4">
        <span className="text-xs text-ink-2">{who}</span>
        <span className="font-mono text-xs tracking-[0.08em]">{code}</span>
      </div>
    </div>
  );
}
