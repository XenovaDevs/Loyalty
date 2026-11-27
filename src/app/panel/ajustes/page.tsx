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

/**
 * Sección de ajustes. En celular: título arriba y contenido abajo. En PC (lg):
 * dos columnas, título + explicación a la izquierda y el formulario a la
 * derecha (antes todo quedaba en una columna angosta pegada a la izquierda).
 */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-5 border-b border-line py-8 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:gap-12">
      <div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-faint">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
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

      <Section
        title="QR del local"
        description="Un solo QR para todo el local: sirve para el alta y para sumar sellos."
      >
        <QrSection
          url={qrUrl}
          svg={svg}
          pngDataUrl={png}
          fileBase={b.slug}
          owner={isOwner(user)}
        />
      </Section>

      <Section
        title="Ubicación y horario"
        description="Con el local cerrado no se suman sellos por QR. La ubicación es para el aviso de cercanía."
      >
        <LocationForm
          latitude={b.latitude}
          longitude={b.longitude}
          mapsUrl={b.mapsUrl}
          openHour={b.openHour}
          closeHour={b.closeHour}
        />
      </Section>

      <Section
        title="Aviso de cercanía"
        description="Una notificación cuando un cliente con la tarjeta abierta pasa cerca del local."
      >
        <NotifyForm
          enabled={b.notifyEnabled}
          messages={parseMessages(b.notifyMessages)}
          radiusM={b.notifyRadiusM}
          startHour={b.notifyStartHour}
          endHour={b.notifyEndHour}
          hasLocation={b.latitude != null && b.longitude != null}
        />
      </Section>
    </>
  );
}
