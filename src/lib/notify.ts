/** Deserializa el array JSON de mensajes del aviso (tolerante a datos inválidos). */
export function parseMessages(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}
