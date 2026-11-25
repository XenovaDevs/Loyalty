import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function PanelHome() {
  const user = await requireUser();
  const businessId = user.businessId ?? "";

  const [customers, programs, stampsToday, activity] = await Promise.all([
    prisma.customer.count({ where: { businessId } }),
    prisma.program.count({ where: { businessId, active: true } }),
    prisma.loyaltyEvent.count({
      where: {
        type: "STAMP",
        createdAt: { gte: startOfToday() },
        membership: { program: { businessId } },
      },
    }),
    prisma.customer.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        memberships: { include: { program: true, events: true } },
      },
    }),
  ]);

  const metrics = [
    { l: "Clientes", v: customers.toString(), d: "en total" },
    { l: "Programas activos", v: programs.toString(), d: "vigentes" },
    { l: "Sellos hoy", v: stampsToday.toString(), d: "registrados" },
  ];

  return (
    <>
      <div className="flex items-end justify-between border-b border-ink pb-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-spot">
            Panel
          </p>
          <h1 className="font-display text-3xl font-semibold">Resumen</h1>
        </div>
        <Link
          href="/panel/programas"
          className="rounded-[var(--radius)] border border-spot bg-spot px-4 py-2.5 text-sm font-semibold text-paper"
        >
          + Nuevo programa
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-3 border-b border-ink">
        {metrics.map((m, i) => (
          <div
            key={m.l}
            className={`py-5 ${i < metrics.length - 1 ? "mr-5 border-r border-line" : ""}`}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              {m.l}
            </div>
            <div className="mt-2 font-mono text-3xl font-bold">{m.v}</div>
            <div className="mt-1 text-xs text-ink-2">{m.d}</div>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <div className="flex items-baseline justify-between border-b border-ink pb-2.5">
          <h2 className="font-display text-lg font-semibold">Clientes recientes</h2>
          <Link
            href="/panel/clientes"
            className="font-mono text-[11px] tracking-[0.08em] text-spot"
          >
            ver todos →
          </Link>
        </div>

        {activity.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-2">
            Todavía no hay clientes. Creá un programa y empezá a dar de alta
            clientes desde el scanner.
          </p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-[0.13em] text-faint">
                <th className="border-b border-line py-2.5">Cliente</th>
                <th className="border-b border-line py-2.5">Programa</th>
                <th className="border-b border-line py-2.5">Código</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((c) => (
                <tr key={c.id} className="text-sm">
                  <td className="border-b border-line py-3">{c.name}</td>
                  <td className="border-b border-line py-3 text-ink-2">
                    {c.memberships[0]?.program.name ?? "—"}
                  </td>
                  <td className="border-b border-line py-3 font-mono">
                    #{c.code}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
