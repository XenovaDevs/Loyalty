"use client";

import { useState, useTransition } from "react";
import { regenerateJoinToken } from "./actions";
import { buttonCls } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Props = {
  url: string;
  svg: string; // QR en SVG (generado en el servidor)
  pngDataUrl: string;
  fileBase: string;
  owner: boolean;
};

export function QrSection({ url, svg, pngDataUrl, fileBase, owner }: Props) {
  const [pending, start] = useTransition();
  const svgHref = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  const [ask, setAsk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function regenerate() {
    setError(null);
    start(async () => {
      const r = await regenerateJoinToken();
      if (r?.error) setError(r.error);
      else setAsk(false);
    });
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
      <div
        className="mx-auto w-full max-w-[240px] shrink-0 border border-ink bg-white p-3 sm:mx-0 [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
        aria-label="QR del local"
      />
      <div className="flex min-w-0 flex-col gap-4">
        <p className="text-sm leading-relaxed text-ink-2">
          Imprimilo y ponelo en la caja. La primera vez el cliente crea su tarjeta
          con nombre, apellido y teléfono; después, cada vez que lo escanea suma un
          sello (uno por día, con el local abierto).
        </p>
        <p className="break-all font-mono text-[11px] text-faint">{url}</p>
        <div className="flex flex-wrap gap-2.5">
          <a href={pngDataUrl} download={`${fileBase}-qr.png`} className={buttonCls("spot")}>
            Descargar PNG
          </a>
          <a href={svgHref} download={`${fileBase}-qr.svg`} className={buttonCls("ghost")}>
            Descargar SVG
          </a>
          {owner && (
            <button
              type="button"
              onClick={() => setAsk(true)}
              disabled={pending}
              className={buttonCls("ghost")}
            >
              Generar QR nuevo
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={ask}
        tone="danger"
        title="¿Generar un QR nuevo?"
        message="El QR actual deja de funcionar y vas a tener que reimprimirlo. Las tarjetas y sellos de tus clientes no cambian."
        confirmLabel="Sí, generar uno nuevo"
        pending={pending}
        error={error}
        onConfirm={regenerate}
        onCancel={() => setAsk(false)}
      />
    </div>
  );
}
