import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";

export const auth = betterAuth({
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
