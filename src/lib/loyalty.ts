import { Prisma } from "@prisma/client";

/**
 * El saldo es DERIVADO de los eventos, nunca un contador mutable.
 * STAMP/POINTS/ADJUST suman; REDEEM resta.
 */

export type EventType = "STAMP" | "POINTS" | "REDEEM" | "ADJUST";

export type LoyaltyEventLike = {
  type: EventType;
  amount: Prisma.Decimal | number | string;
};

function toNumber(amount: Prisma.Decimal | number | string): number {
  if (amount instanceof Prisma.Decimal) return amount.toNumber();
  return typeof amount === "string" ? parseFloat(amount) : amount;
}

/** Saldo actual (sellos o puntos) de una membresía a partir de sus eventos. */
export function deriveBalance(events: LoyaltyEventLike[]): number {
  return events.reduce((acc, e) => {
    const n = toNumber(e.amount);
    return e.type === "REDEEM" ? acc - n : acc + n;
  }, 0);
}

/** Estado de progreso para una tarjeta de sellos. */
export function stampProgress(balanceRaw: number, required: number) {
  const required_ = Math.max(1, required);
  const bal = Math.max(0, Math.floor(balanceRaw)); // los sellos no son negativos
  const inCycle = bal % required_;
  const completed = Math.floor(bal / required_);
  const rewardsPending = completed; // premios desbloqueados y aún no canjeados
  // "Completo" = hay al menos un premio pendiente. OJO: no exigir inCycle===0,
  // porque un "+2" puede pasar de 8 a 10 (overshoot) dejando inCycle=1 pero con
  // un premio ganado que SÍ debe poder canjearse.
  const isComplete = completed >= 1;
  return {
    // Con premio pendiente mostramos la tarjeta llena; si no, el avance real.
    filled: isComplete ? required_ : inCycle,
    required: required_,
    remaining: isComplete ? 0 : required_ - inCycle,
    isComplete,
    rewardsPending,
  };
}
