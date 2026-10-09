import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PEN Inventory",
    short_name: "PEN",
    description:
      "Sistema PEN de gestão de inventário, vendas e operações.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f8fafc",
    theme_color: "#020617",
    lang: "pt-AO",
    categories: [
      "business",
      "productivity",
      "finance",
    ],
    icons: [
      {
        src: "/icons/pen-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pen-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pen-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
