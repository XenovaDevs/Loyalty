"use client";

import { logout } from "@/app/(auth)/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="-mr-2 px-2 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-faint hover:text-spot"
      >
        Salir
      </button>
    </form>
  );
}
