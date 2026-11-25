"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createCustomer, type FormResult } from "./actions";
import { Field, buttonCls } from "@/components/ui";

type ProgramOption = { id: string; name: string };

export function NewCustomer({ programs }: { programs: ProgramOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormResult, FormData>(
    createCustomer,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  if (!open) {
    return (
      <button className={buttonCls("spot")} onClick={() => setOpen(true)}>
        + Nuevo cliente
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4">
      <div className="w-full max-w-md border border-ink bg-paper p-6">
        <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
          <h2 className="font-display text-xl font-semibold">Nuevo cliente</h2>
          <button
            onClick={() => {
              setOpen(false);
            }}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint hover:text-spot"
          >
            Cerrar
          </button>
        </div>

        {state?.ok ? (
          <div className="py-4 text-center">
            <p className="text-sm text-ink-2">Cliente creado. Su código es:</p>
            <p className="my-3 font-mono text-3xl font-bold tracking-[0.12em]">
              #{state.code}
            </p>
            <p className="mb-5 text-[13px] text-faint">
              Ya puede sumar sellos desde el scanner.
            </p>
            <button
              className={buttonCls("ghost")}
              onClick={() => setOpen(false)}
            >
              Listo
            </button>
          </div>
        ) : (
          <form ref={formRef} action={action} className="flex flex-col gap-5">
            <Field label="Nombre" name="name" required placeholder="Sofía Martínez" />
            <Field label="Teléfono (opcional)" name="phone" placeholder="280 415-2290" />
            <label className="block">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                Programa
              </span>
              <select
                name="programId"
                className="w-full border-0 border-b border-ink bg-transparent py-2 text-[15px] outline-none focus:border-spot"
              >
                <option value="">— Sin inscribir —</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {state?.error && <p className="text-sm text-spot">{state.error}</p>}
            <button disabled={pending} className={`${buttonCls("spot")} mt-1`}>
              {pending ? "Creando…" : "Crear cliente"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
