"use client";

import { useState, useTransition } from "react";
import { removeStaff } from "./actions";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function RemoveStaff({ id, name }: { id: string; name?: string }) {
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState(false);
  return (
    <>
      <button
        disabled={pending}
        onClick={() => setAsk(true)}
        className="rounded-[var(--radius)] border border-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-paper-2 disabled:opacity-50"
      >
        Quitar
      </button>
      <ConfirmDialog
        open={ask}
        tone="danger"
        title={name ? `¿Quitar a ${name}?` : "¿Quitar a este empleado?"}
        message="Pierde el acceso al panel. Los sellos que cargó se mantienen."
        confirmLabel="Sí, quitar"
        pending={pending}
        onConfirm={() =>
          start(async () => {
            await removeStaff(id);
            setAsk(false);
          })
        }
        onCancel={() => setAsk(false)}
      />
    </>
  );
}
