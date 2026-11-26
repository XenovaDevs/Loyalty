"use server";

import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import { requireBusiness, isOwner } from "@/lib/tenant";
import { normalizeUsername, internalEmail, USERNAME_HINT } from "@/lib/usernames";

export type FormResult = { error?: string; ok?: boolean } | undefined;

export async function createStaff(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const { businessId, user } = await requireBusiness();
  if (!isOwner(user)) return { error: "Solo el dueño puede crear empleados." };

  const name = String(formData.get("name") ?? "").trim();
  const rawUsername = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!name || !rawUsername || password.length < 8)
    return { error: "Completá todo (contraseña de 8+ caracteres)." };
  const username = normalizeUsername(rawUsername);
  if (!username) return { error: USERNAME_HINT };

  const clash = await prisma.user.findUnique({ where: { username } });
  if (clash) return { error: "Ese usuario ya existe. Elegí otro." };

  const staff = await prisma.user.create({
    data: {
      name,
      username,
      displayUsername: username,
      email: internalEmail(),
      emailVerified: true,
      role: "STAFF",
      businessId,
    },
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
