import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Vacatures beoordelen, criteria aanscherpen.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#c2410c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
