import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080808",
        "card-bg": "#111111",
        "card-border": "#1E1E1E",
        primary: "#FF3B3B",
        viral: "#FFD200",
        "text-primary": "#FFFFFF",
        "text-secondary": "#999999",
        "text-muted": "#555555",
        success: "#22C55E",
      },
      fontFamily: {
        display: ["var(--font-bricolage)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: {
        card: "8px",
        btn: "6px",
        badge: "4px",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "count-up": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        ticker: "ticker 30s linear infinite",
        "slide-up": "slide-up 0.5s ease-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;
