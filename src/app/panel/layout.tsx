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

  return (
    <div className="relative z-10 grid min-h-dvh grid-cols-[220px_1fr]">
      <aside className="flex flex-col border-r border-ink p-6">
        <div className="mb-2 flex items-center gap-2.5 border-b border-line pb-5">
          <div className="grid size-8 place-items-center rounded-[var(--radius)] border border-ink font-display text-base font-semibold">
            {initial}
          </div>
          <div className="font-display text-lg font-semibold">Sello</div>
        </div>

        <Nav />

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-4">
          <div className="min-w-0">
            <div className="truncate text-[12.5px]">{business?.name}</div>
            <div className="font-mono text-[11px] text-faint">{user.name}</div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className="overflow-auto px-10 py-8">{children}</main>
      <AutoRefresh />
    </div>
  );
}
