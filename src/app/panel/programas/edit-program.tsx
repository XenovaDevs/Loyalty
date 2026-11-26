"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateProgram, type FormResult } from "./actions";
import { Field, buttonCls } from "@/components/ui";
import { NotifyFields } from "./notify-fields";

type Props = {
  id: string;
  type: string;
  name: string;
  rewardText: string;
  stampsRequired: number | null;
  pointsPerVisit: number | null;
  couponCode: string | null;
  couponExpiresAt: string | null; // yyyy-mm-dd
  notifyEnabled: boolean;
  notifyMessages: string[];
  notifyRadiusM: number | null;
  notifyStartHour: number | null;
  notifyEndHour: number | null;
};

export function EditProgram(p: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormResult, FormData>(
    updateProgram,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius)] border border-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-paper-2"
      >
        Editar
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto border border-ink bg-paper p-5 sm:p-6">
        <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
          <h2 className="font-display text-xl font-semibold">Editar programa</h2>
          <button
            onClick={() => setOpen(false)}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint hover:text-spot"
          >
            Cerrar
          </button>
        </div>
        <form ref={formRef} action={action} className="flex flex-col gap-5">
          <input type="hidden" name="id" value={p.id} />
          <Field label="Nombre interno" name="name" defaultValue={p.name} required />
          <Field
            label={p.type === "COUPON" ? "Descripción (lo ve el cliente)" : "Premio / descripción"}
            name="rewardText"
            defaultValue={p.rewardText}
            required
          />

          {p.type === "STAMPS" && (
            <Field
              label="Sellos para el premio"
              name="stampsRequired"
              type="number"
              min={2}
              max={20}
              defaultValue={p.stampsRequired ?? 10}
            />
          )}
          {p.type === "VISIT" && (
            <Field
              label="Puntos por visita"
              name="pointsPerVisit"
              type="number"
              min={1}
              max={1000}
              defaultValue={p.pointsPerVisit ?? 10}
            />
          )}
          {p.type === "COUPON" && (
            <>
              <Field
                label="Código del cupón"
                name="couponCode"
                defaultValue={p.couponCode ?? ""}
              />
              <Field
                label="Vence (opcional)"
                name="couponExpiresAt"
                type="date"
                defaultValue={p.couponExpiresAt ?? ""}
              />
            </>
          )}

          <NotifyFields
            defaultEnabled={p.notifyEnabled}
            defaultMessages={p.notifyMessages}
            defaultRadiusM={p.notifyRadiusM}
            defaultStartHour={p.notifyStartHour}
            defaultEndHour={p.notifyEndHour}
          />

          {state?.error && <p className="text-sm text-spot">{state.error}</p>}
          <button disabled={pending} className={`${buttonCls("spot")} mt-1`}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
