"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/tenant";
import { Prisma } from "@prisma/client";
import { customerCode } from "@/lib/ids";
import { phoneKey } from "@/lib/phone";

export type FormResult = { error?: string; ok?: boolean; code?: string } | undefined;

export async function createCustomer(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const { businessId } = await requireBusiness();

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const programId = String(formData.get("programId") ?? "").trim();

  if (!name) return { error: "El nombre es obligatorio." };
  if (!phone) return { error: "El teléfono es obligatorio." };
  const key = phoneKey(phone);
  if (!key) return { error: "Teléfono inválido. Escribilo con código de área (ej. 280 415-2290)." };

  // Una tarjeta por cliente por comercio: si el teléfono ya está, no se crea otra.
  const existing = await prisma.customer.findUnique({
    where: { businessId_phoneKey: { businessId, phoneKey: key } },
    select: { name: true, code: true },
  });
  if (existing) return duplicateError(existing);

  // Código único GLOBALMENTE (la URL pública /t/[code] no lleva comercio, así
  // que un código no puede colisionar entre comercios). Reintenta ante colisión.
  let code = customerCode();
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.customer.findUnique({ where: { code } });
    if (!clash) break;
    code = customerCode();
  }

  let customer;
  try {
    customer = await prisma.customer.create({
      data: { businessId, name, phone, phoneKey: key, code },
    });
  } catch (e) {
    // Dos altas simultáneas con el mismo teléfono: la base frena la segunda.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const dup = await prisma.customer.findUnique({
        where: { businessId_phoneKey: { businessId, phoneKey: key } },
        select: { name: true, code: true },
      });
      if (dup) return duplicateError(dup);
    }
    throw e;
  }

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

function duplicateError(c: { name: string; code: string }): FormResult {
  return {
    error: `Ya existe un cliente con ese teléfono: ${c.name} (#${c.code}). Cada cliente tiene una sola tarjeta por comercio.`,
  };
}
