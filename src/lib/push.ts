import * as webpush from "web-push";
import { prisma } from "./prisma";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!pub || !priv) throw new Error("Faltan las claves VAPID en el entorno.");
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

/**
 * ¿El endpoint es de un servicio push real? (https + host del fabricante).
 * Se valida al guardar Y al enviar, por si quedó algo viejo en la base.
 */
export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    if (u.protocol !== "https:" || u.username || u.password) return false;
    if (u.port && u.port !== "443") return false;
    const h = u.hostname.toLowerCase();
    return (
      h === "fcm.googleapis.com" || // Chrome, Android, Opera, Brave
      h === "updates.push.services.mozilla.com" || // Firefox
      h.endsWith(".push.apple.com") || // Safari / iOS
      h.endsWith(".notify.windows.com") // Edge (WNS)
    );
  } catch {
    return false;
  }
}

const PUSH_TIMEOUT_MS = 5000;

export type PushSendResult = {
  subscriptions: number; // suscripciones del cliente al momento de enviar
  sent: number; // entregadas OK
  removed: number; // vencidas/revocadas que limpiamos
};

/** Envía una notificación push a todas las suscripciones de un cliente. */
export async function sendPushToCustomer(
  customerId: string,
  // tag: notificaciones con el mismo tag se reemplazan en vez de apilarse
  // (varias idénticas seguidas es una de las señales de spam de Chrome).
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<PushSendResult> {
  ensureConfigured();
  const subs = await prisma.pushSubscription.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const data = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;

  await Promise.all(
    subs.map(async (s) => {
      if (!isAllowedPushEndpoint(s.endpoint)) {
        removed++;
        await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        return;
      }
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          data,
          { timeout: PUSH_TIMEOUT_MS, TTL: 60 * 60 * 24 },
        );
        sent++;
      } catch (err: unknown) {
        // Suscripción vencida/revocada (410/404) → la limpiamos.
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 410 || status === 404) {
          removed++;
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    }),
  );

  return { subscriptions: subs.length, sent, removed };
}
