import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { progressOf } from "@/lib/membership";
import { deriveBalance, type EventType } from "@/lib/loyalty";
import { StampCard } from "@/components/stamp-card";
import { PointsCard } from "@/components/points-card";
import { CouponCard } from "@/components/coupon-card";
import { CheckInButton } from "./checkin-button";
import { NotifyToggle } from "./notify-toggle";
import { ProximityNotifier, type NotifyPromo } from "./proximity-notifier";
import { AutoRefresh } from "@/components/auto-refresh";

function parseMessages(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export default async function CustomerCardPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const customer = await prisma.customer.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      business: true,
      memberships: {
        include: { program: true, events: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!customer) notFound();

  // Los programas pausados no se muestran al cliente.
  const memberships = customer.memberships.filter((m) => m.program.active);

  const stampMembership = memberships.find(
    (m) => m.program.type === "STAMPS",
  );
  const prog = stampMembership ? progressOf(stampMembership) : null;

  // Programa de visitas (check-in por cercanía).
  const visitMembership = memberships.find(
    (m) => m.program.type === "VISIT",
  );
  const visitPoints = visitMembership
    ? deriveBalance(
        visitMembership.events.map((e) => ({
          type: e.type as EventType,
          amount: e.amount as unknown as number,
        })),
      )
    : 0;
  const checkinEnabled =
    visitMembership != null &&
    customer.business.latitude != null &&
    customer.business.longitude != null;

  // Cupones del cliente.
  const couponMemberships = memberships.filter(
    (m) => m.program.type === "COUPON",
  );

  // Programas con aviso de cercanía activo (radio/horario con fallback al comercio).
  const b = customer.business;
  const hasGeo = b.latitude != null && b.longitude != null;
  const notifyPromos: NotifyPromo[] = hasGeo
    ? memberships
        .map((m) => m.program)
        .filter((p) => p.notifyEnabled)
        .map((p) => ({
          id: p.id,
          name: p.name,
          messages: parseMessages(p.notifyMessages),
          radiusM: p.notifyRadiusM ?? b.checkinRadiusM,
          startHour: p.notifyStartHour ?? b.openHour,
          endHour: p.notifyEndHour ?? b.closeHour,
        }))
        .filter((p) => p.messages.length > 0)
    : [];

  const firstName = customer.name.split(" ")[0];
  const initial = customer.business.name.charAt(0).toUpperCase();

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <AutoRefresh intervalMs={10000} />
      <header className="mb-5 flex items-center gap-3 border-b border-line pb-4">
        <div className="grid size-9 place-items-center rounded-[var(--radius)] border border-ink font-display text-lg font-semibold">
          {initial}
        </div>
        <div>
          <div className="font-display text-base font-semibold leading-tight">
            {customer.business.name}
          </div>
          {customer.business.city && (
            <div className="text-[11px] text-faint">
              Tu tarjeta · {customer.business.city}
            </div>
          )}
        </div>
      </header>

      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Hola, <em className="not-italic text-spot">{firstName}</em>
      </h1>
      {prog && (
        <p className="mb-5 mt-0.5 text-sm leading-relaxed text-ink-2">
          {prog.isComplete
            ? "¡Tenés un premio listo! Mostrá tu código en la caja."
            : `Te faltan ${prog.remaining} sellos para tu próximo premio.`}
        </p>
      )}

      {stampMembership && prog && (
        <StampCard
          brandName={customer.business.name}
          brandSub={customer.business.city ?? undefined}
          logoText={initial}
          reward={stampMembership.program.rewardText}
          filled={prog.filled}
          required={prog.required}
          who={customer.name}
          code={`#${customer.code}`}
          complete={prog.isComplete}
        />
      )}

      {visitMembership && (
        <div className={stampMembership ? "mt-6" : ""}>
          <PointsCard
            brandName={customer.business.name}
            brandSub={customer.business.city ?? undefined}
            logoText={initial}
            reward={visitMembership.program.rewardText}
            points={visitPoints}
            who={customer.name}
            code={`#${customer.code}`}
          />
        </div>
      )}

      {checkinEnabled && (
        <CheckInButton
          code={customer.code}
          brandName={customer.business.name}
          lat={customer.business.latitude!}
          lng={customer.business.longitude!}
          radius={customer.business.checkinRadiusM}
          openHour={customer.business.openHour}
          closeHour={customer.business.closeHour}
        />
      )}

      {couponMemberships.map((m) => (
        <div
          key={m.id}
          className={stampMembership || visitMembership ? "mt-6" : ""}
        >
          <CouponCard
            brandName={customer.business.name}
            brandSub={customer.business.city ?? undefined}
            logoText={initial}
            reward={m.program.rewardText}
            couponCode={m.program.couponCode}
            expiresAt={m.program.couponExpiresAt}
            used={m.events.some((e) => e.type === "REDEEM")}
            who={customer.name}
          />
        </div>
      ))}

      {(stampMembership || visitMembership || couponMemberships.length > 0) && (
        <NotifyToggle code={customer.code} />
      )}

      {hasGeo && notifyPromos.length > 0 && (
        <ProximityNotifier
          lat={b.latitude!}
          lng={b.longitude!}
          promos={notifyPromos}
        />
      )}

      {!stampMembership && !visitMembership && couponMemberships.length === 0 && (
        <p className="border border-line p-4 text-sm text-ink-2">
          Todavía no estás inscripto en ningún programa.
        </p>
      )}

      <section className="mt-7 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
          Mostrá este código en la caja
        </p>
        <div
          className="mx-auto my-3 size-[166px] border border-ink"
          style={{
            background:
              "conic-gradient(from 0deg,#191814 0 25%,transparent 0 50%,#191814 0 75%,transparent 0 100%) 0 0/15px 15px, var(--color-paper)",
          }}
          aria-label="Código QR"
        />
        <p className="font-mono text-lg font-bold tracking-[0.16em]">
          {customer.code}
        </p>
      </section>

      <div className="my-5 flex items-center gap-3 text-faint">
        <span className="h-px flex-1 bg-line" />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
          sin apps
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <p className="text-[13px] leading-relaxed text-ink-2">
        Guardá esta página en tu pantalla de inicio y la abrís al toque. No hace
        falta instalar nada.
      </p>
    </main>
  );
}
