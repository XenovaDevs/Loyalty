import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/tenant";
import { PageHeader } from "@/components/ui";
import { LocationForm } from "./location-form";

export default async function AjustesPage() {
  const { businessId } = await requireBusiness();
  const b = await prisma.business.findUnique({ where: { id: businessId } });
  if (!b) return null;

  return (
    <>
      <PageHeader kicker="Comercio" title="Ubicación y horario" />
      <LocationForm
        latitude={b.latitude}
        longitude={b.longitude}
        mapsUrl={b.mapsUrl}
        checkinRadiusM={b.checkinRadiusM}
        openHour={b.openHour}
        closeHour={b.closeHour}
      />
    </>
  );
}
