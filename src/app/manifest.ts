import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FUT Pachangas — Club Amateur",
    short_name: "FUT Pachangas",
    description:
      "Gestiona tus pachangas de fútbol con cartas Ultimate Team, equipos balanceados, votaciones MVP y rankings históricos.",
    start_url: "/",
    display: "standalone",
    background_color: "#090D16",
    theme_color: "#090D16",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
