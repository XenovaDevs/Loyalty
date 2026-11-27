import { after } from "next/server";
import { withMembershipLock } from "./locks";
import { deriveBalance, type EventType } from "./loyalty";
import { dayKeyInBusinessTz } from "./geo";
import { sendPushToCustomer } from "./push";
import { prisma } from "./prisma";

export const QR_STAMP_NOTE = "qr";

export type AddStampsResult =
  | { added: true; crossedReward: boolean }
  | { added: false; reason: "already-today" };

/**
 * Suma `qty` sellos a una membresía (bajo lock por membresía).
 *
 * - `oncePerDay`: si ya hay un sello hoy (día en la zona del negocio, venga de
 *   la caja o del QR), no suma. Es el límite del QR fijo del local: aunque
 *   alguien le saque una foto, no puede sumar más de un sello por día.
 * - Devuelve si este sello completó un premio nuevo (robusto para qty > 1).
 */
export async function addStamps(opts: {
  membershipId: string;
  required: number;
  qty: number;
  staffUserId?: string | null;
  note?: string | null;
  oncePerDay?: boolean;
}): Promise<AddStampsResult> {
  const { membershipId, required, qty } = opts;
  return withMembershipLock(membershipId, async (tx) => {
    const prior = await tx.loyaltyEvent.findMany({
      where: { membershipId },
      select: { type: true, amount: true, createdAt: true },
    });

    if (opts.oncePerDay) {
      const today = dayKeyInBusinessTz();
      const stampedToday = prior.some(
        (e) => e.type === "STAMP" && dayKeyInBusinessTz(e.createdAt) === today,
      );
      if (stampedToday) return { added: false, reason: "already-today" } as const;
    }

    const before = deriveBalance(
      prior.map((e) => ({ type: e.type as EventType, amount: e.amount as unknown as number })),
    );
    await tx.loyaltyEvent.create({
      data: {
        membershipId,
        type: "STAMP",
        amount: qty,
        staffUserId: opts.staffUserId ?? null,
        note: opts.note ?? null,
      },
    });
    // Si este sello cruzó un múltiplo de `required`, completó un premio nuevo
    // (ej. el botón "+2" que va de 8 a 10).
    const total = before + qty;
    const crossedReward =
      Math.floor(total / required) > Math.floor(Math.max(0, before) / required);
    return { added: true, crossedReward } as const;
  });
}

/**
 * Avisa por push que el premio está listo, después de responder (no bloquea).
 * Título = nombre del local y texto concreto, sin emojis: el filtro de spam de
 * Chrome (Android) marca las notificaciones genéricas de sitios poco conocidos.
 */
export function notifyRewardReady(customerId: string, code: string, rewardText: string) {
  after(async () => {
    try {
      const c = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { name: true, business: { select: { name: true } } },
      });
      if (!c) return;
      await sendPushToCustomer(customerId, {
        title: c.business.name,
        body: `${c.name.split(" ")[0]}, completaste tu tarjeta de sellos. Tu premio: ${rewardText}`,
        url: `/t/${code}`,
        tag: "loyalty-reward",
      });
    } catch {
      // un aviso que no sale no debe romper nada
    }
  });
}
