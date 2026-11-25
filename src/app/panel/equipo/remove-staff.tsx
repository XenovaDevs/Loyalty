"use client";

import { useTransition } from "react";
import { removeStaff } from "./actions";

export function RemoveStaff({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("¿Quitar a este empleado?")) start(() => removeStaff(id));
      }}
      className="rounded-[var(--radius)] border border-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-paper-2 disabled:opacity-50"
    >
      Quitar
    </button>
  );
}
