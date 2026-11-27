import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isJoinToken } from "@/lib/ids";
import { readDeviceCustomer } from "@/lib/device";
import { JoinForm } from "./join-form";
import { AutoStamp } from "./auto-stamp";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * QR único del local. Primer escaneo → alta (nombre, apellido, teléfono) y
 * tarjeta con el primer sello. Escaneos siguientes (el celular ya tiene la
 * cookie de la tarjeta) → suma el sello del día.
 *
 * El sello lo suma una Server Action disparada desde el cliente, nunca el GET:
 * las vistas previas de links (WhatsApp, navegadores) abren la URL solas.
 */
export default async function QrPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isJoinToken(token)) notFound();

  const business = await prisma.business.findUnique({
    where: { joinToken: token },
    select: { id: true, name: true, city: true },
  });
  if (!business) notFound();

  const program = await prisma.program.findFirst({
    where: { businessId: business.id, type: "STAMPS", active: true },
    orderBy: { createdAt: "asc" },
    select: { rewardText: true, stampsRequired: true },
  });

  const customerId = await readDeviceCustomer(business.id);
  const customer = customerId
    ? await prisma.customer.findFirst({
        where: { id: customerId, businessId: business.id },
        select: { name: true },
      })
    : null;

  const initial = business.name.charAt(0).toUpperCase();

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <header className="mb-6 flex items-center gap-3 border-b border-line pb-4">
        <div className="grid size-9 place-items-center rounded-[var(--radius)] border border-ink font-display text-lg font-semibold">
          {initial}
        </div>
        <div>
          <div className="font-display text-base font-semibold leading-tight">
            {business.name}
          </div>
          {business.city && <div className="text-[11px] text-faint">{business.city}</div>}
        </div>
      </header>

      {!program ? (
        <p className="border border-line p-4 text-sm text-ink-2">
          Este local todavía no tiene una tarjeta de sellos activa.
        </p>
      ) : customer ? (
        <AutoStamp token={token} firstName={customer.name.split(" ")[0]} />
      ) : (
        <JoinForm
          token={token}
          reward={program.rewardText}
          stampsRequired={program.stampsRequired ?? 10}
        />
      )}
    </main>
  );
}
