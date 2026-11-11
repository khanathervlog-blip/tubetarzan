import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TubeTarzan — Viral YouTube Ideas",
    short_name: "TubeTarzan",
    description: "Find viral YouTube video ideas in 60 seconds with outlier scores and views per hour.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#080808",
    theme_color: "#080808",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
