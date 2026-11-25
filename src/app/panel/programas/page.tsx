import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/tenant";
import { PageHeader, Badge } from "@/components/ui";
import { NewProgram } from "./new-program";
import { ToggleButton } from "./toggle-button";
import { EditProgram } from "./edit-program";

/** Deserializa el array JSON de mensajes del aviso (tolerante a datos inválidos). */
function parseMessages(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export default async function ProgramasPage() {
  const { businessId } = await requireBusiness();
  const programs = await prisma.program.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { memberships: true } } },
  });

  return (
    <>
      <PageHeader kicker="Fidelización" title="Programas" action={<NewProgram />} />

      {programs.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-2">
          Todavía no tenés programas. Creá el primero (ej. “Comprá 10, el 11
          gratis”).
        </p>
      ) : (
        <div className="mt-6 divide-y divide-line border-y border-line">
          {programs.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-display text-lg font-semibold">
                    {p.name}
                  </span>
                  <Badge tone={p.active ? "spot" : "neutral"}>
                    {p.active ? "Activo" : "Pausado"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-ink-2">{p.rewardText}</p>
                <p className="mt-1 font-mono text-[11px] text-faint">
                  {p.type === "VISIT"
                    ? `visita · ${p.pointsPerVisit} pts/día`
                    : p.type === "COUPON"
                      ? `cupón · ${p.couponCode ?? "sin código"}${p.couponExpiresAt ? ` · vence ${p.couponExpiresAt.toLocaleDateString("es-AR")}` : ""}`
                      : `${p.stampsRequired} sellos`}{" "}
                  · {p._count.memberships} clientes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <EditProgram
                  id={p.id}
                  type={p.type}
                  name={p.name}
                  rewardText={p.rewardText}
                  stampsRequired={p.stampsRequired}
                  pointsPerVisit={p.pointsPerVisit}
                  couponCode={p.couponCode}
                  couponExpiresAt={
                    p.couponExpiresAt
                      ? p.couponExpiresAt.toISOString().slice(0, 10)
                      : null
                  }
                  notifyEnabled={p.notifyEnabled}
                  notifyMessages={parseMessages(p.notifyMessages)}
                  notifyRadiusM={p.notifyRadiusM}
                  notifyStartHour={p.notifyStartHour}
                  notifyEndHour={p.notifyEndHour}
                />
                <ToggleButton id={p.id} active={p.active} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
