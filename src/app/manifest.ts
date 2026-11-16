import type { MetadataRoute } from "next";

/** Domus como app instalable (PWA): necesaria para las notificaciones en iPhone. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Domus — Todo el hogar",
    short_name: "Domus",
    description: "Compras, gastos fijos, quehaceres y premios de la familia.",
    lang: "es",
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    background_color: "#F5F6FA",
    theme_color: "#FFFFFF",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
