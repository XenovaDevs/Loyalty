"use client";

import { useEffect, useRef } from "react";
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

function isActive(pathname: string, href: string) {
  return href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
}

export function Nav({ variant = "sidebar" }: { variant?: "sidebar" | "tabs" }) {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);

  // En celular las pestañas se deslizan: mantener la activa a la vista.
  useEffect(() => {
    if (variant === "tabs")
      activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname, variant]);

  if (variant === "tabs") {
    return (
      <nav className="mt-2 flex overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              ref={active ? activeRef : undefined}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-sm ${
                active
                  ? "border-spot font-semibold text-ink"
                  : "border-transparent text-ink-2"
              }`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="mt-4 flex flex-col gap-0.5">
      {NAV.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
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
