"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { distanceMeters, isOpenNow } from "@/lib/geo";
import { checkIn, type CheckInResult } from "./checkin-actions";

type Props = {
  code: string;
  brandName: string;
  lat: number;
  lng: number;
  radius: number;
  openHour: number | null;
  closeHour: number | null;
};

export function CheckInButton({
  code,
  brandName,
  lat,
  lng,
  radius,
  openHour,
  closeHour,
}: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "locating" | "done">("idle");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [watching, setWatching] = useState(false);
  const watchId = useRef<number | null>(null);
  const firedRef = useRef(false);

  // Limpieza del watcher al desmontar.
  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  async function doCheckIn(cLat: number, cLng: number, accuracy: number) {
    const r = await checkIn(code, cLat, cLng, accuracy);
    setResult(r);
    setState("done");
    if (r.ok) router.refresh();
    return r;
  }

  function manual() {
    setResult(null);
    if (!("geolocation" in navigator)) {
      setResult({ ok: false, message: "Tu dispositivo no permite ubicación." });
      return;
    }
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        doCheckIn(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      () => {
        setResult({
          ok: false,
          message: "Necesitamos tu ubicación para sumar la visita.",
        });
        setState("idle");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  async function enableAlerts() {
    if (!("geolocation" in navigator) || !("Notification" in window)) {
      setResult({ ok: false, message: "Tu dispositivo no soporta avisos." });
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setResult({ ok: false, message: "Activá los avisos para que te avisemos al llegar." });
      return;
    }
    setWatching(true);
    firedRef.current = false;
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const dist = distanceMeters(pos.coords.latitude, pos.coords.longitude, lat, lng);
        if (
          !firedRef.current &&
          dist <= radius &&
          isOpenNow(openHour, closeHour)
        ) {
          firedRef.current = true;
          const r = await doCheckIn(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.accuracy,
          );
          if (r.ok) {
            new Notification(`¡Estás en ${brandName}!`, {
              body: r.message,
            });
          }
          // Dejar de vigilar tras el primer check-in del día.
          if (watchId.current != null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
          }
          setWatching(false);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 0 },
    );
  }

  return (
    <div className="mt-4 border border-ink p-4">
      <p className="font-display text-base font-semibold">Estás en el local</p>
      <p className="mb-3 mt-0.5 text-[13px] text-ink-2">
        Sumá puntos por pasar y abrir tu tarjeta — una vez por día.
      </p>

      <button
        onClick={manual}
        disabled={state === "locating" || (state === "done" && result?.ok)}
        className="w-full rounded-[var(--radius)] border border-spot bg-spot py-3 font-semibold text-paper disabled:opacity-60"
      >
        {state === "locating"
          ? "Ubicándote…"
          : result?.ok
            ? "¡Visita sumada!"
            : "Sumar puntos de visita"}
      </button>

      <button
        onClick={enableAlerts}
        disabled={watching || (state === "done" && result?.ok)}
        className="mt-2.5 w-full rounded-[var(--radius)] border border-ink py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {watching ? "Te avisamos al llegar… 📍" : "Avisarme cuando llegue al local"}
      </button>

      {result && (
        <p
          className={`mt-2.5 text-center text-[13px] ${
            result.ok ? "text-spot" : "text-ink-2"
          }`}
        >
          {result.ok ? "✓ " : ""}
          {result.message}
        </p>
      )}

      <p className="mt-2 text-center font-mono text-[10px] leading-relaxed text-faint">
        El aviso funciona con la tarjeta abierta (aunque sea en segundo plano).
      </p>
    </div>
  );
}
