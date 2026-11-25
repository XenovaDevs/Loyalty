import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

/** Sesión actual (o null) en server components / actions. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Exige sesión; si no hay, redirige a /login. Devuelve el usuario. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}
