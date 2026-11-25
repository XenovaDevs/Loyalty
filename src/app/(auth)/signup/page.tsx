"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpOwner, type AuthState } from "../actions";

export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signUpOwner,
    undefined,
  );

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-spot">
        Sello · nuevo comercio
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
        Creá tu comercio
      </h1>
      <p className="mb-8 mt-1 text-sm text-ink-2">
        Empezá a dar sellos en dos minutos.
      </p>

      <form action={action} className="flex flex-col gap-5">
        <Field label="Tu nombre" name="name" autoComplete="name" />
        <Field label="Nombre del comercio" name="business" />
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
        />
        {state?.error && <p className="text-sm text-spot">{state.error}</p>}
        <button
          disabled={pending}
          className="mt-2 rounded-[var(--radius)] border border-spot bg-spot py-3 font-semibold text-paper disabled:opacity-60"
        >
          {pending ? "Creando…" : "Crear comercio"}
        </button>
      </form>

      <p className="mt-8 border-t border-line pt-5 text-sm text-ink-2">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-semibold text-spot">
          Entrar
        </Link>
      </p>
    </main>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
        {label}
      </span>
      <input
        {...props}
        required
        className="w-full border-0 border-b border-ink bg-transparent py-2 text-[15px] outline-none focus:border-spot"
      />
    </label>
  );
}
