"use client";

import { useState } from "react";

type Props = {
  defaultEnabled?: boolean;
  defaultMessages?: string[];
  defaultRadiusM?: number | null;
  defaultStartHour?: number | null;
  defaultEndHour?: number | null;
};

const inputCls =
  "w-full border-0 border-b border-ink bg-transparent py-2 text-[15px] outline-none focus:border-spot";
const labelCls =
  "mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-faint";

/**
 * Config del aviso por cercanía (compartida entre crear y editar programa).
 * Mensajes: uno por línea; el cliente recibe uno al azar en cada aviso.
 */
export function NotifyFields({
  defaultEnabled = false,
  defaultMessages = [],
  defaultRadiusM = null,
  defaultStartHour = null,
  defaultEndHour = null,
}: Props) {
  const [enabled, setEnabled] = useState(defaultEnabled);

  return (
    <fieldset className="border border-line p-4">
      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          name="notifyEnabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="size-4 accent-[var(--color-spot)]"
        />
        <span className="font-display text-base font-semibold">
          Avisar cuando el cliente pase cerca
        </span>
      </label>

      {enabled && (
        <div className="mt-4 flex flex-col gap-5">
          <label className="block">
            <span className={labelCls}>
              Mensajes (uno por línea · se elige uno al azar)
            </span>
            <textarea
              name="notifyMessages"
              rows={3}
              defaultValue={defaultMessages.join("\n")}
              placeholder={"¡Pasá por un cafecito! ☕\nTenés un premio esperándote\n2x1 solo hoy 👀"}
              className={`${inputCls} resize-y leading-relaxed`}
            />
          </label>

          <label className="block">
            <span className={labelCls}>Radio del aviso en metros (opcional)</span>
            <input
              type="number"
              name="notifyRadiusM"
              min={10}
              max={5000}
              defaultValue={defaultRadiusM ?? ""}
              placeholder="Usa el radio del comercio"
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
                defaultValue={defaultStartHour ?? ""}
                placeholder="0"
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
                defaultValue={defaultEndHour ?? ""}
                placeholder="23"
                className={inputCls}
              />
            </label>
          </div>

          <p className="-mt-1 text-[12px] text-faint">
            Si dejás radio u horario vacíos, se usan los del comercio (Ajustes).
            El aviso funciona con la tarjeta abierta en el teléfono.
          </p>
        </div>
      )}
    </fieldset>
  );
}
