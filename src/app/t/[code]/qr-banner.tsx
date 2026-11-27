"use client";

import { useEffect, useState } from "react";

const MESSAGES: Record<string, { text: string; good: boolean }> = {
  sello: { text: "¡Sumaste un sello!", good: true },
  premio: {
    text: "¡Completaste la tarjeta! Mostrá tu código en la caja para canjear tu premio.",
    good: true,
  },
  ya: { text: "Ya sumaste tu sello de hoy. ¡Te esperamos mañana!", good: false },
  cerrado: {
    text: "El local está cerrado: los sellos se suman en horario de atención.",
    good: false,
  },
};

/**
 * Cartel con el resultado del escaneo del QR (?r=…). Al mostrarse limpia la
 * URL, así no reaparece al recargar o cuando la tarjeta se refresca sola.
 */
export function QrBanner({ status, nuevo }: { status?: string; nuevo: boolean }) {
  const [shown] = useState(() => (status ? MESSAGES[status] : undefined));
  const [welcome] = useState(nuevo);

  useEffect(() => {
    if (!status) return;
    window.history.replaceState(null, "", window.location.pathname);
  }, [status]);

  if (!shown) return null;

  return (
    <div
      role="status"
      className={`mb-5 border p-4 text-center ${
        shown.good ? "border-spot bg-spot text-paper" : "border-ink text-ink"
      }`}
    >
      {welcome && (
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] opacity-80">
          Tu tarjeta está lista
        </p>
      )}
      <p className="font-display text-lg font-semibold leading-snug">{shown.text}</p>
    </div>
  );
}
