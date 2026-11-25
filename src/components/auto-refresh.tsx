"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refresca los datos del server component sin recargar la página:
 * al volver el foco/visibilidad y cada `intervalMs` mientras esté visible.
 * Es un reemplazo liviano de websockets para mantener las vistas al día.
 */
export function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const id = setInterval(refresh, intervalMs);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(id);
    };
  }, [router, intervalMs]);

  return null;
}
