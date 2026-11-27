import type { MetadataRoute } from "next";

// Identidad del sitio para el navegador (nombre e íconos PNG). Chrome en
// Android la usa en las notificaciones; sin íconos PNG mostraba la inicial "L".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Loyalty",
    short_name: "Loyalty",
    description: "Tarjetas de fidelización sin apps.",
    start_url: "/",
    display: "browser",
    background_color: "#efede4",
    theme_color: "#efede4",
    icons: [
      { src: "/notification-icon.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
