"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { distanceMeters, isOpenNow, dayKeyInBusinessTz } from "@/lib/geo";
import { withMembershipLock } from "@/lib/locks";

const CHECKIN_NOTE = "checkin";
const MAX_ACCURACY_M = 200; // rechaza lecturas de GPS muy imprecisas

export type CheckInResult = {
  ok: boolean;
  message: string;
  points?: number;
  balance?: number;
};

/**
 * Check-in por cercanía: suma puntos si el cliente está dentro del radio del
 * local, en horario de apertura, y no hizo check-in hoy.
 */
// Los server actions se pueden llamar directo con cualquier argumento: validar.
// (Antes un lat/lng NaN hacía que `dist > radio` diera false y pasara el chequeo.)
const CheckInInput = z.object({
  code: z.string().min(1).max(32),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().min(0).max(100_000),
});

export async function checkIn(
  codeArg: unknown,
  latArg: unknown,
  lngArg: unknown,
  accuracyArg: unknown,
): Promise<CheckInResult> {
  const parsed = CheckInInput.safeParse({
    code: codeArg,
    lat: latArg,
    lng: lngArg,
    accuracy: accuracyArg,
  });
  if (!parsed.success) return { ok: false, message: "No pudimos ubicarte. Probá de nuevo." };
  const { code, lat, lng, accuracy } = parsed.data;

  const customer = await prisma.customer.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      business: true,
      memberships: { include: { program: true, events: true } },
    },
  });
  if (!customer) return { ok: false, message: "Tarjeta no encontrada." };

  const b = customer.business;
  if (b.latitude == null || b.longitude == null) {
    return { ok: false, message: "Este comercio todavía no activó el check-in." };
  }

  const visit = customer.memberships.find(
    (m) => m.program.type === "VISIT" && m.program.active,
  );
  if (!visit) {
    return { ok: false, message: "No tenés un programa de visitas activo." };
  }

  if (!isOpenNow(b.openHour, b.closeHour)) {
    return { ok: false, message: "El check-in solo cuenta en horario del local." };
  }

  if (accuracy > MAX_ACCURACY_M) {
    return { ok: false, message: "No pudimos ubicarte con precisión. Probá de nuevo." };
  }

  const dist = distanceMeters(lat, lng, b.latitude, b.longitude);
  if (dist > b.checkinRadiusM) {
    return {
      ok: false,
      message: `Estás a ${Math.round(dist)} m del local. Acercate para sumar.`,
    };
  }

  // Cooldown: un check-in por día (día calendario en la zona del negocio, no
  // del servidor en UTC). Chequeo + inserción bajo lock por membresía: sin él,
  // N requests en paralelo pasaban todas el "¿ya hizo check-in hoy?".
  const points = visit.program.pointsPerVisit ?? 10;
  const today = dayKeyInBusinessTz();
  const added = await withMembershipLock(visit.id, async (tx) => {
    const last = await tx.loyaltyEvent.findFirst({
      where: { membershipId: visit.id, note: CHECKIN_NOTE },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (last && dayKeyInBusinessTz(last.createdAt) === today) return false;
    await tx.loyaltyEvent.create({
      data: {
        membershipId: visit.id,
        type: "POINTS",
        amount: points,
        note: CHECKIN_NOTE,
      },
    });
    return true;
  });
  if (!added) {
    return { ok: false, message: "Ya sumaste tu visita de hoy. ¡Volvé mañana!" };
  }

  // Saldo de puntos actualizado.
  const events = await prisma.loyaltyEvent.findMany({
    where: { membershipId: visit.id },
  });
  const balance = events.reduce((acc, e) => {
    const n = Number(e.amount);
    return e.type === "REDEEM" ? acc - n : acc + n;
  }, 0);

  return {
    ok: true,
    message: `¡Sumaste ${points} puntos por tu visita!`,
    points,
    balance,
  };
}
