type CouponCardProps = {
  brandName: string;
  brandSub?: string;
  logoText: string;
  reward: string; // "25% OFF en tu primera compra"
  couponCode?: string | null;
  expiresAt?: Date | null;
  used: boolean;
  who?: string;
};

export function CouponCard({
  brandName,
  brandSub,
  logoText,
  reward,
  couponCode,
  expiresAt,
  used,
  who,
}: CouponCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius)] border border-ink">
      {used && (
        <div className="bg-ink px-3 py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-paper">
          Cupón ya utilizado
        </div>
      )}

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
          Cupón
        </span>
      </div>

      <hr className="border-t border-dashed border-ink" />

      <div className={`p-4 ${used ? "opacity-50" : ""}`}>
        <p className="font-display text-3xl font-semibold leading-tight">
          {reward}
        </p>
        {couponCode && (
          <p className="mt-3 inline-block border border-dashed border-ink px-3 py-1.5 font-mono text-lg font-bold tracking-[0.16em]">
            {couponCode}
          </p>
        )}
        <p className="mt-3 font-mono text-[11px] text-faint">
          {expiresAt
            ? `Vence ${expiresAt.toLocaleDateString("es-AR")}`
            : "Sin vencimiento"}{" "}
          · un solo uso
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-line p-4">
        <span className="text-xs text-ink-2">{who}</span>
        <span className="font-mono text-xs tracking-[0.08em]">
          {used ? "usado" : "disponible"}
        </span>
      </div>
    </div>
  );
}
