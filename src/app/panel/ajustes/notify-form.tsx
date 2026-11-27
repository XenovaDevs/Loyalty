"use client";

import { useActionState, useState } from "react";
import { updateNotify, type FormResult } from "./actions";
import { buttonCls } from "@/components/ui";

type Props = {
  enabled: boolean;
  messages: string[];
  radiusM: number;
  startHour: number | null;
  endHour: number | null;
  hasLocation: boolean;
};

const inputCls =
  "w-full border-0 border-b border-ink bg-transparent py-2 text-base outline-none md:text-[15px] focus:border-spot";
const labelCls =
  "mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-faint";

/**
 * Aviso de cercanía del local: cuando un cliente con la tarjeta abierta pasa
 * cerca, recibe una notificación con uno de estos mensajes (al azar).
 */
export function NotifyForm(initial: Props) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    updateNotify,
    undefined,
  );
  const [enabled, setEnabled] = useState(initial.enabled);

  return (
    <form action={action} className="flex max-w-xl flex-col gap-5">
      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          name="notifyEnabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="size-4 accent-[var(--color-spot)]"
        />
        <span className="font-display text-base font-semibold">
          Avisar cuando un cliente pase cerca
        </span>
      </label>
      {!initial.hasLocation && (
        <p className="-mt-2 text-[12px] text-faint">
          Necesita la ubicación del local (arriba).
        </p>
      )}

      {enabled && (
        <>
          <label className="block">
            <span className={labelCls}>Mensajes (uno por línea · se elige uno al azar)</span>
            <textarea
              name="notifyMessages"
              rows={3}
              defaultValue={initial.messages.join("\n")}
              placeholder={"¡Pasá por un cafecito! ☕\nTenés un premio esperándote\n2x1 solo hoy 👀"}
              className={`${inputCls} resize-y leading-relaxed`}
            />
          </label>

          <label className="block">
            <span className={labelCls}>Radio del aviso (metros)</span>
            <input
              type="number"
              name="notifyRadiusM"
              min={20}
              max={5000}
              defaultValue={initial.radiusM}
              className={inputCls}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className={labelCls}>Desde (hora, opcional)</span>
              <input
                type="number"
                name="notifyStartHour"
                min={0}
                max={23}
                defaultValue={initial.startHour ?? ""}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Hasta (hora, opcional)</span>
              <input
                type="number"
                name="notifyEndHour"
                min={0}
                max={23}
                defaultValue={initial.endHour ?? ""}
                className={inputCls}
              />
            </label>
          </div>
          <p className="-mt-2 text-[12px] text-faint">
            Sin franja, avisa en el horario del local. Funciona con la tarjeta
            abierta en el teléfono (aunque sea en segundo plano), como mucho un
            aviso cada 2 horas.
          </p>
        </>
      )}

      {state?.error && <p className="text-sm text-spot">{state.error}</p>}
      {state?.ok && <p className="text-sm text-spot">✓ Aviso guardado.</p>}
      <button disabled={pending} className={buttonCls("spot")}>
        {pending ? "Guardando…" : "Guardar aviso"}
      </button>
    </form>
  );
}
