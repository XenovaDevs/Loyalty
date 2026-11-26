"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/ids";
import { normalizeUsername, internalEmail, USERNAME_HINT } from "@/lib/usernames";

export type AuthState = { error?: string } | undefined;

/** Onboarding: crea el comercio + el usuario OWNER y deja la sesión abierta. */
export async function signUpOwner(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const businessName = String(formData.get("business") ?? "").trim();
  const rawUsername = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!name || !businessName || !rawUsername || password.length < 8) {
    return { error: "Completá todos los campos (contraseña de 8+ caracteres)." };
  }
  const username = normalizeUsername(rawUsername);
  if (!username) return { error: USERNAME_HINT };
  if (await prisma.user.findUnique({ where: { username } })) {
    return { error: "Ese usuario ya existe. Elegí otro." };
  }

  try {
    await auth.api.signUpEmail({
      body: { name, email: internalEmail(), password, username },
      headers: await headers(),
    });
  } catch {
    return { error: "No se pudo crear la cuenta. Probá con otro usuario." };
  }

  // Asociar el comercio al usuario recién creado.
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return { error: "No se pudo crear la cuenta." };

  let slug = slugify(businessName) || "comercio";
  if (await prisma.business.findUnique({ where: { slug } })) {
    slug = `${slug}-${user.id.slice(0, 4)}`;
  }

  const business = await prisma.business.create({
    data: { name: businessName, slug },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { role: "OWNER", businessId: business.id },
  });

  redirect("/panel");
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
