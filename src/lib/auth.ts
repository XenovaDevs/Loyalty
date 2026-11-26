import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";

export const auth = betterAuth({
  // El alta siempre pasa por el server action signUpOwner (crea comercio +
  // dueño). El endpoint público de Better Auth permitía crear cuentas sueltas y
  // "reservar" el email de otra persona (después no podía registrarse ni ser
  // agregada como empleada). auth.api.signUpEmail() desde el server sigue andando.
  disabledPaths: ["/sign-up/email"],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // Sin verificación por email por ahora (dev / primer release).
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      // Campos de dominio expuestos en la sesión.
      businessId: { type: "string", required: false, input: false },
      role: { type: "string", required: false, input: false, defaultValue: "STAFF" },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
