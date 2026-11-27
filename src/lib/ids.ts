// Utilidades de identificadores legibles.

import { randomBytes, randomInt } from "node:crypto";

// Token del QR del local (/q/[token]): 128 bits aleatorios en hex. Mismo
// formato que el default de la base (gen_random_uuid sin guiones).
export function newJoinToken(): string {
  return randomBytes(16).toString("hex");
}

export function isJoinToken(t: unknown): t is string {
  return typeof t === "string" && /^[A-Za-z0-9]{16,64}$/.test(t);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

// Código de la tarjeta del cliente, tipo "A4F9-21KX" (sin 0/O/1/I para evitar confusión).
// El código es la "llave" pública de /t/[code]: 8 caracteres de 32 símbolos
// = 40 bits, con generador criptográfico (Math.random es predecible). Antes eran
// 6 caracteres (~30 bits), barrible para listar nombres de clientes.
// Los códigos viejos (formato XXXX-XX) siguen funcionando.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function customerCode(): string {
  const pick = (n: number) =>
    Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${pick(4)}-${pick(4)}`;
}
