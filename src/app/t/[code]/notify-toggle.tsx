"use client";

import { useEffect, useState } from "react";
import {
  savePushSubscription,
  removePushSubscription,
  isSubscribedAs,
} from "./push-actions";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function NotifyToggle({ code }: { code: string }) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    if (!ok) return;
    // Si ya hay service worker, pedirle que se actualice: el registro solo
    // ocurre al activar los avisos, y un celular podía quedarse con un sw.js
    // viejo (ej. sin el logo en las notificaciones).
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.update())
      .catch(() => {});
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        // El navegador tiene UNA suscripción por origen. "Activado" solo si esa
        // suscripción está registrada para ESTE cliente (no para otro).
        if (!sub) return setSubscribed(false);
        setSubscribed(await isSubscribedAs(code, sub.endpoint));
      })
      .catch(() => {});
  }, [code]);

  async function subscribe() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMsg("Activá los permisos de notificación para recibir avisos.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });
      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      await savePushSubscription(code, {
        endpoint: json.endpoint,
        keys: json.keys,
      });
      setSubscribed(true);
      setMsg("Listo: te vamos a avisar aunque no tengas la tarjeta abierta.");
    } catch {
      setMsg("No pudimos activar los avisos en este dispositivo.");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMsg(null);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <div className="mt-4 border border-ink p-4">
      <p className="font-display text-base font-semibold">Avisos del local</p>
      <p className="mb-3 mt-0.5 text-[13px] text-ink-2">
        Recibí un aviso cuando tu premio esté listo — aunque no tengas la tarjeta
        abierta.
      </p>
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={busy}
        className={`w-full rounded-[var(--radius)] py-2.5 text-sm font-semibold disabled:opacity-60 ${
          subscribed
            ? "border border-ink"
            : "border border-spot bg-spot text-paper"
        }`}
      >
        {busy
          ? "Un momento…"
          : subscribed
            ? "Desactivar avisos"
            : "Activar avisos"}
      </button>
      {msg && <p className="mt-2.5 text-center text-[13px] text-spot">{msg}</p>}
    </div>
  );
}
