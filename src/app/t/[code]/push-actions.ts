"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAllowedPushEndpoint } from "@/lib/push";

// Máximo de dispositivos con avisos por cliente. Al pasarse se descarta el más viejo.
const MAX_SUBS_PER_CUSTOMER = 5;

// El endpoint lo genera el navegador y siempre apunta al servicio push del
// fabricante (Google, Mozilla, Apple, Microsoft). Validarlo evita que alguien
// registre miles de URLs arbitrarias y use al server para pegarles (o para
// colgar la caja con un endpoint que nunca responde).
const SubInput = z.object({
  endpoint: z.string().max(1024).refine(isAllowedPushEndpoint),
  keys: z.object({
    p256dh: z.string().min(16).max(256).regex(/^[A-Za-z0-9_-]+={0,2}$/),
    auth: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+={0,2}$/),
  }),
});

/** Guarda la suscripción push de un cliente (identificado por su código). */
export async function savePushSubscription(code: unknown, subArg: unknown) {
  if (typeof code !== "string" || code.length > 32) return { ok: false };
  const parsed = SubInput.safeParse(subArg);
  if (!parsed.success) return { ok: false };
  const sub = parsed.data;

  const customer = await prisma.customer.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true },
  });
  if (!customer) return { ok: false };

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      customerId: customer.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    update: { customerId: customer.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });

  // Tope de dispositivos por cliente: se quedan las más nuevas.
  const extra = await prisma.pushSubscription.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    skip: MAX_SUBS_PER_CUSTOMER,
    select: { id: true },
  });
  if (extra.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: extra.map((e) => e.id) } } });
  }
  return { ok: true };
}

/**
 * ¿La suscripción de ESTE navegador (endpoint) pertenece a este cliente?
 * El navegador tiene una sola suscripción push por origen, así que no alcanza
 * con que exista: hay que confirmar que es de este cliente y no de otro.
 */
export async function isSubscribedAs(code: unknown, endpoint: unknown): Promise<boolean> {
  if (typeof code !== "string" || typeof endpoint !== "string") return false;
  const n = await prisma.pushSubscription.count({
    where: { endpoint, customer: { code: code.toUpperCase() } },
  });
  return n > 0;
}

export async function removePushSubscription(endpoint: unknown) {
  if (typeof endpoint !== "string" || endpoint.length > 1024) return { ok: false };
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return { ok: true };
}
