"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness, isOwner } from "@/lib/tenant";
import { parseGoogleMapsCoords, isShortMapsUrl, type Coords } from "@/lib/maps";

export type FormResult = { error?: string; ok?: boolean } | undefined;

export type ResolveResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; error: string };

/**
 * Extrae coordenadas de un link de Google Maps. Si es un link acortado
 * (maps.app.goo.gl / goo.gl), lo sigue del lado del servidor para expandirlo.
 * Devuelve null si no se pueden obtener.
 */
async function coordsFromMapsUrl(input: string): Promise<Coords | null> {
  const s = input.trim();
  if (!s) return null;

  // Primero intentamos parsear el link tal cual (links completos traen las
  // coordenadas en la propia URL, sin salir a la red).
  const direct = parseGoogleMapsCoords(s);
  if (direct) return direct;

  // Solo seguimos links ACORTADOS de Google (maps.app.goo.gl / goo.gl). No
  // hacemos fetch de URLs arbitrarias: evita SSRF a hosts internos y cuelgues.
  if (isShortMapsUrl(s)) {
    try {
      const res = await fetch(s, {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000), // no colgar un slot del servidor
      });
      return (
        parseGoogleMapsCoords(res.url) ??
        parseGoogleMapsCoords(await res.text())
      );
    } catch {
      return null;
    }
  }
  return null;
}

/** Resuelve coordenadas desde un link de Google Maps (para el botón del formulario). */
export async function resolveMapsUrl(url: string): Promise<ResolveResult> {
  await requireBusiness();
  if (!url.trim()) return { ok: false, error: "Pegá un link de Google Maps." };
  const coords = await coordsFromMapsUrl(url);
  if (!coords)
    return {
      ok: false,
      error:
        "No encontramos coordenadas en ese link. Abrí el lugar en Google Maps y copiá el link.",
    };
  return { ok: true, lat: coords.lat, lng: coords.lng };
}

export async function updateLocation(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const { businessId, user } = await requireBusiness();
  if (!isOwner(user)) return { error: "Solo el dueño puede cambiar los ajustes." };

  const num = (k: string) => {
    const v = formData.get(k);
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  let latitude = num("latitude");
  let longitude = num("longitude");
  const radius = num("checkinRadiusM") ?? 120;
  const openHour = num("openHour");
  const closeHour = num("closeHour");

  // Link de Google Maps: si viene, derivamos las coordenadas automáticamente
  // (así no hace falta tocar el botón "Usar link" antes de guardar).
  const mapsUrl = String(formData.get("mapsUrl") ?? "").trim() || null;
  if (mapsUrl) {
    const coords = await coordsFromMapsUrl(mapsUrl);
    if (!coords) {
      return {
        error:
          "No pudimos obtener la ubicación de ese link de Google Maps. Revisalo o cargá lat/long a mano.",
      };
    }
    latitude = coords.lat;
    longitude = coords.lng;
  }

  if ((latitude == null) !== (longitude == null)) {
    return { error: "Cargá latitud y longitud juntas (o ninguna)." };
  }

  await prisma.business.update({
    where: { id: businessId },
    data: {
      latitude,
      longitude,
      mapsUrl,
      checkinRadiusM: Math.max(20, Math.min(2000, radius)),
      openHour: openHour != null ? Math.max(0, Math.min(23, openHour)) : null,
      closeHour: closeHour != null ? Math.max(0, Math.min(23, closeHour)) : null,
    },
  });

  revalidatePath("/panel/ajustes");
  return { ok: true };
}
