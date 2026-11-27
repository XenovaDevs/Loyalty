"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withMembershipLock } from "@/lib/locks";
import { deriveBalance, stampProgress, type EventType } from "@/lib/loyalty";

export type RedeemResult = { ok: boolean; message?: string };

// Mismas notas que usa el scanner, así "Deshacer uso" del panel sigue andando.
const COUPON_NOTE = "Cupón usado";
const REWARD_NOTE = "Canje de premio";

/**
 * Autogestión: el cliente quema su cupón o canjea su premio desde la tarjeta,
 * frente al personal. La URL de la tarjeta (/t/[code]) es la credencial, igual
 * que para verla. Todo bajo lock por membresía: un doble toque no canjea dos veces.
 */
export async function redeemOwn(codeArg: unknown, membershipIdArg: unknown): Promise<RedeemResult> {
  if (typeof codeArg !== "string" || codeArg.length > 32) return { ok: false, message: "Tarjeta no encontrada." };
  if (typeof membershipIdArg !== "string" || membershipIdArg.length > 64)
    return { ok: false, message: "No encontramos ese beneficio." };
  const code = codeArg.toUpperCase();

  const m = await prisma.membership.findFirst({
    where: { id: membershipIdArg, customer: { code } },
    include: { program: true },
  });
  if (!m || !m.program.active) return { ok: false, message: "No encontramos ese beneficio." };
  const program = m.program;

  let result: RedeemResult;
  if (program.type === "COUPON") {
    if (program.couponExpiresAt && program.couponExpiresAt < new Date())
      return { ok: false, message: "Este cupón está vencido." };
    result = await withMembershipLock(m.id, async (tx) => {
      const used = await tx.loyaltyEvent.findFirst({
        where: { membershipId: m.id, type: "REDEEM" },
      });
      if (used) return { ok: false, message: "Este cupón ya fue usado." };
      await tx.loyaltyEvent.create({
        data: { membershipId: m.id, type: "REDEEM", amount: 1, note: COUPON_NOTE },
      });
      return { ok: true };
    });
  } else if (program.type === "STAMPS") {
    const required = program.stampsRequired ?? 10;
    result = await withMembershipLock(m.id, async (tx) => {
      const prior = await tx.loyaltyEvent.findMany({ where: { membershipId: m.id } });
      const balance = deriveBalance(
        prior.map((e) => ({ type: e.type as EventType, amount: e.amount as unknown as number })),
      );
      if (stampProgress(balance, required).rewardsPending < 1)
        return { ok: false, message: "Todavía no completaste la tarjeta." };
      await tx.loyaltyEvent.create({
        data: { membershipId: m.id, type: "REDEEM", amount: required, note: REWARD_NOTE },
      });
      return { ok: true };
    });
  } else {
    return { ok: false, message: "No encontramos ese beneficio." };
  }

  revalidatePath(`/t/${code}`);
  return result;
}
