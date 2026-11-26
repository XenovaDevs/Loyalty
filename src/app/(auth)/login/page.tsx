"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await signIn.username({
      username: String(fd.get("username")).toLowerCase().trim().replace(/^@/, ""),
      password: String(fd.get("password")),
    });
    setPending(false);
    if (error) {
      setError("Usuario o contraseña incorrectos.");
      return;
    }
    router.push("/panel");
    router.refresh();
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div className="mb-8">
        <Logo size={34} />
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-spot">
        Loyalty · panel
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
        Entrar
      </h1>
      <p className="mb-8 mt-1 text-sm text-ink-2">
        Accedé al panel de tu comercio.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field
          label="Usuario"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <Field
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-spot">{error}</p>}
        <button
          disabled={pending}
          className="mt-2 rounded-[var(--radius)] border border-spot bg-spot py-3 font-semibold text-paper disabled:opacity-60"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="mt-8 border-t border-line pt-5 text-sm text-ink-2">
        ¿No tenés cuenta?{" "}
        <Link href="/signup" className="font-semibold text-spot">
          Creá tu comercio
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
        className="w-full border-0 border-b border-ink bg-transparent py-2 text-base outline-none md:text-[15px] focus:border-spot"
      />
    </label>
  );
}
