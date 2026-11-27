"use client";

import { useEffect, useRef, useState } from "react";
import { distanceMeters, isOpenNow } from "@/lib/geo";

type Props = {
  businessId: string;
  title: string; // nombre del local (título de la notificación)
  lat: number;
  lng: number;
  radiusM: number;
  startHour: number | null;
  endHour: number | null;
  messages: string[];
};

// Tiempo mínimo entre avisos del local (evita spam del navegador).
const COOLDOWN_MS = 2 * 60 * 60 * 1000;

/**
 * Aviso de cercanía del local: vigila la ubicación del cliente y, cuando entra
 * en el radio (dentro de la franja horaria), muestra una notificación con un
 * mensaje al azar. Funciona con la tarjeta abierta, aunque sea en segundo plano.
 */
export function ProximityNotifier({
  businessId,
  title,
  lat,
  lng,
  radiusM,
  startHour,
  endHour,
  messages,
}: Props) {
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const storageKey = `notif:${businessId}`;

  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
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
        const dist = distanceMeters(pos.coords.latitude, pos.coords.longitude, lat, lng);
        const now = Date.now();
        if (dist > radiusM) return;
        if (!isOpenNow(startHour, endHour)) return;
        if (now - Number(localStorage.getItem(storageKey) ?? 0) < COOLDOWN_MS) return;
        if (messages.length === 0) return;

        const msg = messages[Math.floor(Math.random() * messages.length)];
        localStorage.setItem(storageKey, String(now));
        new Notification(title, {
          body: msg,
          icon: "/notification-icon.png",
          badge: "/notification-badge.png",
          lang: "es",
          tag: `loyalty-near-${businessId}`,
        });
      },
      () => setError("No pudimos acceder a tu ubicación."),
      { enableHighAccuracy: true, maximumAge: 0 },
    );
  }

  return (
    <div className="mt-4 border border-line p-4">
      <p className="font-display text-base font-semibold">Avisos de cercanía</p>
      <p className="mb-3 mt-0.5 text-[13px] text-ink-2">
        Te avisamos cuando pases cerca del local.
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
