import { createAuthClient } from "better-auth/react";

// Sin baseURL: usa el origen actual del navegador (robusto ante cambios de puerto).
export const authClient = createAuthClient();

export const { signIn, signOut, signUp, useSession } = authClient;
