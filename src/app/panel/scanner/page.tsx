import { PageHeader } from "@/components/ui";
import { Scanner } from "./scanner";

export default function ScannerPage() {
  return (
    <>
      <PageHeader kicker="Caja" title="Scanner" />
      <Scanner />
    </>
  );
}
