import { randomUUID } from "node:crypto";

// Login por usuario + contraseña (sin email). Mismas reglas que el plugin
// `username` de Better Auth: 3-30 caracteres, letras, números, "_" y ".",
// guardado en minúsculas.
const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;

export function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  return USERNAME_RE.test(u) ? u : null;
}

export const USERNAME_HINT =
  "El usuario debe tener entre 3 y 30 caracteres: letras, números, punto o guion bajo.";

/**
 * Better Auth exige un email único por usuario. Como la app no lo pide,
 * generamos uno interno, aleatorio y en el TLD reservado `.invalid` (RFC 2606):
 * nunca se muestra, nunca recibe correo y no se puede usar para entrar
 * (el login por email está deshabilitado).
 */
export function internalEmail(): string {
  return `${randomUUID()}@sin-email.invalid`;
}
