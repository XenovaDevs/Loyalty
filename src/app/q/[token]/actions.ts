"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isOpenNow } from "@/lib/geo";
import { phoneKey } from "@/lib/phone";
import { isJoinToken } from "@/lib/ids";
import { addStamps, notifyRewardReady, QR_STAMP_NOTE } from "@/lib/stamps";
import { readDeviceCustomer, rememberDeviceCustomer } from "@/lib/device";
import {
  createCustomerWithMemberships,
  findByPhoneKey,
  lastNameMatches,
} from "@/lib/customers";

/** Resultado del escaneo; `status` viaja a la tarjeta como ?r= para el cartel. */
export type QrStatus = "sello" | "premio" | "ya" | "cerrado";

export type QrResult =
  | { ok: true; code: string; status: QrStatus }
  | { ok: false; error: string; needJoin?: boolean };

const INVALID_QR = "Este QR ya no es válido. Pedí el nuevo en el local.";
const NO_PROGRAM = "Este local todavía no tiene una tarjeta de sellos activa.";

async function loadBusiness(token: unknown) {
  if (!isJoinToken(token)) return null;
  return prisma.business.findUnique({
    where: { joinToken: token },
    include: {
      programs: {
        where: { type: "STAMPS", active: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });
}

type Biz = NonNullable<Awaited<ReturnType<typeof loadBusiness>>>;
type StampProgram = Biz["programs"][number];

/** Suma el sello del día al cliente (si el local está abierto y no sumó hoy). */
async function stampFor(
  b: Biz,
  program: StampProgram,
  customer: { id: string; code: string },
): Promise<QrStatus> {
  // Un cliente dado de alta antes de que existiera este programa puede no
  // estar inscripto: lo inscribimos al vuelo.
  const membership = await prisma.membership.upsert({
    where: { programId_customerId: { programId: program.id, customerId: customer.id } },
    create: { programId: program.id, customerId: customer.id },
    update: {},
  });

  if (!isOpenNow(b.openHour, b.closeHour)) return "cerrado";

  const r = await addStamps({
    membershipId: membership.id,
    required: program.stampsRequired ?? 10,
    qty: 1,
    note: QR_STAMP_NOTE,
    oncePerDay: true,
  });
  if (!r.added) return "ya";
  if (r.crossedReward) {
    notifyRewardReady(customer.id, customer.code, program.rewardText);
    return "premio";
  }
  return "sello";
}

/** Segundo escaneo en adelante: el celular ya tiene tarjeta → suma un sello. */
export async function stampByQr(token: unknown): Promise<QrResult> {
  const b = await loadBusiness(token);
  if (!b) return { ok: false, error: INVALID_QR };
  const program = b.programs[0];
  if (!program) return { ok: false, error: NO_PROGRAM };

  const customerId = await readDeviceCustomer(b.id);
  const customer = customerId
    ? await prisma.customer.findFirst({
        where: { id: customerId, businessId: b.id },
        select: { id: true, code: true },
      })
    : null;
  if (!customer) return { ok: false, error: "Necesitamos tus datos.", needJoin: true };

  const status = await stampFor(b, program, customer);
  return { ok: true, code: customer.code, status };
}

// Los server actions se pueden llamar directo con cualquier dato: validar.
const JoinInput = z.object({
  token: z.string().max(64),
  firstName: z.string().trim().min(1, "Escribí tu nombre.").max(60),
  lastName: z.string().trim().min(1, "Escribí tu apellido.").max(60),
  phone: z.string().trim().min(1, "Escribí tu teléfono.").max(40),
});

/**
 * Primer escaneo: alta con nombre, apellido y teléfono → tarjeta + primer sello.
 * Si el teléfono ya tiene tarjeta en el local (cambió de celular, borró el
 * navegador) y el apellido coincide, recupera esa tarjeta en este celular.
 *
 * Termina con redirect() y no devolviendo el resultado: al setear la cookie,
 * Next re-renderiza /q, que ya reconoce al cliente y dispararía el sello
 * automático (pisando el cartel de bienvenida). Solo devuelve en error.
 */
export async function joinByQr(
  _prev: QrResult | undefined,
  formData: FormData,
): Promise<QrResult> {
  const parsed = JoinInput.safeParse({
    token: formData.get("token"),
    firstName: formData.get("firstName") ?? "",
    lastName: formData.get("lastName") ?? "",
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }
  const { token, firstName, lastName, phone } = parsed.data;

  const b = await loadBusiness(token);
  if (!b) return { ok: false, error: INVALID_QR };
  const program = b.programs[0];
  if (!program) return { ok: false, error: NO_PROGRAM };

  const key = phoneKey(phone);
  if (!key) {
    return {
      ok: false,
      error: "Teléfono inválido. Escribilo con código de área (ej. 280 415-2290).",
    };
  }

  const name = `${firstName} ${lastName}`.replace(/\s+/g, " ");
  let nuevo = false;
  let customer = await findByPhoneKey(b.id, key);
  if (!customer) {
    customer = await createCustomerWithMemberships(
      { businessId: b.id, name, phone, phoneKey: key },
      [program.id],
    );
    if (customer) nuevo = true;
    // null = otra alta con el mismo teléfono ganó la carrera: seguimos con esa.
    else customer = await findByPhoneKey(b.id, key);
    if (!customer) return { ok: false, error: "No pudimos crear tu tarjeta. Probá de nuevo." };
  }

  // Recuperar una tarjeta existente exige que coincida el apellido: saber el
  // teléfono de alguien no alcanza para quedarse con sus sellos.
  if (!nuevo && !lastNameMatches(customer.name, lastName)) {
    return {
      ok: false,
      error:
        "Ese teléfono ya tiene una tarjeta a otro nombre. Revisá el apellido o pedí ayuda en la caja.",
    };
  }

  await rememberDeviceCustomer(b.id, customer.id);
  const status = await stampFor(b, program, customer);
  redirect(`/t/${customer.code}?r=${status}${nuevo ? "&nuevo=1" : ""}`);
}
