import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // ── Neon Crimson brand palette ──────────────────────────
        crimson: {
          50:  "#fff1f1",
          100: "#ffe1e1",
          200: "#ffc7c7",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#450a0a",
        },
        // ── Deep Obsidian Void palette (Futurist Dark Glass) ──
        obsidian: {
          950: "#060608",
          900: "#0b0b0f",
          850: "#101016",
          800: "#15151e",
          700: "#1e1e2b",
          600: "#272738",
          500: "#38384f",
          400: "#71718a",
          300: "#a1a1ba",
          200: "#d1d1e3",
          100: "#ffffff",
        },
      },

      // ── Typography ─────────────────────────────────────────
      fontFamily: {
        syne:    ["var(--font-syne)", "system-ui", "sans-serif"],
        jakarta: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "Consolas", "monospace"],
        sans:    ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
      },

      // ── Futuristic Animations ─────────────────────────────
      keyframes: {
        "fade-in-up": {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "waveform-pulse": {
          "0%, 100%": { scaleY: "1" },
          "50%":      { scaleY: "1.6" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(220,38,38,0.3)" },
          "50%":      { boxShadow: "0 0 35px rgba(220,38,38,0.7), 0 0 60px rgba(220,38,38,0.3)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-10px)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.2" },
          "50%":      { opacity: "0.45" },
        },
        "laser-scan": {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        "radar-sweep": {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "border-glow": {
          "0%, 100%": { borderColor: "rgba(255, 255, 255, 0.1)" },
          "50%":      { borderColor: "rgba(220, 38, 38, 0.6)" },
        },
      },
      animation: {
        "fade-in-up":     "fade-in-up 0.6s ease-out forwards",
        "fade-in":        "fade-in 0.4s ease-out forwards",
        shimmer:          "shimmer 2.5s linear infinite",
        "waveform-pulse": "waveform-pulse 0.8s ease-in-out infinite",
        "glow-pulse":     "glow-pulse 2.2s ease-in-out infinite",
        float:            "float 5s ease-in-out infinite",
        "pulse-slow":     "pulse-slow 4s ease-in-out infinite",
        "laser-scan":     "laser-scan 2.5s ease-in-out infinite",
        "radar-sweep":    "radar-sweep 8s linear infinite",
        "border-glow":    "border-glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
