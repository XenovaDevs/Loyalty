"use server";

import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import { requireBusiness, isOwner } from "@/lib/tenant";

export type FormResult = { error?: string; ok?: boolean } | undefined;

export async function createStaff(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const { businessId, user } = await requireBusiness();
  if (!isOwner(user)) return { error: "Solo el dueño puede crear empleados." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 8)
    return { error: "Completá todo (contraseña de 8+ caracteres)." };

  const clash = await prisma.user.findUnique({ where: { email } });
  if (clash) return { error: "Ese email ya está en uso." };

  const staff = await prisma.user.create({
    data: { name, email, emailVerified: true, role: "STAFF", businessId },
  });
  await prisma.account.create({
    data: {
      accountId: staff.id,
      providerId: "credential",
      userId: staff.id,
      password: await hashPassword(password),
    },
  });

  revalidatePath("/panel/equipo");
  return { ok: true };
}

export async function removeStaff(userId: string) {
  const { businessId, user } = await requireBusiness();
  if (!isOwner(user)) return;
  if (userId === user.id) return; // no borrarse a sí mismo
  const target = await prisma.user.findFirst({
    where: { id: userId, businessId, role: "STAFF" },
  });
  if (!target) return;
  await prisma.user.delete({ where: { id: target.id } });
  revalidatePath("/panel/equipo");
}
