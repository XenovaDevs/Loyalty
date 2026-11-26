"use server";

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/tenant";
import { withMembershipLock } from "@/lib/locks";
import { deriveBalance, stampProgress, type EventType } from "@/lib/loyalty";
import { sendPushToCustomer } from "@/lib/push";

export type ScanMembership = {
  id: string;
  type: string; // STAMPS | VISIT | POINTS | COUPON
  programName: string;
  reward: string;
  // sellos
  filled: number;
  required: number;
  isComplete: boolean;
  // puntos
  points: number;
  // cupón
  couponCode: string | null;
  used: boolean;
};

export type ScanResult =
  | { found: false }
  | { found: true; customerName: string; code: string; memberships: ScanMembership[] };

type DbMembership = {
  id: string;
  program: {
    type: string;
    name: string;
    rewardText: string;
    stampsRequired: number | null;
    couponCode: string | null;
  };
  events: { type: string; amount: unknown }[];
};

function mapMembership(m: DbMembership): ScanMembership {
  const events = m.events.map((e) => ({
    type: e.type as EventType,
    amount: e.amount as number,
  }));
  const balance = deriveBalance(events);
  const sp = stampProgress(balance, m.program.stampsRequired ?? 10);
  return {
    id: m.id,
    type: m.program.type,
    programName: m.program.name,
    reward: m.program.rewardText,
    filled: sp.filled,
    required: sp.required,
    isComplete: sp.isComplete,
    points: balance,
    couponCode: m.program.couponCode,
    used: events.some((e) => e.type === "REDEEM"),
  };
}

async function resultForCustomer(customerId: string): Promise<ScanResult> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      memberships: {
        include: { program: true, events: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!customer) return { found: false };
  return {
    found: true,
    customerName: customer.name,
    code: customer.code,
    memberships: customer.memberships.map(mapMembership),
  };
}

export async function lookupCustomer(codeRaw: unknown): Promise<ScanResult> {
  const { businessId } = await requireBusiness();
  if (typeof codeRaw !== "string" || codeRaw.length > 32) return { found: false };
  const code = codeRaw.trim().replace(/^#/, "").toUpperCase();
  if (!code) return { found: false };
  const customer = await prisma.customer.findUnique({
    where: { businessId_code: { businessId, code } },
  });
  if (!customer) return { found: false };
  return resultForCustomer(customer.id);
}

// Límites de lo que un empleado puede cargar en una sola operación. La UI solo
// manda +1/+2 sellos, pero un server action se puede llamar con cualquier valor.
const MAX_STAMPS_PER_OP = 5;
const MAX_POINTS_PER_OP = 10_000;

async function assertMembership(businessId: string, membershipId: unknown) {
  if (typeof membershipId !== "string" || membershipId.length > 64)
    throw new Error("Membresía no encontrada");
  const m = await prisma.membership.findFirst({
    where: { id: membershipId, program: { businessId } },
    include: { program: true, customer: true },
  });
  if (!m) throw new Error("Membresía no encontrada");
  return m;
}

export async function addStamp(membershipId: string, qty: unknown = 1): Promise<ScanResult> {
  const { businessId, user } = await requireBusiness();
  const m = await assertMembership(businessId, membershipId);
  if (m.program.type !== "STAMPS") return resultForCustomer(m.customerId);
  // Entero positivo y acotado: antes un qty negativo borraba sellos y uno
  // enorme generaba premios infinitos.
  if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_STAMPS_PER_OP)
    return resultForCustomer(m.customerId);

  const required = m.program.stampsRequired ?? 10;
  const crossedReward = await withMembershipLock(m.id, async (tx) => {
    const prior = await tx.loyaltyEvent.findMany({ where: { membershipId: m.id } });
    const before = deriveBalance(
      prior.map((e) => ({ type: e.type as EventType, amount: e.amount as unknown as number })),
    );
    await tx.loyaltyEvent.create({
      data: { membershipId: m.id, type: "STAMP", amount: qty, staffUserId: user.id },
    });
    // Si este sello cruzó un múltiplo de `required`, completó un premio nuevo
    // (robusto para qty > 1, ej. el botón "+2" que va de 8 a 10).
    const total = before + qty;
    return Math.floor(total / required) > Math.floor(Math.max(0, before) / required);
  });

  if (crossedReward) {
    // Después de responder: la caja no espera a los servidores de push.
    after(() =>
      sendPushToCustomer(m.customerId, {
        title: "¡Tu premio está listo! 🎁",
        body: m.program.rewardText,
        url: `/t/${m.customer.code}`,
      }).catch(() => {}),
    );
  }

  return resultForCustomer(m.customerId);
}

export async function addPoints(
  membershipId: string,
  amount: unknown,
): Promise<ScanResult> {
  const { businessId, user } = await requireBusiness();
  const m = await assertMembership(businessId, membershipId);
  // Puntos solo para programas de puntos/visita, nunca sellos ni cupones.
  if (m.program.type === "STAMPS" || m.program.type === "COUPON")
    return resultForCustomer(m.customerId);
  const pts = Math.round(Number(amount));
  if (!Number.isFinite(pts) || pts <= 0 || pts > MAX_POINTS_PER_OP)
    return resultForCustomer(m.customerId);
  await prisma.loyaltyEvent.create({
    data: { membershipId: m.id, type: "POINTS", amount: pts, staffUserId: user.id },
  });
  return resultForCustomer(m.customerId);
}

export async function useCoupon(membershipId: string): Promise<ScanResult> {
  const { businessId, user } = await requireBusiness();
  const m = await assertMembership(businessId, membershipId);
  if (m.program.type !== "COUPON") return resultForCustomer(m.customerId);

  // Un solo uso: chequeo + inserción bajo lock por membresía (una transacción
  // sola no alcanza en READ COMMITTED: dos llamadas concurrentes pasaban).
  await withMembershipLock(m.id, async (tx) => {
    const already = await tx.loyaltyEvent.findFirst({
      where: { membershipId: m.id, type: "REDEEM" },
    });
    if (!already) {
      await tx.loyaltyEvent.create({
        data: {
          membershipId: m.id,
          type: "REDEEM",
          amount: 1,
          note: "Cupón usado",
          staffUserId: user.id,
        },
      });
    }
  });
  return resultForCustomer(m.customerId);
}

export async function revertCoupon(membershipId: string): Promise<ScanResult> {
  const { businessId } = await requireBusiness();
  const m = await assertMembership(businessId, membershipId);
  if (m.program.type !== "COUPON") return resultForCustomer(m.customerId);
  // Borra los eventos de canje → el cupón vuelve a estar disponible.
  // Acotado a cupones para no tocar canjes de premios de sellos.
  await prisma.loyaltyEvent.deleteMany({
    where: { membershipId: m.id, type: "REDEEM", note: "Cupón usado" },
  });
  return resultForCustomer(m.customerId);
}

export type TestPushResult = { ok: boolean; message: string };

/** Manda una notificación de prueba al cliente para verificar sus avisos. */
export async function sendTestPush(code: unknown): Promise<TestPushResult> {
  const { businessId } = await requireBusiness();
  if (typeof code !== "string" || code.length > 32)
    return { ok: false, message: "Cliente no encontrado." };
  const clean = code.trim().replace(/^#/, "").toUpperCase();
  const customer = await prisma.customer.findUnique({
    where: { businessId_code: { businessId, code: clean } },
  });
  if (!customer) return { ok: false, message: "Cliente no encontrado." };

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
          "Este cliente no tiene notificaciones activadas. Pedile que abra su tarjeta y toque “Activar notificaciones”.",
      };
    if (r.sent === 0)
      return {
        ok: false,
        message:
          "No se pudo entregar (suscripción vencida o revocada). Que la vuelva a activar en su tarjeta.",
      };
    return { ok: true, message: `Enviada a ${customer.name} (${r.sent} dispositivo/s).` };
  } catch {
    return {
      ok: false,
      message: "Error al enviar. Revisá las claves VAPID del entorno.",
    };
  }
}

export async function redeemReward(membershipId: string): Promise<ScanResult> {
  const { businessId, user } = await requireBusiness();
  const m = await assertMembership(businessId, membershipId);
  if (m.program.type !== "STAMPS") return resultForCustomer(m.customerId);
  const required = m.program.stampsRequired ?? 10;

  // Solo canjear si hay un premio pendiente (evita dejar el saldo negativo).
  // Bajo lock: con doble click o dos cajas, ambas veían rewardsPending=1.
  await withMembershipLock(m.id, async (tx) => {
    const prior = await tx.loyaltyEvent.findMany({ where: { membershipId: m.id } });
    const balance = deriveBalance(
      prior.map((e) => ({ type: e.type as EventType, amount: e.amount as unknown as number })),
    );
    if (stampProgress(balance, required).rewardsPending < 1) return;
    await tx.loyaltyEvent.create({
      data: {
        membershipId: m.id,
        type: "REDEEM",
        amount: required,
        note: "Canje de premio",
        staffUserId: user.id,
      },
    });
  });
  return resultForCustomer(m.customerId);
}
