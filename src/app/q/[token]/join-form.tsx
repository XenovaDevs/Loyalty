"use client";

import { useActionState, useState } from "react";
import { joinByQr, type QrResult } from "./actions";
import { Field, buttonCls } from "@/components/ui";

type Props = { token: string; reward: string; stampsRequired: number };

export function JoinForm({ token, reward, stampsRequired }: Props) {
  const [state, action, pending] = useActionState<QrResult | undefined, FormData>(
    joinByQr,
    undefined,
  );

  // Controlados: React resetea el <form action> tras cada envío y, si hubo un
  // error (ej. apellido que no coincide), el cliente perdía lo que escribió.
  const [v, setV] = useState({ firstName: "", lastName: "", phone: "" });
  const bind = (k: keyof typeof v) => ({
    name: k,
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value }),
  });

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Tu tarjeta de <em className="not-italic text-spot">sellos</em>
      </h1>
      <p className="mt-1 font-display text-lg font-semibold text-spot">{reward}</p>
      <p className="mb-6 mt-1 text-sm leading-relaxed text-ink-2">
        Juntá {stampsRequired} sellos: sumás uno cada vez que venís y escaneás
        este QR. Al crear tu tarjeta ya sumás el primero.
      </p>

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="token" value={token} />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Nombre"
            {...bind("firstName")}
            required
            maxLength={60}
            autoComplete="given-name"
            placeholder="Sofía"
          />
          <Field
            label="Apellido"
            {...bind("lastName")}
            required
            maxLength={60}
            autoComplete="family-name"
            placeholder="Martínez"
          />
        </div>
        <Field
          label="Teléfono"
          {...bind("phone")}
          type="tel"
          inputMode="tel"
          required
          maxLength={40}
          autoComplete="tel"
          placeholder="280 415-2290"
        />
        {state && !state.ok && <p className="text-sm text-spot">{state.error}</p>}
        <button disabled={pending} className={`${buttonCls("spot")} mt-1 py-3`}>
          {pending ? "Creando tu tarjeta…" : "Crear mi tarjeta"}
        </button>
        <p className="text-center text-[12px] leading-relaxed text-faint">
          Si ya tenías tarjeta en este local, poné el mismo teléfono y apellido y
          la recuperás.
        </p>
      </form>
    </>
  );
}
