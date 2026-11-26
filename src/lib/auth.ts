import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { prisma } from "./prisma";

export const auth = betterAuth({
  // - /sign-up/email: el alta siempre pasa por el server action signUpOwner
  //   (crea comercio + dueño); el endpoint público permitía crear cuentas
  //   sueltas. auth.api.signUpEmail() desde el server sigue andando.
  // - /sign-in/email: se entra con usuario, no con email (el email es interno).
  // - /is-username-available: evita enumerar usuarios desde afuera.
  disabledPaths: ["/sign-up/email", "/sign-in/email", "/is-username-available"],
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
  plugins: [username({ minUsernameLength: 3, maxUsernameLength: 30 }), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
