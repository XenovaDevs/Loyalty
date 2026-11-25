"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/tenant";

export type FormResult = { error?: string; ok?: boolean } | undefined;

type NotifyData = {
  notifyEnabled: boolean;
  notifyMessages: string | null;
  notifyRadiusM: number | null;
  notifyStartHour: number | null;
  notifyEndHour: number | null;
};

/** Lee y valida la config de avisos por cercanía desde el formulario. */
function parseNotify(formData: FormData): NotifyData | { error: string } {
  const notifyEnabled = formData.get("notifyEnabled") != null;

  // Mensajes: un texto por línea → array JSON. Se elige uno al azar en cada aviso.
  const raw = String(formData.get("notifyMessages") ?? "");
  const messages = raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (notifyEnabled && messages.length === 0)
    return { error: "Agregá al menos un mensaje para el aviso." };
  const notifyMessages = messages.length ? JSON.stringify(messages) : null;

  const radiusStr = String(formData.get("notifyRadiusM") ?? "").trim();
  let notifyRadiusM: number | null = null;
  if (radiusStr) {
    const n = Number(radiusStr);
    if (!Number.isInteger(n) || n < 10 || n > 5000)
      return { error: "El radio del aviso debe estar entre 10 y 5000 metros." };
    notifyRadiusM = n;
  }

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

  return {
    notifyEnabled,
    notifyMessages,
    notifyRadiusM,
    notifyStartHour,
    notifyEndHour,
  };
}

export async function createProgram(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const { businessId } = await requireBusiness();

  const type = String(formData.get("type") ?? "STAMPS");
  const name = String(formData.get("name") ?? "").trim();
  const rewardText = String(formData.get("rewardText") ?? "").trim();

  if (!name || !rewardText) return { error: "Completá nombre y premio." };

  const notify = parseNotify(formData);
  if ("error" in notify) return { error: notify.error };

  if (type === "VISIT") {
    const pointsPerVisit = Number(formData.get("pointsPerVisit") ?? 10);
    if (!Number.isInteger(pointsPerVisit) || pointsPerVisit < 1 || pointsPerVisit > 1000)
      return { error: "Los puntos por visita deben estar entre 1 y 1000." };
    await prisma.program.create({
      data: { businessId, type: "VISIT", name, rewardText, pointsPerVisit, ...notify },
    });
  } else if (type === "COUPON") {
    const couponCode =
      String(formData.get("couponCode") ?? "").trim().toUpperCase() || null;
    const expiresStr = String(formData.get("couponExpiresAt") ?? "").trim();
    const couponExpiresAt = expiresStr ? new Date(expiresStr) : null;
    if (couponExpiresAt && Number.isNaN(couponExpiresAt.getTime()))
      return { error: "Fecha de vencimiento inválida." };
    await prisma.program.create({
      data: { businessId, type: "COUPON", name, rewardText, couponCode, couponExpiresAt, ...notify },
    });
  } else {
    const stampsRequired = Number(formData.get("stampsRequired") ?? 10);
    if (!Number.isInteger(stampsRequired) || stampsRequired < 2 || stampsRequired > 20)
      return { error: "La cantidad de sellos debe estar entre 2 y 20." };
    await prisma.program.create({
      data: { businessId, type: "STAMPS", name, rewardText, stampsRequired, ...notify },
    });
  }

  revalidatePath("/panel/programas");
  revalidatePath("/panel");
  return { ok: true };
}

export async function updateProgram(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const { businessId } = await requireBusiness();
  const id = String(formData.get("id") ?? "");

  const program = await prisma.program.findFirst({ where: { id, businessId } });
  if (!program) return { error: "Programa no encontrado." };

  const name = String(formData.get("name") ?? "").trim();
  const rewardText = String(formData.get("rewardText") ?? "").trim();
  if (!name || !rewardText) return { error: "Completá nombre y descripción." };

  const notify = parseNotify(formData);
  if ("error" in notify) return { error: notify.error };

  const data: Record<string, unknown> = { name, rewardText, ...notify };

  if (program.type === "STAMPS") {
    const stampsRequired = Number(formData.get("stampsRequired") ?? 10);
    if (!Number.isInteger(stampsRequired) || stampsRequired < 2 || stampsRequired > 20)
      return { error: "La cantidad de sellos debe estar entre 2 y 20." };
    data.stampsRequired = stampsRequired;
  } else if (program.type === "VISIT") {
    const pointsPerVisit = Number(formData.get("pointsPerVisit") ?? 10);
    if (!Number.isInteger(pointsPerVisit) || pointsPerVisit < 1 || pointsPerVisit > 1000)
      return { error: "Los puntos por visita deben estar entre 1 y 1000." };
    data.pointsPerVisit = pointsPerVisit;
  } else if (program.type === "COUPON") {
    data.couponCode =
      String(formData.get("couponCode") ?? "").trim().toUpperCase() || null;
    const expiresStr = String(formData.get("couponExpiresAt") ?? "").trim();
    const expires = expiresStr ? new Date(expiresStr) : null;
    if (expires && Number.isNaN(expires.getTime()))
      return { error: "Fecha de vencimiento inválida." };
    data.couponExpiresAt = expires;
  }

  await prisma.program.update({ where: { id: program.id }, data });
  revalidatePath("/panel/programas");
  return { ok: true };
}

export async function toggleProgram(programId: string) {
  const { businessId } = await requireBusiness();
  const program = await prisma.program.findFirst({
    where: { id: programId, businessId },
  });
  if (!program) return;
  await prisma.program.update({
    where: { id: program.id },
    data: { active: !program.active },
  });
  revalidatePath("/panel/programas");
}
