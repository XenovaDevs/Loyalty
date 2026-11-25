"use client";

import { useEffect, useRef, useState } from "react";
import { distanceMeters, isOpenNow } from "@/lib/geo";

export type NotifyPromo = {
  id: string;
  name: string;
  messages: string[];
  radiusM: number;
  startHour: number | null;
  endHour: number | null;
};

type Props = {
  lat: number;
  lng: number;
  promos: NotifyPromo[];
};

// Tiempo mínimo entre avisos de un mismo programa (evita spam del navegador).
const COOLDOWN_MS = 2 * 60 * 60 * 1000;

function lastFired(id: string): number {
  const v = localStorage.getItem(`notif:${id}`);
  return v ? Number(v) : 0;
}

/**
 * Vigila la ubicación del cliente y, cuando entra en el radio de un programa
 * (dentro del horario permitido), dispara una notificación con un mensaje al
 * azar. Funciona con la tarjeta abierta, aunque sea en segundo plano.
 */
export function ProximityNotifier({ lat, lng, promos }: Props) {
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchId.current != null)
        navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  async function enable() {
    setError(null);
    if (!("geolocation" in navigator) || !("Notification" in window)) {
      setError("Tu dispositivo no soporta avisos de cercanía.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setError("Activá los avisos para que te avisemos cuando pases cerca.");
      return;
    }
    setWatching(true);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const dist = distanceMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          lat,
          lng,
        );
        const now = Date.now();
        for (const promo of promos) {
          if (dist > promo.radiusM) continue;
          if (!isOpenNow(promo.startHour, promo.endHour)) continue;
          if (now - lastFired(promo.id) < COOLDOWN_MS) continue;
          if (promo.messages.length === 0) continue;

          const msg =
            promo.messages[Math.floor(Math.random() * promo.messages.length)];
          localStorage.setItem(`notif:${promo.id}`, String(now));
          new Notification(promo.name, { body: msg });
        }
      },
      () => setError("No pudimos acceder a tu ubicación."),
      { enableHighAccuracy: true, maximumAge: 0 },
    );
  }

  if (promos.length === 0) return null;

  return (
    <div className="mt-4 border border-line p-4">
      <p className="font-display text-base font-semibold">
        Avisos de cercanía
      </p>
      <p className="mb-3 mt-0.5 text-[13px] text-ink-2">
        Te avisamos cuando pases cerca y haya algo para vos.
      </p>
      <button
        onClick={enable}
        disabled={watching}
        className="w-full rounded-[var(--radius)] border border-ink py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {watching ? "Avisos activados 📍" : "Activar avisos de cercanía"}
      </button>
      {error && <p className="mt-2.5 text-center text-[13px] text-ink-2">{error}</p>}
    </div>
  );
}
