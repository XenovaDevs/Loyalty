"use client";

import { useState, useTransition } from "react";
import { StampMark } from "@/components/stamp-mark";
import { buttonCls } from "@/components/ui";
import {
  lookupCustomer,
  addStamp,
  redeemReward,
  useCoupon,
  revertCoupon,
  sendTestPush,
  type ScanResult,
  type ScanMembership,
} from "./actions";

export function Scanner() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function onTestPush() {
    if (!result?.found) return;
    const target = result.code;
    setTestMsg(null);
    start(async () => {
      const r = await sendTestPush(target);
      setTestMsg({ ok: r.ok, text: r.message });
    });
  }

  function run(fn: () => Promise<ScanResult>, note?: string) {
    start(async () => {
      const r = await fn();
      setResult(r);
      if (note && r.found) setMsg(note);
    });
  }

  function onLookup(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setTestMsg(null);
    run(() => lookupCustomer(code));
  }

  return (
    <div className="mt-8 grid max-w-xl gap-6">
      <form onSubmit={onLookup} className="flex items-end gap-3">
        <label className="min-w-0 flex-1">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            Código del cliente
          </span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="A4F9-21KX"
            autoFocus
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            className="w-full border-0 border-b border-ink bg-transparent py-2 font-mono text-lg tracking-[0.1em] outline-none focus:border-spot"
          />
        </label>
        <button disabled={pending || !code} className={`${buttonCls("ink")} shrink-0`}>
          Buscar
        </button>
      </form>

      {result?.found === false && (
        <p className="border border-line p-4 text-sm text-ink-2">
          No encontramos ningún cliente con ese código en tu comercio.
        </p>
      )}

      {result?.found && (
        <div className="border border-ink">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line p-4">
            <div className="min-w-0">
              <div className="font-display text-xl font-semibold leading-snug">
                {result.customerName}
              </div>
              <span className="whitespace-nowrap font-mono text-xs text-faint">
                #{result.code}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                disabled={pending}
                onClick={onTestPush}
                className="whitespace-nowrap rounded-[var(--radius)] border border-ink px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] disabled:opacity-60 hover:bg-paper-2"
              >
                Probar aviso
              </button>
            </div>
          </div>

          {testMsg && (
            <p
              className={`border-b border-line px-4 py-2.5 text-[13px] ${
                testMsg.ok ? "text-spot" : "text-ink-2"
              }`}
            >
              {testMsg.ok ? "✓ " : "⚠ "}
              {testMsg.text}
            </p>
          )}

          {result.memberships.length === 0 && (
            <p className="p-4 text-sm text-ink-2">
              Este cliente no está inscripto en ningún programa.
            </p>
          )}

          {result.memberships.map((m) => (
            <MembershipRow
              key={m.id}
              m={m}
              pending={pending}
              run={run}
            />
          ))}

          {msg && (
            <p className="border-t border-line px-4 py-2.5 font-mono text-[11px] text-spot">
              ✓ {msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MembershipRow({
  m,
  pending,
  run,
}: {
  m: ScanMembership;
  pending: boolean;
  run: (fn: () => Promise<ScanResult>, note?: string) => void;
}) {
  const isStamps = m.type === "STAMPS";
  const isCoupon = m.type === "COUPON";

  return (
    <div className="border-t border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">{m.programName}</span>
        {isStamps ? (
          <span className="font-mono text-sm font-bold text-spot">
            {m.filled}/{m.required}
          </span>
        ) : isCoupon ? (
          <span className="font-mono text-sm font-bold text-spot">
            {m.used ? "usado" : "disponible"}
          </span>
        ) : null}
      </div>

      {isCoupon ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="border border-dashed border-ink px-3 py-1.5 font-mono text-base font-bold tracking-[0.14em]">
            {m.couponCode ?? "—"}
          </span>
          <span className="text-sm text-ink-2">{m.reward}</span>
          {m.used ? (
            <button
              disabled={pending}
              onClick={() => run(() => revertCoupon(m.id), "uso de cupón deshecho")}
              className={buttonCls("ghost")}
            >
              Deshacer uso
            </button>
          ) : (
            <button
              disabled={pending}
              onClick={() => run(() => useCoupon(m.id), "cupón marcado como usado")}
              className={buttonCls("ink")}
            >
              Marcar como usado
            </button>
          )}
        </div>
      ) : isStamps ? (
        <>
          {m.isComplete && (
            <p className="mb-3 bg-spot px-2 py-1 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-paper">
              Premio listo
            </p>
          )}
          <div className="mb-3 flex flex-wrap gap-2">
            {Array.from({ length: m.required }).map((_, i) => {
              const on = i < m.filled;
              return (
                <span
                  key={i}
                  className={`grid size-7 place-items-center rounded-full ${
                    on ? "bg-spot text-paper" : "border border-dashed border-line"
                  }`}
                  style={on ? { transform: `rotate(${(i % 5) - 2}deg)` } : undefined}
                >
                  {on && <StampMark className="size-3.5" />}
                </span>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              disabled={pending}
              onClick={() => run(() => addStamp(m.id, 1), "+1 sello")}
              className={buttonCls("spot")}
            >
              + Sumar 1 sello
            </button>
            <button
              disabled={pending}
              onClick={() => run(() => addStamp(m.id, 2), "+2 sellos")}
              className={buttonCls("ghost")}
            >
              + 2
            </button>
            <button
              disabled={pending || !m.isComplete}
              onClick={() => run(() => redeemReward(m.id), "premio canjeado")}
              className={buttonCls("ink")}
            >
              Canjear premio
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
