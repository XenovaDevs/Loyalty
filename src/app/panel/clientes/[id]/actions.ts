"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/tenant";
import { withMembershipLock } from "@/lib/locks";
import { deriveBalance, stampProgress, type EventType } from "@/lib/loyalty";
import { sendPushToCustomer } from "@/lib/push";
import { addStamps, notifyRewardReady } from "@/lib/stamps";

// Acciones del personal sobre un cliente (antes vivían en el scanner).
// Todas validan que la membresía sea del comercio del usuario logueado.

export type ActionResult = { ok: boolean; message: string };

// Límite por operación: la UI manda +1/+2, pero una action se puede llamar con
// cualquier valor (antes un qty negativo borraba sellos y uno enorme daba
// premios infinitos).
const MAX_STAMPS_PER_OP = 5;

// Mismas notas que usa la autogestión del cliente (src/app/t/[code]/redeem-actions.ts).
const COUPON_NOTE = "Cupón usado";
const REWARD_NOTE = "Canje de premio";

async function membershipOf(businessId: string, membershipId: unknown) {
  if (typeof membershipId !== "string" || membershipId.length > 64) return null;
  return prisma.membership.findFirst({
    where: { id: membershipId, program: { businessId } },
    include: { program: true, customer: true },
  });
}

function refresh(customerId: string) {
  revalidatePath(`/panel/clientes/${customerId}`);
  revalidatePath("/panel/clientes");
  revalidatePath("/panel");
}

const NOT_FOUND: ActionResult = { ok: false, message: "No encontramos esa tarjeta." };

export async function addStamp(membershipId: unknown, qty: unknown = 1): Promise<ActionResult> {
  const { businessId, user } = await requireBusiness();
  const m = await membershipOf(businessId, membershipId);
  if (!m || m.program.type !== "STAMPS") return NOT_FOUND;
  if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_STAMPS_PER_OP)
    return { ok: false, message: "Cantidad de sellos inválida." };

  // Sin tope diario: el personal es de confianza (el límite es para el QR).
  const r = await addStamps({
    membershipId: m.id,
    required: m.program.stampsRequired ?? 10,
    qty,
    staffUserId: user.id,
  });
  if (r.added && r.crossedReward) {
    notifyRewardReady(m.customerId, m.customer.code, m.program.rewardText);
  }
  refresh(m.customerId);
  return { ok: true, message: qty === 1 ? "+1 sello" : `+${qty} sellos` };
}

export async function redeemReward(membershipId: unknown): Promise<ActionResult> {
  const { businessId, user } = await requireBusiness();
  const m = await membershipOf(businessId, membershipId);
  if (!m || m.program.type !== "STAMPS") return NOT_FOUND;
  const required = m.program.stampsRequired ?? 10;

  // Solo si hay un premio pendiente; bajo lock (doble click / dos dispositivos).
  const done = await withMembershipLock(m.id, async (tx) => {
    const prior = await tx.loyaltyEvent.findMany({ where: { membershipId: m.id } });
    const balance = deriveBalance(
      prior.map((e) => ({ type: e.type as EventType, amount: e.amount as unknown as number })),
    );
    if (stampProgress(balance, required).rewardsPending < 1) return false;
    await tx.loyaltyEvent.create({
      data: {
        membershipId: m.id,
        type: "REDEEM",
        amount: required,
        note: REWARD_NOTE,
        staffUserId: user.id,
      },
    });
    return true;
  });
  refresh(m.customerId);
  return done
    ? { ok: true, message: "Premio canjeado" }
    : { ok: false, message: "No tiene un premio para canjear." };
}

export async function markCouponUsed(membershipId: unknown): Promise<ActionResult> {
  const { businessId, user } = await requireBusiness();
  const m = await membershipOf(businessId, membershipId);
  if (!m || m.program.type !== "COUPON") return NOT_FOUND;

  // Un solo uso: chequeo + inserción bajo lock.
  const done = await withMembershipLock(m.id, async (tx) => {
    const already = await tx.loyaltyEvent.findFirst({
      where: { membershipId: m.id, type: "REDEEM" },
    });
    if (already) return false;
    await tx.loyaltyEvent.create({
      data: { membershipId: m.id, type: "REDEEM", amount: 1, note: COUPON_NOTE, staffUserId: user.id },
    });
    return true;
  });
  refresh(m.customerId);
  return done
    ? { ok: true, message: "Cupón marcado como usado" }
    : { ok: false, message: "El cupón ya estaba usado." };
}

export async function revertCoupon(membershipId: unknown): Promise<ActionResult> {
  const { businessId } = await requireBusiness();
  const m = await membershipOf(businessId, membershipId);
  if (!m || m.program.type !== "COUPON") return NOT_FOUND;
  // Acotado a cupones para no tocar canjes de premios de sellos.
  await prisma.loyaltyEvent.deleteMany({
    where: { membershipId: m.id, type: "REDEEM", note: COUPON_NOTE },
  });
  refresh(m.customerId);
  return { ok: true, message: "Uso del cupón deshecho" };
}

/** Manda una notificación de prueba al cliente para verificar sus avisos. */
export async function sendTestPush(customerId: unknown): Promise<ActionResult> {
  const { businessId } = await requireBusiness();
  if (typeof customerId !== "string" || customerId.length > 64)
    return { ok: false, message: "Cliente no encontrado." };
  const customer = await prisma.customer.findFirst({ where: { id: customerId, businessId } });
  if (!customer) return { ok: false, message: "Cliente no encontrado." };

  // Antes de tocar el servicio push: sin suscripciones no hay nada que probar.
  const subs = await prisma.pushSubscription.count({ where: { customerId: customer.id } });
  if (subs === 0)
    return {
      ok: false,
      message:
        "Este cliente no tiene avisos activados. Pedile que abra su tarjeta y toque “Activar avisos”.",
    };

  try {
    const r = await sendPushToCustomer(customer.id, {
      title: "Notificación de prueba 🔔",
      body: "Si ves esto, tus avisos están funcionando.",
      url: `/t/${customer.code}`,
    });
    if (r.subscriptions === 0)
      return {
        ok: false,
        message:
          "Este cliente no tiene avisos activados. Pedile que abra su tarjeta y toque “Activar avisos”.",
      };
    if (r.sent === 0)
      return {
        ok: false,
        message: "No se pudo entregar (suscripción vencida o revocada). Que la vuelva a activar en su tarjeta.",
      };
    return { ok: true, message: `Enviada a ${customer.name} (${r.sent} dispositivo/s).` };
  } catch {
    return { ok: false, message: "Error al enviar. Revisá las claves VAPID del entorno." };
  }
}
