import { prisma } from "@/lib/prisma";
import { requireBusiness, isOwner } from "@/lib/tenant";
import { PageHeader, Badge } from "@/components/ui";
import { NewStaff } from "./new-staff";
import { RemoveStaff } from "./remove-staff";

export default async function EquipoPage() {
  const { businessId, user } = await requireBusiness();
  const owner = isOwner(user);

  const team = await prisma.user.findMany({
    where: { businessId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, username: true, role: true },
  });

  return (
    <>
      <PageHeader
        kicker="Comercio"
        title="Equipo"
        action={owner ? <NewStaff /> : undefined}
      />

      <div className="mt-6 divide-y divide-line border-y border-line">
        {team.map((m) => (
          <div key={m.id} className="flex items-center justify-between py-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-display text-lg font-semibold">
                  {m.name}
                </span>
                <Badge tone={m.role === "OWNER" ? "ink" : "neutral"}>
                  {m.role === "OWNER" ? "Dueño" : "Empleado"}
                </Badge>
              </div>
              <p className="mt-0.5 font-mono text-[12px] text-faint">{m.username ? `@${m.username}` : "sin usuario"}</p>
            </div>
            {owner && m.role === "STAFF" && <RemoveStaff id={m.id} />}
          </div>
        ))}
      </div>
    </>
  );
}
