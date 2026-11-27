"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness, isOwner } from "@/lib/tenant";
import {
  parseGoogleMapsCoords,
  isShortMapsUrl,
  isGoogleMapsHost,
  type Coords,
} from "@/lib/maps";
import { newJoinToken } from "@/lib/ids";

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
  // Las redirecciones se siguen A MANO y cada salto se valida contra la lista
  // de hosts de Google: `redirect: "follow"` dejaría que un 30x nos lleve a
  // cualquier lado (incluida la red interna del server).
  if (!isShortMapsUrl(s)) return null;

  let url = s;
  for (let hop = 0; hop < 5; hop++) {
    if (!isGoogleMapsHost(url)) return null;
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000), // no colgar un slot del servidor
      });
    } catch {
      return null;
    }

    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      const next = new URL(location, url).toString();
      const coords = parseGoogleMapsCoords(next);
      if (coords) return coords;
      url = next;
      continue;
    }

    if (!res.ok) return null;
    // Leemos como mucho ~512 KB del cuerpo (solo de hosts de Google).
    const body = (await res.text()).slice(0, 512 * 1024);
    return parseGoogleMapsCoords(body);
  }
  return null;
}

/** Resuelve coordenadas desde un link de Google Maps (para el botón del formulario). */
export async function resolveMapsUrl(url: unknown): Promise<ResolveResult> {
  const { user } = await requireBusiness();
  // La ubicación del local solo la cambia el dueño (igual que updateLocation).
  if (!isOwner(user)) return { ok: false, error: "Solo el dueño puede cambiar la ubicación." };
  if (typeof url !== "string" || url.length > 2048)
    return { ok: false, error: "Link inválido." };
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
      openHour: openHour != null ? Math.max(0, Math.min(23, openHour)) : null,
      closeHour: closeHour != null ? Math.max(0, Math.min(23, closeHour)) : null,
    },
  });

  revalidatePath("/panel/ajustes");
  return { ok: true };
}

/** Config del aviso de cercanía del local. */
export async function updateNotify(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const { businessId, user } = await requireBusiness();
  if (!isOwner(user)) return { error: "Solo el dueño puede cambiar los ajustes." };

  const notifyEnabled = formData.get("notifyEnabled") != null;

  // Mensajes: un texto por línea → array JSON. Se elige uno al azar en cada aviso.
  const messages = String(formData.get("notifyMessages") ?? "")
    .split("\n")
    .map((s) => s.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 20);
  if (notifyEnabled && messages.length === 0)
    return { error: "Agregá al menos un mensaje para el aviso." };

  const radius = Number(String(formData.get("notifyRadiusM") ?? "").trim() || 120);
  if (!Number.isInteger(radius) || radius < 20 || radius > 5000)
    return { error: "El radio del aviso debe estar entre 20 y 5000 metros." };

  const parseHour = (key: string): number | null | "bad" => {
    const s = String(formData.get(key) ?? "").trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isInteger(n) && n >= 0 && n <= 23 ? n : "bad";
  };
  const notifyStartHour = parseHour("notifyStartHour");
  const notifyEndHour = parseHour("notifyEndHour");
  if (notifyStartHour === "bad" || notifyEndHour === "bad")
    return { error: "El horario debe ser una hora entre 0 y 23." };
  if ((notifyStartHour == null) !== (notifyEndHour == null))
    return { error: "Completá las dos horas de la franja (o ninguna)." };

  if (notifyEnabled) {
    const b = await prisma.business.findUnique({
      where: { id: businessId },
      select: { latitude: true, longitude: true },
    });
    if (b?.latitude == null || b?.longitude == null)
      return { error: "Primero cargá la ubicación del local (arriba)." };
  }

  await prisma.business.update({
    where: { id: businessId },
    data: {
      notifyEnabled,
      notifyMessages: messages.length ? JSON.stringify(messages) : null,
      notifyRadiusM: radius,
      notifyStartHour,
      notifyEndHour,
    },
  });
  revalidatePath("/panel/ajustes");
  return { ok: true };
}

/**
 * Genera un QR nuevo para el local: el anterior deja de funcionar (por si se
 * filtró una foto). Las tarjetas y sellos de los clientes no cambian.
 */
export async function regenerateJoinToken(): Promise<FormResult> {
  const { businessId, user } = await requireBusiness();
  if (!isOwner(user)) return { error: "Solo el dueño puede cambiar el QR." };
  await prisma.business.update({
    where: { id: businessId },
    data: { joinToken: newJoinToken() },
  });
  revalidatePath("/panel/ajustes");
  return { ok: true };
}
