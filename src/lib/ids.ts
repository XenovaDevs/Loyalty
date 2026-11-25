// Utilidades de identificadores legibles.

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

// Código corto tipo "A4F9-21" para la tarjeta del cliente (sin 0/O/1/I para evitar confusión).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function customerCode(): string {
  const pick = (n: number) =>
    Array.from({ length: n }, () =>
      ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
    ).join("");
  return `${pick(4)}-${pick(2)}`;
}
