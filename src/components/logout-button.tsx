"use client";

import { logout } from "@/app/(auth)/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint hover:text-spot"
      >
        Salir
      </button>
    </form>
  );
}
