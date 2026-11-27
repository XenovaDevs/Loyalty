import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireBusiness, isOwner } from "@/lib/tenant";
import { progressOf } from "@/lib/membership";
import { BUSINESS_TZ } from "@/lib/geo";
import { QR_STAMP_NOTE } from "@/lib/stamps";
import { Badge } from "@/components/ui";
import { StampMark } from "@/components/stamp-mark";
import { EditCustomer } from "../edit-customer";
import { ActionRow } from "./action-row";
import {
  addStamp,
  redeemReward,
  markCouponUsed,
  revertCoupon,
  sendTestPush,
} from "./actions";

const HISTORY_LIMIT = 100;

function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: BUSINESS_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-8 border-b border-ink pb-2 font-display text-lg font-semibold">
      {children}
    </h2>
  );
}

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { businessId, user } = await requireBusiness();
  if (id.length > 64) notFound();

  const customer = await prisma.customer.findFirst({
    where: { id, businessId },
    include: {
      memberships: {
        include: {
          program: true,
          events: {
            include: { staff: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { subscriptions: true } },
    },
  });
  if (!customer) notFound();

  const stamps = customer.memberships.filter((m) => m.program.type === "STAMPS");
  const coupons = customer.memberships.filter((m) => m.program.type === "COUPON");

  // Historial: todos los movimientos de todas sus tarjetas, del más nuevo al más viejo.
  const history = customer.memberships
    .flatMap((m) =>
      m.events.map((e) => {
        const n = Number(e.amount);
        const what =
          e.type === "STAMP"
            ? n === 1
              ? "+1 sello"
              : `+${n} sellos`
            : e.type === "REDEEM"
              ? m.program.type === "COUPON"
                ? "Cupón usado"
                : `Canje de premio (−${n} sellos)`
              : e.type === "ADJUST"
                ? `Ajuste (${n > 0 ? "+" : ""}${n})`
                : e.type;
        const who = e.staff
          ? e.staff.name
          : e.note === QR_STAMP_NOTE
            ? "QR del local"
            : e.type === "REDEEM"
              ? "El cliente, desde su tarjeta"
              : "—";
        return { id: e.id, at: e.createdAt, program: m.program.name, what, who };
      }),
    )
    .sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <>
      <Link
        href="/panel/clientes"
        className="-my-2 inline-block py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-faint hover:text-spot"
      >
        ← Clientes
      </Link>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-ink pb-4">
        <div className="min-w-0">
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight md:text-3xl">
            {customer.name}
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            {customer.phone ?? "sin teléfono"} ·{" "}
            <span className="font-mono">#{customer.code}</span> · alta{" "}
            {fmtDateTime(customer.createdAt).split(",")[0]}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <Link href={`/t/${customer.code}`} target="_blank" className="font-mono text-[12px] text-spot">
            ver su tarjeta →
          </Link>
          <EditCustomer
            id={customer.id}
            name={customer.name}
            phone={customer.phone ?? ""}
            code={customer.code}
            owner={isOwner(user)}
            asButton
            afterDeleteHref="/panel/clientes"
          />
        </div>
      </div>

      <SectionTitle>Tarjeta de sellos</SectionTitle>
      {stamps.length === 0 ? (
        <p className="py-4 text-sm text-ink-2">
          No está inscripto en una tarjeta de sellos. Se inscribe solo la próxima
          vez que escanee el QR del local.
        </p>
      ) : (
        stamps.map((m) => {
          const p = progressOf(m);
          return (
            <div key={m.id} className="border-b border-line py-4">
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <span className="font-semibold">{m.program.name}</span>
                {!m.program.active && <Badge>Pausado</Badge>}
                <span className="font-mono text-sm font-bold text-spot">
                  {p.isComplete ? "premio listo" : `${p.filled}/${p.required}`}
                </span>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                {Array.from({ length: p.required }).map((_, i) => {
                  const on = i < p.filled;
                  return (
                    <span
                      key={i}
                      className={`grid size-7 place-items-center rounded-full ${
                        on ? "bg-spot text-paper" : "border border-dashed border-line"
                      }`}
                    >
                      {on && <StampMark className="size-3.5" />}
                    </span>
                  );
                })}
              </div>
              <ActionRow
                actions={[
                  { label: "+ Sumar 1 sello", run: addStamp.bind(null, m.id, 1), variant: "spot" },
                  { label: "+ 2", run: addStamp.bind(null, m.id, 2) },
                  {
                    label: "Canjear premio",
                    run: redeemReward.bind(null, m.id),
                    variant: "ink",
                    disabled: !p.isComplete,
                    confirm: {
                      title: "¿Canjear el premio?",
                      message: `${m.program.rewardText}. Se descuentan ${p.required} sellos.`,
                      confirmLabel: "Sí, canjear",
                    },
                  },
                ]}
              />
            </div>
          );
        })
      )}

      <SectionTitle>Cupones</SectionTitle>
      {coupons.length === 0 ? (
        <p className="py-4 text-sm text-ink-2">No tiene cupones.</p>
      ) : (
        coupons.map((m) => {
          const used = m.events.find((e) => e.type === "REDEEM");
          const expired =
            m.program.couponExpiresAt != null && m.program.couponExpiresAt < new Date();
          return (
            <div key={m.id} className="border-b border-line py-4">
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <span className="font-semibold">{m.program.name}</span>
                {m.program.couponCode && (
                  <span className="border border-dashed border-ink px-2 py-0.5 font-mono text-sm font-bold tracking-[0.12em]">
                    {m.program.couponCode}
                  </span>
                )}
                <span className="font-mono text-sm font-bold text-spot">
                  {used
                    ? `usado ${fmtDateTime(used.createdAt)}`
                    : expired
                      ? "vencido"
                      : "disponible"}
                </span>
              </div>
              <p className="mb-3 text-sm text-ink-2">{m.program.rewardText}</p>
              <ActionRow
                actions={
                  used
                    ? [
                        {
                          label: "Deshacer uso",
                          run: revertCoupon.bind(null, m.id),
                          confirm: {
                            title: "¿Deshacer el uso del cupón?",
                            message: "El cupón vuelve a quedar disponible para el cliente.",
                            confirmLabel: "Sí, deshacer",
                          },
                        },
                      ]
                    : [
                        {
                          label: "Marcar como usado",
                          run: markCouponUsed.bind(null, m.id),
                          variant: "ink",
                          disabled: expired,
                        },
                      ]
                }
              />
            </div>
          );
        })
      )}

      <SectionTitle>Avisos</SectionTitle>
      <div className="py-4">
        <p className="mb-3 text-sm text-ink-2">
          {customer._count.subscriptions > 0
            ? `Tiene avisos activados en ${customer._count.subscriptions} dispositivo/s.`
            : "No activó los avisos en su tarjeta."}
        </p>
        <ActionRow
          actions={[{ label: "Probar aviso", run: sendTestPush.bind(null, customer.id) }]}
        />
      </div>

      <SectionTitle>Historial</SectionTitle>
      {history.length === 0 ? (
        <p className="py-4 text-sm text-ink-2">Todavía no tiene movimientos.</p>
      ) : (
        <>
          <ul className="divide-y divide-line border-b border-line">
            {history.slice(0, HISTORY_LIMIT).map((h) => (
              <li key={h.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-2.5 text-sm">
                <span className="w-[8.5rem] shrink-0 font-mono text-[12px] text-faint">
                  {fmtDateTime(h.at)}
                </span>
                <span className="font-semibold">{h.what}</span>
                <span className="text-ink-2">{h.program}</span>
                <span className="ml-auto text-[13px] text-ink-2">{h.who}</span>
              </li>
            ))}
          </ul>
          {history.length > HISTORY_LIMIT && (
            <p className="mt-2 font-mono text-[11px] text-faint">
              Mostrando los últimos {HISTORY_LIMIT} de {history.length} movimientos.
            </p>
          )}
        </>
      )}
    </>
  );
}
