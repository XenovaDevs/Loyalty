import { prisma } from "@/lib/prisma";
import { requireBusiness, isOwner } from "@/lib/tenant";
import { PageHeader, Badge } from "@/components/ui";
import { NewProgram } from "./new-program";
import { ToggleButton } from "./toggle-button";
import { EditProgram } from "./edit-program";

export default async function ProgramasPage() {
  const { businessId, user } = await requireBusiness();
  // Crear/editar/pausar programas es solo del dueño (las acciones también lo exigen).
  const owner = isOwner(user);
  const programs = await prisma.program.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { memberships: true } } },
  });

  return (
    <>
      <PageHeader kicker="Fidelización" title="Programas" action={owner ? <NewProgram /> : undefined} />

      {programs.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-2">
          Todavía no tenés programas. Creá el primero (ej. “Comprá 10, el 11
          gratis”).
        </p>
      ) : (
        <div className="mt-6 divide-y divide-line border-y border-line">
          {programs.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="font-display text-lg font-semibold leading-snug">
                    {p.name}
                  </span>
                  <Badge tone={p.active ? "spot" : "neutral"}>
                    {p.active ? "Activo" : "Pausado"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-ink-2">{p.rewardText}</p>
                <p className="mt-1 font-mono text-[11px] text-faint">
                  {p.type === "COUPON"
                    ? `cupón · ${p.couponCode ?? "sin código"}${p.couponExpiresAt ? ` · vence ${p.couponExpiresAt.toLocaleDateString("es-AR")}` : ""}`
                    : `${p.stampsRequired} sellos`}{" "}
                  · {p._count.memberships} clientes
                </p>
              </div>
              {owner && (
              <div className="flex shrink-0 items-center gap-2">
                <EditProgram
                  id={p.id}
                  type={p.type}
                  name={p.name}
                  rewardText={p.rewardText}
                  stampsRequired={p.stampsRequired}
                  couponCode={p.couponCode}
                  couponExpiresAt={
                    p.couponExpiresAt
                      ? p.couponExpiresAt.toISOString().slice(0, 10)
                      : null
                  }
                />
                <ToggleButton id={p.id} active={p.active} />
              </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
