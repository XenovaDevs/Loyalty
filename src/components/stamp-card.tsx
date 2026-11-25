import { StampMark } from "./stamp-mark";

type StampCardProps = {
  brandName: string;
  brandSub?: string;
  logoText: string;
  reward: React.ReactNode;
  filled: number;
  required: number;
  who?: string;
  code: string;
  complete?: boolean;
};

// Rotaciones fijas por índice: los sellos salen "estampados a mano", no perfectos.
const ROT = [-6, 4, -3, 7, -5, 3, -4, 5, -2, 6];

export function StampCard({
  brandName,
  brandSub,
  logoText,
  reward,
  filled,
  required,
  who,
  code,
  complete,
}: StampCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius)] border border-ink">
      {complete && (
        <div className="bg-spot px-3 py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-paper">
          Premio listo — mostrá este código
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
          Sellos
        </span>
      </div>

      <hr className="border-t border-dashed border-ink" />

      <div className="p-4">
        <p className="font-display text-xl font-semibold">{reward}</p>
        <p className="mb-4 mt-0.5 font-mono text-xs text-faint">
          {complete
            ? `${required} / ${required} · completa`
            : `${filled} / ${required} · faltan ${required - filled}`}
        </p>

        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: required }).map((_, i) => {
            const on = i < filled;
            const next = i === filled && !complete;
            return (
              <div
                key={i}
                className="grid aspect-square place-items-center rounded-full"
                style={{ gridColumn: "span 1" }}
              >
                {on ? (
                  <span
                    className="stamp-grain relative grid size-full place-items-center rounded-full bg-spot text-paper"
                    style={{ transform: `rotate(${ROT[i % ROT.length]}deg)` }}
                  >
                    <StampMark className="size-1/2 opacity-90" />
                  </span>
                ) : next ? (
                  <span className="grid size-full place-items-center rounded-full border border-spot font-mono text-xs font-bold text-spot">
                    {i + 1}
                  </span>
                ) : (
                  <span className="grid size-full place-items-center rounded-full border border-dashed border-line font-mono text-xs text-line">
                    {i + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line p-4">
        <span className="text-xs text-ink-2">{who}</span>
        <span className="font-mono text-xs tracking-[0.08em]">{code}</span>
      </div>
    </div>
  );
}
