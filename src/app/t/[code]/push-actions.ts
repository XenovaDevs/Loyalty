"use server";

import { prisma } from "@/lib/prisma";

type SubInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Guarda la suscripción push de un cliente (identificado por su código). */
export async function savePushSubscription(code: string, sub: SubInput) {
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
  return { ok: true };
}

/**
 * ¿La suscripción de ESTE navegador (endpoint) pertenece a este cliente?
 * El navegador tiene una sola suscripción push por origen, así que no alcanza
 * con que exista: hay que confirmar que es de este cliente y no de otro.
 */
export async function isSubscribedAs(code: string, endpoint: string): Promise<boolean> {
  const n = await prisma.pushSubscription.count({
    where: { endpoint, customer: { code: code.toUpperCase() } },
  });
  return n > 0;
}

export async function removePushSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return { ok: true };
}
