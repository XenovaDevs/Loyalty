import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { customerCode } from "./ids";

export type NewCustomer = {
  businessId: string;
  name: string;
  phone: string;
  phoneKey: string;
};

/**
 * Crea un cliente con código único GLOBALMENTE (la URL pública /t/[code] no
 * lleva comercio) y lo inscribe en `programIds` + todos los cupones activos
 * (bienvenida).
 *
 * Devuelve null si el teléfono ya existe en el comercio (incluida la carrera de
 * dos altas simultáneas: la base frena la segunda con P2002).
 */
export async function createCustomerWithMemberships(
  data: NewCustomer,
  programIds: string[],
) {
  let code = customerCode();
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.customer.findUnique({ where: { code } });
    if (!clash) break;
    code = customerCode();
  }

  let customer;
  try {
    customer = await prisma.customer.create({ data: { ...data, code } });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002" &&
      (await findByPhoneKey(data.businessId, data.phoneKey))
    ) {
      return null;
    }
    throw e;
  }

  const enroll = new Set<string>();
  if (programIds.length) {
    const own = await prisma.program.findMany({
      where: { id: { in: programIds }, businessId: data.businessId },
      select: { id: true },
    });
    own.forEach((p) => enroll.add(p.id));
  }
  const coupons = await prisma.program.findMany({
    where: { businessId: data.businessId, active: true, type: "COUPON" },
    select: { id: true },
  });
  coupons.forEach((c) => enroll.add(c.id));

  if (enroll.size) {
    await prisma.membership.createMany({
      data: [...enroll].map((programId) => ({ programId, customerId: customer.id })),
      skipDuplicates: true,
    });
  }
  return customer;
}

export function findByPhoneKey(businessId: string, phoneKey: string) {
  return prisma.customer.findUnique({
    where: { businessId_phoneKey: { businessId, phoneKey } },
  });
}

/** Minúsculas, sin acentos ni espacios repetidos (para comparar nombres). */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ") // la ñ ya quedó como n (NFD)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ¿El apellido ingresado coincide con el del cliente guardado? El nombre se
 * guarda completo ("Sofía Martínez"), así que se compara contra el final
 * (soporta apellidos compuestos: "de la Fuente").
 */
export function lastNameMatches(storedFullName: string, lastName: string): boolean {
  const full = normalizeName(storedFullName);
  const last = normalizeName(lastName);
  if (!last) return false;
  return full === last || full.endsWith(` ${last}`);
}
