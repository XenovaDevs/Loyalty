import { redirect } from "next/navigation";
import { requireUser } from "./session";

/** Exige sesión + comercio asociado. Devuelve el usuario y su businessId. */
export async function requireBusiness() {
  const user = await requireUser();
  if (!user.businessId) redirect("/signup");
  return { user, businessId: user.businessId };
}

export function isOwner(user: { role?: string | null }) {
  return user.role === "OWNER";
}
