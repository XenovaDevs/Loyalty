import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/tenant";
import { progressOf } from "@/lib/membership";
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

  const rows = customers.map((c) => {
    const stampM = c.memberships.find((m) => m.program.type === "STAMPS");
    const prog = stampM ? progressOf(stampM) : null;
    return {
      id: c.id,
      name: c.name,
      phone: c.phone ?? "—",
      code: c.code,
      stamps: prog ? (prog.isComplete ? "¡premio!" : `${prog.filled}/${prog.required}`) : "—",
    };
  });

  return (
    <>
      <PageHeader
        kicker="Fidelización"
        title="Clientes"
        action={<NewCustomer programs={programs} />}
      />

      {customers.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-2">
          Todavía no hay clientes. Imprimí el QR del local (Ajustes) o creá uno a mano.
        </p>
      ) : (
        <>
          {/* Celular: una tarjeta por cliente. */}
          <ul className="mt-4 divide-y divide-line border-b border-line md:hidden">
            {rows.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{r.name}</div>
                    <div className="mt-0.5 text-sm text-ink-2">{r.phone}</div>
                  </div>
                  <span className="shrink-0 font-mono text-sm">#{r.code}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex gap-5 font-mono text-[13px]">
                    <span>
                      <span className="text-faint">Sellos </span>
                      {r.stamps}
                    </span>
                  </div>
                  <Link
                    href={`/t/${r.code}`}
                    target="_blank"
                    className="-my-2 shrink-0 py-2 font-mono text-[12px] text-spot"
                  >
                    ver tarjeta →
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla. */}
          <table className="mt-6 hidden w-full border-collapse md:table">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-[0.13em] text-faint">
                <th className="border-b border-ink py-2.5">Cliente</th>
                <th className="border-b border-ink py-2.5">Teléfono</th>
                <th className="border-b border-ink py-2.5">Sellos</th>
                <th className="border-b border-ink py-2.5">Código</th>
                <th className="border-b border-ink py-2.5">Tarjeta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="text-sm">
                  <td className="border-b border-line py-3">{r.name}</td>
                  <td className="border-b border-line py-3 text-ink-2">{r.phone}</td>
                  <td className="border-b border-line py-3 font-mono">{r.stamps}</td>
                  <td className="border-b border-line py-3 font-mono">#{r.code}</td>
                  <td className="border-b border-line py-3">
                    <Link
                      href={`/t/${r.code}`}
                      target="_blank"
                      className="font-mono text-[11px] text-spot"
                    >
                      ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
