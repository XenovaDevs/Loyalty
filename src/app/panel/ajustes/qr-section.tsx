"use client";

import { useTransition } from "react";
import { regenerateJoinToken } from "./actions";
import { buttonCls } from "@/components/ui";

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

  function regenerate() {
    if (
      !confirm(
        "¿Generar un QR nuevo? El actual deja de funcionar y vas a tener que reimprimirlo. Las tarjetas y sellos de tus clientes no cambian.",
      )
    )
      return;
    start(async () => {
      const r = await regenerateJoinToken();
      if (r?.error) alert(r.error);
    });
  }

  return (
    <div className="mt-6 flex max-w-md flex-col gap-4">
      <p className="text-sm text-ink-2">
        Imprimilo y ponelo en la caja. La primera vez el cliente crea su tarjeta
        con nombre, apellido y teléfono; después, cada vez que lo escanea suma un
        sello (uno por día, con el local abierto).
      </p>
      <div
        className="mx-auto w-full max-w-[260px] border border-ink bg-white p-3 [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
        aria-label="QR del local"
      />
      <p className="break-all text-center font-mono text-[11px] text-faint">{url}</p>
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
            onClick={regenerate}
            disabled={pending}
            className={buttonCls("ghost")}
          >
            {pending ? "Generando…" : "Generar QR nuevo"}
          </button>
        )}
      </div>
    </div>
  );
}
