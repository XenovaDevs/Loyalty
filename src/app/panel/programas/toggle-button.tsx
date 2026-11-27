"use client";

import { useState, useTransition } from "react";
import { toggleProgram } from "./actions";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function ToggleButton({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await toggleProgram(id);
            if (r?.error) setError(r.error);
          })
        }
        className="rounded-[var(--radius)] border border-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-paper-2 disabled:opacity-50"
      >
        {active ? "Pausar" : "Activar"}
      </button>
      <ConfirmDialog
        open={error != null}
        title="No se pudo activar"
        message={error}
        confirmLabel="Entendido"
        cancelLabel={null}
        onConfirm={() => setError(null)}
        onCancel={() => setError(null)}
      />
    </>
  );
}
