import { BUSINESS_TZ, dayKeyInBusinessTz } from "@/lib/geo";

/**
 * "Usado hoy a las HH:MM": el personal ve que el cupón/premio se acaba de usar
 * en ese momento (y no que le muestran una captura de un uso viejo).
 */
export function UsedStamp({ at, label }: { at: Date; label: string }) {
  const today = dayKeyInBusinessTz(at) === dayKeyInBusinessTz();
  const time = new Intl.DateTimeFormat("es-AR", {
    timeZone: BUSINESS_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
  const day = new Intl.DateTimeFormat("es-AR", {
    timeZone: BUSINESS_TZ,
    day: "2-digit",
    month: "2-digit",
  }).format(at);
  return (
    <div
      className={`mt-3 border-2 p-3 text-center ${
        today ? "border-spot text-spot" : "border-line text-ink-2"
      }`}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em]">{label}</p>
      <p className="font-display text-xl font-semibold">
        {today ? `hoy a las ${time}` : `el ${day} a las ${time}`}
      </p>
    </div>
  );
}
