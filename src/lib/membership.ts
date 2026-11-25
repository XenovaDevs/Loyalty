import { prisma } from "./prisma";
import { deriveBalance, stampProgress } from "./loyalty";

/** Busca un cliente por código dentro de un comercio, con su membresía de sellos. */
export async function findCustomerByCode(businessId: string, codeRaw: string) {
  const code = codeRaw.trim().replace(/^#/, "").toUpperCase();
  if (!code) return null;

  const customer = await prisma.customer.findUnique({
    where: { businessId_code: { businessId, code } },
    include: {
      memberships: {
        include: { program: true, events: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return customer;
}

type MembershipWithEvents = {
  program: { stampsRequired: number | null; rewardText: string; name: string };
  events: { type: string; amount: unknown }[];
};

/** Calcula el progreso de sellos de una membresía a partir de sus eventos. */
export function progressOf(m: MembershipWithEvents) {
  const required = m.program.stampsRequired ?? 10;
  const balance = deriveBalance(
    m.events.map((e) => ({
      type: e.type as "STAMP" | "POINTS" | "REDEEM" | "ADJUST",
      amount: e.amount as number,
    })),
  );
  return { balance, ...stampProgress(balance, required) };
}
