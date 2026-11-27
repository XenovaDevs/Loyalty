"use client";

import { useState, useTransition } from "react";
import { buttonCls } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { ActionResult } from "./actions";

export type RowAction = {
  label: string;
  /** Server Action ya ligada a sus argumentos (action.bind(null, …)). */
  run: () => Promise<ActionResult>;
  variant?: "spot" | "ink" | "ghost";
  disabled?: boolean;
  /** Si viene, pide confirmación con el diálogo propio antes de ejecutar. */
  confirm?: { title: string; message?: string; confirmLabel: string; danger?: boolean };
};

/** Fila de botones de acción con un único mensaje de resultado. */
export function ActionRow({ actions }: { actions: RowAction[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [asking, setAsking] = useState<RowAction | null>(null);

  function exec(a: RowAction) {
    setMsg(null);
    start(async () => {
      try {
        setMsg(await a.run());
      } catch {
        setMsg({ ok: false, message: "No se pudo. Probá de nuevo." });
      }
      setAsking(null);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2.5">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            disabled={pending || a.disabled}
            onClick={() => (a.confirm ? setAsking(a) : exec(a))}
            className={buttonCls(a.variant ?? "ghost")}
          >
            {a.label}
          </button>
        ))}
      </div>
      {msg && (
        <p className={`mt-2.5 text-[13px] ${msg.ok ? "text-spot" : "text-ink-2"}`} role="status">
          {msg.ok ? "✓ " : "⚠ "}
          {msg.message}
        </p>
      )}
      <ConfirmDialog
        open={asking != null}
        tone={asking?.confirm?.danger ? "danger" : "default"}
        title={asking?.confirm?.title ?? ""}
        message={asking?.confirm?.message}
        confirmLabel={asking?.confirm?.confirmLabel}
        pending={pending}
        onConfirm={() => asking && exec(asking)}
        onCancel={() => setAsking(null)}
      />
    </div>
  );
}
