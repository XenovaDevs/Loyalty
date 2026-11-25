"use server";

import { prisma } from "@/lib/prisma";
import { distanceMeters, isOpenNow } from "@/lib/geo";

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
export async function checkIn(
  code: string,
  lat: number,
  lng: number,
  accuracy: number,
): Promise<CheckInResult> {
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

  if (Number.isFinite(accuracy) && accuracy > MAX_ACCURACY_M) {
    return { ok: false, message: "No pudimos ubicarte con precisión. Probá de nuevo." };
  }

  const dist = distanceMeters(lat, lng, b.latitude, b.longitude);
  if (dist > b.checkinRadiusM) {
    return {
      ok: false,
      message: `Estás a ${Math.round(dist)} m del local. Acercate para sumar.`,
    };
  }

  // Cooldown: un check-in por día.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const already = await prisma.loyaltyEvent.findFirst({
    where: {
      membershipId: visit.id,
      note: CHECKIN_NOTE,
      createdAt: { gte: startOfDay },
    },
  });
  if (already) {
    return { ok: false, message: "Ya sumaste tu visita de hoy. ¡Volvé mañana!" };
  }

  const points = visit.program.pointsPerVisit ?? 10;
  await prisma.loyaltyEvent.create({
    data: {
      membershipId: visit.id,
      type: "POINTS",
      amount: points,
      note: CHECKIN_NOTE,
    },
  });

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
