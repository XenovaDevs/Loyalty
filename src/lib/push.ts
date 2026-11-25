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

export type PushSendResult = {
  subscriptions: number; // suscripciones del cliente al momento de enviar
  sent: number; // entregadas OK
  removed: number; // vencidas/revocadas que limpiamos
};

/** Envía una notificación push a todas las suscripciones de un cliente. */
export async function sendPushToCustomer(
  customerId: string,
  payload: { title: string; body: string; url?: string },
): Promise<PushSendResult> {
  ensureConfigured();
  const subs = await prisma.pushSubscription.findMany({ where: { customerId } });
  const data = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          data,
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
