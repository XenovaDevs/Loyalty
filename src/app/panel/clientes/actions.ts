"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/tenant";
import { customerCode } from "@/lib/ids";

export type FormResult = { error?: string; ok?: boolean; code?: string } | undefined;

export async function createCustomer(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const { businessId } = await requireBusiness();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const programId = String(formData.get("programId") ?? "").trim();

  if (!name) return { error: "El nombre es obligatorio." };

  // Código único GLOBALMENTE (la URL pública /t/[code] no lleva comercio, así
  // que un código no puede colisionar entre comercios). Reintenta ante colisión.
  let code = customerCode();
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.customer.findUnique({ where: { code } });
    if (!clash) break;
    code = customerCode();
  }

  const customer = await prisma.customer.create({
    data: { businessId, name, phone, code },
  });

  // Programas a inscribir: el elegido + todos los cupones activos (bienvenida).
  const enroll = new Set<string>();
  if (programId) {
    const program = await prisma.program.findFirst({
      where: { id: programId, businessId },
    });
    if (program) enroll.add(program.id);
  }
  const coupons = await prisma.program.findMany({
    where: { businessId, active: true, type: "COUPON" },
    select: { id: true },
  });
  coupons.forEach((c) => enroll.add(c.id));

  for (const pid of enroll) {
    await prisma.membership.create({
      data: { programId: pid, customerId: customer.id },
    });
  }

  revalidatePath("/panel/clientes");
  revalidatePath("/panel");
  return { ok: true, code };
}
