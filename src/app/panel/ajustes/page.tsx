import { headers } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireBusiness, isOwner } from "@/lib/tenant";
import { parseMessages } from "@/lib/notify";
import { PageHeader } from "@/components/ui";
import { LocationForm } from "./location-form";
import { NotifyForm } from "./notify-form";
import { QrSection } from "./qr-section";

/** URL pública de la app (la del entorno; si falta, la del request). */
async function publicBaseUrl(): Promise<string> {
  const env = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  if (env) return env.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:4000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 border-b border-line pb-2 font-display text-xl font-semibold">
      {children}
    </h2>
  );
}

export default async function AjustesPage() {
  const { businessId, user } = await requireBusiness();
  const b = await prisma.business.findUnique({ where: { id: businessId } });
  if (!b) return null;

  const qrUrl = `${await publicBaseUrl()}/q/${b.joinToken}`;
  const qrOpts = { errorCorrectionLevel: "M" as const, margin: 1 };
  const [svg, png] = await Promise.all([
    QRCode.toString(qrUrl, { ...qrOpts, type: "svg" }),
    QRCode.toDataURL(qrUrl, { ...qrOpts, width: 1024 }),
  ]);

  return (
    <>
      <PageHeader kicker="Comercio" title="Ajustes" />

      <SectionTitle>QR del local</SectionTitle>
      <QrSection
        url={qrUrl}
        svg={svg}
        pngDataUrl={png}
        fileBase={b.slug}
        owner={isOwner(user)}
      />

      <SectionTitle>Ubicación y horario</SectionTitle>
      <LocationForm
        latitude={b.latitude}
        longitude={b.longitude}
        mapsUrl={b.mapsUrl}
        openHour={b.openHour}
        closeHour={b.closeHour}
      />

      <SectionTitle>Aviso de cercanía</SectionTitle>
      <NotifyForm
        enabled={b.notifyEnabled}
        messages={parseMessages(b.notifyMessages)}
        radiusM={b.notifyRadiusM}
        startHour={b.notifyStartHour}
        endHour={b.notifyEndHour}
        hasLocation={b.latitude != null && b.longitude != null}
      />
    </>
  );
}
