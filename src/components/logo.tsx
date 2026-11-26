/**
 * Logo de marca "Loyalty." — fiel al sistema de diseño (docs/design → brand.html).
 * Símbolo: anillo perforado (tinta) + sello corrido (rojo imprenta).
 * El símbolo escala con el font-size del lockup (1em). Debajo de 24px el anillo
 * pasa a línea continua para que no se pierda.
 */
export function Logo({
  size = 22,
  wordmark = true,
  tone = "ink",
}: {
  /** Tamaño del símbolo/texto en px (el símbolo mide 1em). */
  size?: number;
  /** Mostrar el logotipo "Loyalty." junto al símbolo. */
  wordmark?: boolean;
  /** "ink" sobre papel (default), "paper" sobre fondos oscuros/rojos. */
  tone?: "ink" | "paper";
}) {
  const solid = size < 24;
  const markColor = tone === "paper" ? "var(--paper)" : "var(--ink)";
  const dotColor = tone === "paper" ? "var(--paper)" : "var(--spot)";
  const dotFinal = tone === "paper" ? "var(--paper)" : "var(--spot)";

  return (
    <span
      className="inline-flex items-center"
      style={{ gap: "0.32em", fontSize: size, color: markColor }}
    >
      <svg
        viewBox="0 0 120 120"
        aria-hidden="true"
        style={{ width: "1em", height: "1em", flex: "none" }}
      >
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth={solid ? 6 : 3}
          strokeDasharray={solid ? undefined : "7 6"}
        />
        <circle cx="63" cy="57" r="38" fill={dotColor} />
      </svg>
      {wordmark && (
        <span
          className="font-display font-semibold leading-none"
          style={{ letterSpacing: "-0.02em" }}
        >
          Loyalty<span style={{ color: dotFinal }}>.</span>
        </span>
      )}
    </span>
  );
}
