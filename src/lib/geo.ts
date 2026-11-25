// Distancia entre dos coordenadas (metros) — fórmula de Haversine.
export function distanceMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371000; // radio terrestre en metros
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Zona horaria del negocio. Hoy la app es monopaís (Argentina); si se
// internacionaliza, convertir esto en un campo por comercio.
export const BUSINESS_TZ = "America/Argentina/Buenos_Aires";

/**
 * Hora (0-23) en la zona del negocio. Clave: `isOpenNow` corre tanto en el
 * servidor (UTC) como en el cliente (hora local del visitante). Si usáramos
 * `getHours()` darían resultados distintos y el check-in se rompería fuera del
 * huso del servidor. Calcular siempre en la zona del negocio los unifica.
 */
export function hourInBusinessTz(now: Date = new Date()): number {
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    hour: "2-digit",
    hour12: false,
  }).format(now);
  return Number(h) % 24; // algunos runtimes devuelven "24" a medianoche
}

/** ¿La hora actual (en la zona del negocio) cae dentro del horario de apertura? null = sin restricción. */
export function isOpenNow(openHour: number | null, closeHour: number | null): boolean {
  if (openHour == null || closeHour == null) return true;
  const h = hourInBusinessTz();
  // Soporta horarios que cruzan medianoche (ej. 20→2).
  if (openHour <= closeHour) return h >= openHour && h < closeHour;
  return h >= openHour || h < closeHour;
}
