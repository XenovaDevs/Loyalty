"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness, isOwner } from "@/lib/tenant";

export type FormResult = { error?: string; ok?: boolean } | undefined;

/** ¿El comercio ya tiene otro programa de sellos activo? (el QR suma a uno solo) */
async function otherActiveStamps(businessId: string, exceptId?: string) {
  return prisma.program.findFirst({
    where: { businessId, type: "STAMPS", active: true, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { name: true },
  });
}

export async function createProgram(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const { businessId, user } = await requireBusiness();
  if (!isOwner(user)) return { error: "Solo el dueño puede crear programas." };

  const type = String(formData.get("type") ?? "STAMPS");
  const name = String(formData.get("name") ?? "").trim();
  const rewardText = String(formData.get("rewardText") ?? "").trim();

  if (!name || !rewardText) return { error: "Completá nombre y premio." };

  if (type === "COUPON") {
    const couponCode =
      String(formData.get("couponCode") ?? "").trim().toUpperCase() || null;
    const expiresStr = String(formData.get("couponExpiresAt") ?? "").trim();
    const couponExpiresAt = expiresStr ? new Date(expiresStr) : null;
    if (couponExpiresAt && Number.isNaN(couponExpiresAt.getTime()))
      return { error: "Fecha de vencimiento inválida." };
    await prisma.program.create({
      data: { businessId, type: "COUPON", name, rewardText, couponCode, couponExpiresAt },
    });
  } else {
    const stampsRequired = Number(formData.get("stampsRequired") ?? 10);
    if (!Number.isInteger(stampsRequired) || stampsRequired < 2 || stampsRequired > 20)
      return { error: "La cantidad de sellos debe estar entre 2 y 20." };
    const other = await otherActiveStamps(businessId);
    if (other)
      return {
        error: `Ya tenés una tarjeta de sellos activa (“${other.name}”). Pausala antes de crear otra: el QR del local suma sellos a una sola.`,
      };
    await prisma.program.create({
      data: { businessId, type: "STAMPS", name, rewardText, stampsRequired },
    });
  }

  revalidatePath("/panel/programas");
  revalidatePath("/panel");
  return { ok: true };
}

export async function updateProgram(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const { businessId, user } = await requireBusiness();
  if (!isOwner(user)) return { error: "Solo el dueño puede editar programas." };
  const id = String(formData.get("id") ?? "");

  const program = await prisma.program.findFirst({ where: { id, businessId } });
  if (!program) return { error: "Programa no encontrado." };

  const name = String(formData.get("name") ?? "").trim();
  const rewardText = String(formData.get("rewardText") ?? "").trim();
  if (!name || !rewardText) return { error: "Completá nombre y descripción." };

  const data: Record<string, unknown> = { name, rewardText };

  if (program.type === "STAMPS") {
    const stampsRequired = Number(formData.get("stampsRequired") ?? 10);
    if (!Number.isInteger(stampsRequired) || stampsRequired < 2 || stampsRequired > 20)
      return { error: "La cantidad de sellos debe estar entre 2 y 20." };
    data.stampsRequired = stampsRequired;
  } else if (program.type === "COUPON") {
    data.couponCode =
      String(formData.get("couponCode") ?? "").trim().toUpperCase() || null;
    const expiresStr = String(formData.get("couponExpiresAt") ?? "").trim();
    const expires = expiresStr ? new Date(expiresStr) : null;
    if (expires && Number.isNaN(expires.getTime()))
      return { error: "Fecha de vencimiento inválida." };
    data.couponExpiresAt = expires;
  }

  await prisma.program.update({ where: { id: program.id }, data });
  revalidatePath("/panel/programas");
  return { ok: true };
}

export async function toggleProgram(programId: unknown): Promise<FormResult> {
  const { businessId, user } = await requireBusiness();
  if (!isOwner(user) || typeof programId !== "string")
    return { error: "Solo el dueño puede pausar o activar programas." };
  const program = await prisma.program.findFirst({
    where: { id: programId, businessId },
  });
  if (!program) return { error: "Programa no encontrado." };
  if (!program.active && program.type === "STAMPS") {
    const other = await otherActiveStamps(businessId, program.id);
    if (other)
      return {
        error: `Primero pausá “${other.name}”: solo puede haber una tarjeta de sellos activa.`,
      };
  }
  await prisma.program.update({
    where: { id: program.id },
    data: { active: !program.active },
  });
  revalidatePath("/panel/programas");
  return { ok: true };
}
