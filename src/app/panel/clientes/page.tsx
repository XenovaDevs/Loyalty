import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/tenant";
import { progressOf } from "@/lib/membership";
import { deriveBalance, type EventType } from "@/lib/loyalty";
import { PageHeader } from "@/components/ui";
import { NewCustomer } from "./new-customer";

export default async function ClientesPage() {
  const { businessId } = await requireBusiness();

  const [customers, programs] = await Promise.all([
    prisma.customer.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      include: {
        memberships: { include: { program: true, events: true } },
      },
    }),
    prisma.program.findMany({
      where: { businessId, active: true },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        kicker="Fidelización"
        title="Clientes"
        action={<NewCustomer programs={programs} />}
      />

      {customers.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-2">
          Todavía no hay clientes. Creá uno y empezá a darle sellos.
        </p>
      ) : (
        <table className="mt-6 w-full border-collapse">
          <thead>
            <tr className="text-left font-mono text-[10px] uppercase tracking-[0.13em] text-faint">
              <th className="border-b border-ink py-2.5">Cliente</th>
              <th className="border-b border-ink py-2.5">Teléfono</th>
              <th className="border-b border-ink py-2.5">Sellos</th>
              <th className="border-b border-ink py-2.5">Puntos</th>
              <th className="border-b border-ink py-2.5">Código</th>
              <th className="border-b border-ink py-2.5">Tarjeta</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const stampM = c.memberships.find((m) => m.program.type === "STAMPS");
              const prog = stampM ? progressOf(stampM) : null;
              const pointsM = c.memberships.find(
                (m) => m.program.type === "VISIT" || m.program.type === "POINTS",
              );
              const points = pointsM
                ? deriveBalance(
                    pointsM.events.map((e) => ({
                      type: e.type as EventType,
                      amount: e.amount as unknown as number,
                    })),
                  )
                : null;
              return (
                <tr key={c.id} className="text-sm">
                  <td className="border-b border-line py-3">{c.name}</td>
                  <td className="border-b border-line py-3 text-ink-2">
                    {c.phone ?? "—"}
                  </td>
                  <td className="border-b border-line py-3 font-mono">
                    {prog
                      ? prog.isComplete
                        ? "¡premio!"
                        : `${prog.filled}/${prog.required}`
                      : "—"}
                  </td>
                  <td className="border-b border-line py-3 font-mono">
                    {points != null ? `${points.toLocaleString("es-AR")}` : "—"}
                  </td>
                  <td className="border-b border-line py-3 font-mono">#{c.code}</td>
                  <td className="border-b border-line py-3">
                    <Link
                      href={`/t/${c.code}`}
                      target="_blank"
                      className="font-mono text-[11px] text-spot"
                    >
                      ver →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
