"use client";

import { useTransition } from "react";
import { toggleProgram } from "./actions";

export function ToggleButton({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await toggleProgram(id);
          if (r?.error) alert(r.error);
        })
      }
      className="rounded-[var(--radius)] border border-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-paper-2 disabled:opacity-50"
    >
      {active ? "Pausar" : "Activar"}
    </button>
  );
}
