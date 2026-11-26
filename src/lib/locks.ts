import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Ejecuta `fn` en una transacción con un lock exclusivo por membresía
 * (advisory lock de Postgres, se libera solo al terminar la transacción).
 *
 * Los saldos son event-sourced: "leer saldo → decidir → insertar evento" no es
 * atómico bajo READ COMMITTED. Sin esto, dos requests en paralelo (doble click,
 * dos cajas, o un script) ven el mismo saldo y canjean/suman dos veces.
 */
export function withMembershipLock<T>(
  membershipId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${membershipId}))`;
    return fn(tx);
  });
}
