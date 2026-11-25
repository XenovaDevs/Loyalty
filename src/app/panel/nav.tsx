"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/panel", label: "Resumen" },
  { href: "/panel/clientes", label: "Clientes" },
  { href: "/panel/programas", label: "Programas" },
  { href: "/panel/scanner", label: "Scanner" },
  { href: "/panel/equipo", label: "Equipo" },
  { href: "/panel/ajustes", label: "Ajustes" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="mt-4 flex flex-col gap-0.5">
      {NAV.map((n) => {
        const active =
          n.href === "/panel" ? pathname === "/panel" : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`border-l-2 py-1.5 pl-2.5 text-sm ${
              active
                ? "border-spot font-semibold text-ink"
                : "border-transparent text-ink-2 hover:text-ink"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
