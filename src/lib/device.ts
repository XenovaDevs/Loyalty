import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * "Este celular ya tiene tarjeta en este comercio": cookie firmada (HMAC) con
 * el id del cliente, una por comercio. Es lo que hace que el segundo escaneo
 * del QR del local sume un sello en vez de pedir el alta de nuevo.
 *
 * Firmada para que no se pueda fabricar una cookie con el id de otro cliente.
 */

const MAX_AGE_S = 400 * 24 * 60 * 60; // tope de los navegadores (~13 meses)

function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Falta BETTER_AUTH_SECRET en el entorno.");
  }
  return "dev-only-device-secret";
}

function cookieName(businessId: string) {
  return `lc_${businessId}`;
}

function sign(businessId: string, customerId: string): string {
  return createHmac("sha256", secret())
    .update(`${businessId}:${customerId}`)
    .digest("base64url");
}

/** Id del cliente de este celular para el comercio, o null si no hay/es inválida. */
export async function readDeviceCustomer(businessId: string): Promise<string | null> {
  const raw = (await cookies()).get(cookieName(businessId))?.value;
  if (!raw || raw.length > 200) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const customerId = raw.slice(0, dot);
  const sig = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(sign(businessId, customerId));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  return customerId;
}

/** Recuerda en este celular la tarjeta del cliente (solo en Server Actions). */
export async function rememberDeviceCustomer(businessId: string, customerId: string) {
  (await cookies()).set(cookieName(businessId), `${customerId}.${sign(businessId, customerId)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}
