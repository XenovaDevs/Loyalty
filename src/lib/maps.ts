// Extrae coordenadas (lat,lng) de una URL/texto de Google Maps.
// Soporta los formatos habituales de un link pegado desde el navegador o la app.

export type Coords = { lat: number; lng: number };

function valid(lat: number, lng: number): Coords | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * Parsea coordenadas de un link de Google Maps COMPLETO (no acortado).
 * Orden de preferencia: el pin del lugar (!3d!4d) es más preciso que el
 * centro del mapa (@lat,lng); luego parámetros tipo q=/ll=/query=.
 */
export function parseGoogleMapsCoords(input: string): Coords | null {
  const s = input.trim();
  if (!s) return null;

  // Pin real del lugar: ...!3d-34.6037!4d-58.3816
  const pin = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (pin) {
    const c = valid(Number(pin[1]), Number(pin[2]));
    if (c) return c;
  }

  // Centro del mapa: /@-34.6037,-58.3816,17z
  const at = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) {
    const c = valid(Number(at[1]), Number(at[2]));
    if (c) return c;
  }

  // Parámetros con coordenadas: ?q=-34.6,-58.3  ·  &ll=  ·  &query=  ·  &destination=
  const param = s.match(
    /[?&](?:q|ll|query|destination|center)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  );
  if (param) {
    const c = valid(Number(param[1]), Number(param[2]));
    if (c) return c;
  }

  return null;
}

/** ¿Es un link acortado de Google Maps que hay que expandir en el servidor? */
export function isShortMapsUrl(input: string): boolean {
  return /https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(input.trim());
}
