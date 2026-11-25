"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createStaff, type FormResult } from "./actions";
import { Field, buttonCls } from "@/components/ui";

export function NewStaff() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormResult, FormData>(
    createStaff,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      formRef.current?.reset();
    }
  }, [state]);

  if (!open) {
    return (
      <button className={buttonCls("spot")} onClick={() => setOpen(true)}>
        + Nuevo empleado
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4">
      <div className="w-full max-w-md border border-ink bg-paper p-6">
        <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
          <h2 className="font-display text-xl font-semibold">Nuevo empleado</h2>
          <button
            onClick={() => setOpen(false)}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint hover:text-spot"
          >
            Cerrar
          </button>
        </div>
        <form ref={formRef} action={action} className="flex flex-col gap-5">
          <Field label="Nombre" name="name" required />
          <Field label="Email" name="email" type="email" required />
          <Field
            label="Contraseña (8+)"
            name="password"
            type="password"
            minLength={8}
            required
          />
          <p className="text-[12px] text-faint">
            El empleado podrá entrar al scanner con este email y contraseña.
          </p>
          {state?.error && <p className="text-sm text-spot">{state.error}</p>}
          <button disabled={pending} className={`${buttonCls("spot")} mt-1`}>
            {pending ? "Creando…" : "Crear empleado"}
          </button>
        </form>
      </div>
    </div>
  );
}
