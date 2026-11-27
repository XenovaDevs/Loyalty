import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/tenant";
import { progressOf } from "@/lib/membership";
import { normalizeName } from "@/lib/customers";
import { PageHeader, buttonCls } from "@/components/ui";
import { NewCustomer } from "./new-customer";

/**
 * ¿El cliente coincide con la búsqueda? Por nombre (sin acentos ni
 * mayúsculas), código o teléfono (solo dígitos, como se guarda la clave).
 */
function matches(c: { name: string; code: string; phoneKey: string | null }, qRaw: string) {
  const q = normalizeName(qRaw);
  if (!q) return true;
  if (normalizeName(c.name).includes(q)) return true;
  const codeQ = qRaw.trim().replace(/^#/, "").toUpperCase();
  if (codeQ.length >= 2 && c.code.includes(codeQ)) return true;
  const digits = qRaw.replace(/\D/g, "");
  return digits.length >= 3 && (c.phoneKey ?? "").includes(digits.replace(/^0+/, ""));
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { businessId } = await requireBusiness();
  const q = String((await searchParams).q ?? "").slice(0, 60);

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

  const rows = customers
    .filter((c) => matches(c, q))
    .map((c) => {
      const stampM = c.memberships.find((m) => m.program.type === "STAMPS" && m.program.active);
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
          <form action="/panel/clientes" className="mt-5 flex items-end gap-3">
            <label className="min-w-0 flex-1">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                Buscar
              </span>
              <input
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Nombre, teléfono o código"
                autoComplete="off"
                className="w-full rounded-none border-0 border-b border-ink bg-transparent py-2 text-base outline-none focus:border-spot md:text-[15px]"
              />
            </label>
            <button className={`${buttonCls("ink")} shrink-0`}>Buscar</button>
          </form>
          {q && (
            <p className="mt-3 text-[13px] text-ink-2">
              {rows.length === 0
                ? "Ningún cliente coincide con la búsqueda."
                : `${rows.length} de ${customers.length} clientes.`}{" "}
              <Link href="/panel/clientes" className="font-mono text-[12px] text-spot">
                ver todos
              </Link>
            </p>
          )}

          {/* Celular: una tarjeta por cliente; toda la fila abre el detalle. */}
          <ul className="mt-4 divide-y divide-line border-b border-line md:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/panel/clientes/${r.id}`} className="block py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">{r.name}</div>
                      <div className="mt-0.5 text-sm text-ink-2">{r.phone}</div>
                    </div>
                    <span className="shrink-0 font-mono text-sm">#{r.code}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[13px]">
                    <span>
                      <span className="text-faint">Sellos </span>
                      {r.stamps}
                    </span>
                    <span className="text-[12px] text-spot">ver detalle →</span>
                  </div>
                </Link>
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
                <th className="border-b border-ink py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="text-sm">
                  <td className="border-b border-line py-3">
                    <Link href={`/panel/clientes/${r.id}`} className="font-semibold hover:text-spot">
                      {r.name}
                    </Link>
                  </td>
                  <td className="border-b border-line py-3 text-ink-2">{r.phone}</td>
                  <td className="border-b border-line py-3 font-mono">{r.stamps}</td>
                  <td className="border-b border-line py-3 font-mono">#{r.code}</td>
                  <td className="border-b border-line py-3 text-right">
                    <Link
                      href={`/panel/clientes/${r.id}`}
                      className="font-mono text-[11px] text-spot"
                    >
                      ver detalle →
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
