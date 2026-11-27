"use client";

import { useActionState, useRef, useState } from "react";
import { updateLocation, resolveMapsUrl, type FormResult } from "./actions";
import { Field, buttonCls } from "@/components/ui";
import { parseGoogleMapsCoords } from "@/lib/maps";

type Props = {
  latitude: number | null;
  longitude: number | null;
  mapsUrl: string | null;
  openHour: number | null;
  closeHour: number | null;
};

export function LocationForm(initial: Props) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    updateLocation,
    undefined,
  );
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [mapsUrl, setMapsUrl] = useState(initial.mapsUrl ?? "");
  const [mapsMsg, setMapsMsg] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  function fill(lat: number, lng: number) {
    if (latRef.current) latRef.current.value = lat.toFixed(6);
    if (lngRef.current) lngRef.current.value = lng.toFixed(6);
  }

  async function useMapsLink() {
    setMapsMsg(null);
    const direct = parseGoogleMapsCoords(mapsUrl);
    if (direct) {
      fill(direct.lat, direct.lng);
      setMapsMsg("✓ Ubicación tomada del link.");
      return;
    }
    // Link acortado o sin coordenadas visibles: lo resolvemos en el servidor.
    setResolving(true);
    setMapsMsg("Resolviendo link…");
    const r = await resolveMapsUrl(mapsUrl);
    setResolving(false);
    if (r.ok) {
      fill(r.lat, r.lng);
      setMapsMsg("✓ Ubicación tomada del link.");
    } else {
      setMapsMsg(r.error);
    }
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) return;
    setGeoMsg("Ubicándote…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Al elegir GPS, el link deja de tener prioridad: lo limpiamos.
        setMapsUrl("");
        setMapsMsg(null);
        if (latRef.current) latRef.current.value = pos.coords.latitude.toFixed(6);
        if (lngRef.current) lngRef.current.value = pos.coords.longitude.toFixed(6);
        setGeoMsg(`Ubicación tomada (±${Math.round(pos.coords.accuracy)} m).`);
      },
      () => setGeoMsg("No pudimos obtener tu ubicación."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <form action={action} className="flex max-w-xl flex-col gap-5">
      <p className="text-sm text-ink-2">
        La ubicación se usa para el aviso de cercanía. Pegá el link de tu local
        en Google Maps, o parate dentro del local y tocá{" "}
        <strong>“Usar mi ubicación actual”</strong>.
      </p>

      <div>
        <label className="block">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            Link de Google Maps
          </span>
          <input
            type="url"
            name="mapsUrl"
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/…"
            className="w-full border-0 border-b border-ink bg-transparent py-2 text-base outline-none md:text-[15px] focus:border-spot"
          />
        </label>
        <button
          type="button"
          onClick={useMapsLink}
          disabled={resolving || !mapsUrl.trim()}
          className={`${buttonCls("ghost")} mt-3`}
        >
          {resolving ? "Resolviendo…" : "Usar link de Google Maps"}
        </button>
        {mapsMsg && (
          <p
            className={`mt-2 text-[13px] ${
              mapsMsg.startsWith("✓") ? "text-spot" : "text-ink-2"
            }`}
          >
            {mapsMsg}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 text-faint">
        <span className="h-px flex-1 bg-line" />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em]">o</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        onClick={useMyLocation}
        className={buttonCls("ghost")}
      >
        Usar mi ubicación actual
      </button>
      {geoMsg && <p className="-mt-2 text-[13px] text-spot">{geoMsg}</p>}

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            Latitud
          </span>
          <input
            ref={latRef}
            name="latitude"
            defaultValue={initial.latitude ?? ""}
            disabled={mapsUrl.trim() !== ""}
            className="w-full border-0 border-b border-ink bg-transparent py-2 font-mono text-base outline-none md:text-[15px] focus:border-spot disabled:opacity-50"
          />
        </label>
        <label className="block">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            Longitud
          </span>
          <input
            ref={lngRef}
            name="longitude"
            defaultValue={initial.longitude ?? ""}
            disabled={mapsUrl.trim() !== ""}
            className="w-full border-0 border-b border-ink bg-transparent py-2 font-mono text-base outline-none md:text-[15px] focus:border-spot disabled:opacity-50"
          />
        </label>
      </div>
      {mapsUrl.trim() !== "" && (
        <p className="-mt-3 text-[12px] text-faint">
          Las coordenadas se derivan del link al guardar. Borrá el link para
          editarlas a mano.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Abre (hora 0-23)"
          name="openHour"
          type="number"
          min={0}
          max={23}
          defaultValue={initial.openHour ?? ""}
        />
        <Field
          label="Cierra (hora 0-23)"
          name="closeHour"
          type="number"
          min={0}
          max={23}
          defaultValue={initial.closeHour ?? ""}
        />
      </div>
      <p className="-mt-3 text-[12px] text-faint">
        Con el local cerrado, escanear el QR no suma sellos. Vacío = sin
        restricción.
      </p>

      {state?.error && <p className="text-sm text-spot">{state.error}</p>}
      {state?.ok && <p className="text-sm text-spot">✓ Ajustes guardados.</p>}
      <button disabled={pending} className={buttonCls("spot")}>
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
