import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/logout-button";
import { AutoRefresh } from "@/components/auto-refresh";
import { Nav } from "./nav";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const business = user.businessId
    ? await prisma.business.findUnique({ where: { id: user.businessId } })
    : null;

  const initial = (business?.name ?? "S").charAt(0).toUpperCase();

  const brand = (
    <div className="flex items-center gap-2.5">
      <div className="grid size-8 shrink-0 place-items-center rounded-[var(--radius)] border border-ink font-display text-base font-semibold">
        {initial}
      </div>
      <div className="font-display text-lg font-semibold">Sello</div>
    </div>
  );

  return (
    <div className="relative z-10 min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      {/* Celular: barra superior fija + pestañas deslizables. */}
      <header className="sticky top-0 z-40 border-b border-ink bg-paper md:hidden">
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          {brand}
          <div className="flex min-w-0 items-center gap-1">
            <div className="min-w-0 text-right">
              <div className="truncate text-[12.5px]">{business?.name}</div>
              <div className="truncate font-mono text-[11px] text-faint">{user.name}</div>
            </div>
            <LogoutButton />
          </div>
        </div>
        <Nav variant="tabs" />
      </header>

      {/* Escritorio: barra lateral. */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-ink p-6 md:flex">
        <div className="mb-2 border-b border-line pb-5">{brand}</div>

        <Nav variant="sidebar" />

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-4">
          <div className="min-w-0">
            <div className="truncate text-[12.5px]">{business?.name}</div>
            <div className="font-mono text-[11px] text-faint">{user.name}</div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className="min-w-0 px-4 pb-10 pt-6 md:px-10 md:py-8">{children}</main>
      <AutoRefresh />
    </div>
  );
}
