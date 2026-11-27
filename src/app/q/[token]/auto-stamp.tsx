"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { stampByQr } from "./actions";
import { buttonCls } from "@/components/ui";

/**
 * El celular ya tiene tarjeta: suma el sello apenas abre la página y lleva al
 * cliente a su tarjeta (que muestra el resultado).
 */
export function AutoStamp({ token, firstName }: { token: string; firstName: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const run = useCallback(async () => {
    setError(null);
    try {
      const r = await stampByQr(token);
      if (r.ok) router.replace(`/t/${r.code}?r=${r.status}`);
      else if (r.needJoin) router.refresh(); // la cookie ya no sirve: mostrar el alta
      else setError(r.error);
    } catch {
      setError("No pudimos sumar tu sello. Probá de nuevo.");
    }
  }, [token, router]);

  useEffect(() => {
    // Una sola vez (en desarrollo, StrictMode monta los efectos dos veces).
    if (started.current) return;
    started.current = true;
    run();
  }, [run]);

  return (
    <div className="py-6 text-center">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Hola, <em className="not-italic text-spot">{firstName}</em>
      </h1>
      {error ? (
        <>
          <p className="mb-5 mt-3 text-sm text-ink-2">{error}</p>
          <button onClick={run} className={buttonCls("spot")}>
            Reintentar
          </button>
        </>
      ) : (
        <p className="mt-3 text-sm text-ink-2">Sumando tu sello…</p>
      )}
    </div>
  );
}
