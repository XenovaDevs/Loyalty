import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { customerCode, slugify } from "../src/lib/ids";
import { phoneKey } from "../src/lib/phone";

const prisma = new PrismaClient();

const OWNER_USERNAME = "demo";
const OWNER_EMAIL = "demo@sin-email.invalid"; // interno: el login es por usuario
const OWNER_PASSWORD = "password123";

async function main() {
  // Crea un dueño con contraseña conocida: jamás contra la base de producción.
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_SEED !== "1") {
    throw new Error(
      "Seed deshabilitado. Es solo para desarrollo: corré con ALLOW_SEED=1 (y NUNCA en producción).",
    );
  }
  // Limpieza idempotente del comercio demo.
  const existing = await prisma.business.findUnique({
    where: { slug: "yogur-griego-rey" },
  });
  if (existing) {
    await prisma.business.delete({ where: { id: existing.id } });
  }
  await prisma.user.deleteMany({ where: { email: OWNER_EMAIL } });

  const business = await prisma.business.create({
    data: {
      name: "Yogur Griego Rey",
      slug: slugify("Yogur Griego Rey"),
      city: "Puerto Madryn",
      plan: "GROW",
      // Ubicación del local (Puerto Madryn) para el check-in por cercanía.
      latitude: -42.769201,
      longitude: -65.038515,
      checkinRadiusM: 150,
      openHour: 9,
      closeHour: 22,
    },
  });

  // Owner loginable (Better Auth: cuenta "credential" con password hasheado).
  const owner = await prisma.user.create({
    data: {
      name: "Rey",
      username: OWNER_USERNAME,
      displayUsername: OWNER_USERNAME,
      email: OWNER_EMAIL,
      emailVerified: true,
      role: "OWNER",
      businessId: business.id,
    },
  });
  await prisma.account.create({
    data: {
      accountId: owner.id,
      providerId: "credential",
      userId: owner.id,
      password: await hashPassword(OWNER_PASSWORD),
    },
  });

  // Programa de sellos.
  const program = await prisma.program.create({
    data: {
      businessId: business.id,
      type: "STAMPS",
      name: "Comprá 10, el 11 gratis",
      rewardText: "Comprá 10, el 11 es nuestro",
      stampsRequired: 10,
    },
  });

  // Programa de visitas (check-in por cercanía).
  const visitProgram = await prisma.program.create({
    data: {
      businessId: business.id,
      type: "VISIT",
      name: "Puntos por visita",
      rewardText: "Pasá y sumá puntos en cada visita",
      pointsPerVisit: 15,
    },
  });

  // Cupón de bienvenida (25% OFF, un solo uso).
  const couponProgram = await prisma.program.create({
    data: {
      businessId: business.id,
      type: "COUPON",
      name: "Cupón bienvenida",
      rewardText: "25% OFF en tu primera compra",
      couponCode: "BIENVENIDA25",
      couponExpiresAt: new Date(new Date().getFullYear(), 11, 31),
    },
  });

  // Clientes: inscriptos en sellos + visitas + cupón de bienvenida.
  const demo = [
    { name: "Sofía Martínez", phone: "280 415-2290", stamps: 7, points: 45, couponUsed: false },
    { name: "Juan Pérez", phone: "280 433-1180", stamps: 10, points: 30, couponUsed: true },
    { name: "Lucía Gómez", phone: "280 466-7781", stamps: 3, points: 0, couponUsed: false },
    { name: "Mateo Fernández", phone: "280 412-9043", stamps: 5, points: 60, couponUsed: false },
  ];

  for (const d of demo) {
    const customer = await prisma.customer.create({
      data: {
        businessId: business.id,
        name: d.name,
        phone: d.phone,
        phoneKey: phoneKey(d.phone),
        code: customerCode(),
      },
    });

    const stampMembership = await prisma.membership.create({
      data: { programId: program.id, customerId: customer.id },
    });
    await prisma.loyaltyEvent.createMany({
      data: Array.from({ length: d.stamps }, () => ({
        membershipId: stampMembership.id,
        type: "STAMP",
        amount: 1,
        staffUserId: owner.id,
      })),
    });

    const visitMembership = await prisma.membership.create({
      data: { programId: visitProgram.id, customerId: customer.id },
    });
    if (d.points > 0) {
      await prisma.loyaltyEvent.create({
        data: {
          membershipId: visitMembership.id,
          type: "POINTS",
          amount: d.points,
          note: "seed",
        },
      });
    }

    const couponMembership = await prisma.membership.create({
      data: { programId: couponProgram.id, customerId: customer.id },
    });
    if (d.couponUsed) {
      await prisma.loyaltyEvent.create({
        data: {
          membershipId: couponMembership.id,
          type: "REDEEM",
          amount: 1,
          note: "Cupón usado",
          staffUserId: owner.id,
        },
      });
    }
  }

  console.log("✔ Seed listo.");
  console.log(`  Comercio: ${business.name}`);
  console.log(`  Login:    ${OWNER_USERNAME} / ${OWNER_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
