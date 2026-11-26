import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

// Sin baseURL: usa el origen actual del navegador (robusto ante cambios de puerto).
export const authClient = createAuthClient({ plugins: [usernameClient()] });

export const { signIn, signOut, signUp, useSession } = authClient;
