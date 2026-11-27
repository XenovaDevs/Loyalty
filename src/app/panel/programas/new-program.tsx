"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createProgram, type FormResult } from "./actions";
import { Field, buttonCls } from "@/components/ui";

type ProgramKind = "STAMPS" | "COUPON";

const TABS: { key: ProgramKind; label: string }[] = [
  { key: "STAMPS", label: "Sellos" },
  { key: "COUPON", label: "Cupón" },
];

export function NewProgram() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ProgramKind>("STAMPS");
  const [state, action, pending] = useActionState<FormResult, FormData>(
    createProgram,
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
        + Nuevo programa
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto border border-ink bg-paper p-5 sm:p-6">
        <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
          <h2 className="font-display text-xl font-semibold">Nuevo programa</h2>
          <button
            onClick={() => setOpen(false)}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint hover:text-spot"
          >
            Cerrar
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 border border-ink">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              className={`py-2.5 text-sm font-semibold ${
                type === t.key ? "bg-spot text-paper" : "text-ink-2"
              } ${i < TABS.length - 1 ? "border-r border-ink" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form ref={formRef} action={action} className="flex flex-col gap-5">
          <input type="hidden" name="type" value={type} />
          <Field
            label="Nombre interno"
            name="name"
            required
            placeholder={type === "STAMPS" ? "Tarjeta pote" : "Cupón bienvenida"}
          />
          <Field
            label={type === "COUPON" ? "Descripción (lo ve el cliente)" : "Premio / descripción"}
            name="rewardText"
            required
            placeholder={
              type === "STAMPS" ? "Comprá 10, el 11 es nuestro" : "25% OFF en tu primera compra"
            }
          />

          {type === "STAMPS" && (
            <>
              <Field
                label="Sellos para el premio"
                name="stampsRequired"
                type="number"
                min={2}
                max={20}
                defaultValue={10}
              />
              <p className="-mt-2 text-[12px] text-faint">
                El cliente suma 1 sello por día escaneando el QR del local
                (Ajustes). Solo puede haber una tarjeta de sellos activa.
              </p>
            </>
          )}

          {type === "COUPON" && (
            <>
              <Field
                label="Código del cupón"
                name="couponCode"
                placeholder="BIENVENIDA25"
              />
              <Field
                label="Vence (opcional)"
                name="couponExpiresAt"
                type="date"
              />
              <p className="-mt-2 text-[12px] text-faint">
                Se entrega automáticamente a cada cliente nuevo y es de un solo
                uso (cupón de bienvenida).
              </p>
            </>
          )}

          {state?.error && <p className="text-sm text-spot">{state.error}</p>}
          <button disabled={pending} className={`${buttonCls("spot")} mt-1`}>
            {pending ? "Creando…" : "Crear programa"}
          </button>
        </form>
      </div>
    </div>
  );
}
