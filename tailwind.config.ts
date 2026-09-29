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
        // ── Brand palette — sampled from the GlobalB2BAudioHolding logo ──
        // Royal blue: "B2B" wordmark + right-hand waveform bars.
        brand: {
          50:  "#eef5ff",
          100: "#d9e8ff",
          200: "#bcd6ff",
          300: "#8ebcff",
          400: "#5a9bff",
          500: "#2a7bff",
          600: "#0a64f0",
          700: "#0752c4",
          800: "#0b449b",
          900: "#10397a",
          950: "#0e2449",
        },
        // Gold: play-button rim, ".com" and tagline dots. Premium accent only.
        gold: {
          50:  "#fdf8ec",
          100: "#faefd0",
          200: "#f5df9f",
          300: "#f0cd6c",
          400: "#e2b654",
          500: "#cfa044",
          600: "#b98a3a",
          700: "#946b2c",
          800: "#735226",
          900: "#5c4222",
          950: "#34240f",
        },
        // Navy: the logo's "Global…AudioHolding" ink (#102038), deepened for surfaces.
        navy: {
          950: "#050b17",
          900: "#081223",
          850: "#0b172b",
          800: "#0f1e36",
          700: "#152a4a",
          600: "#1e365c",
          500: "#2d4a76",
          400: "#6c80a5",
          300: "#9fb1cf",
          200: "#cfdaec",
          100: "#ffffff",
        },
      },

      // ── Typography ─────────────────────────────────────────
      fontFamily: {
        jakarta: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "Consolas", "monospace"],
        sans:    ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-brand)", "Montserrat", "system-ui", "sans-serif"],
        brand:   ["var(--font-brand)", "Montserrat", "system-ui", "sans-serif"],
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
          "0%, 100%": { boxShadow: "0 0 15px rgba(10,100,240,0.3)" },
          "50%":      { boxShadow: "0 0 35px rgba(10,100,240,0.7), 0 0 60px rgba(10,100,240,0.3)" },
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
          "50%":      { borderColor: "rgba(10, 100, 240, 0.6)" },
        },
        // ── Landing page motion ──
        marquee: {
          "0%":   { transform: "translate3d(0, 0, 0)" },
          "100%": { transform: "translate3d(-50%, 0, 0)" },
        },
        kenburns: {
          "0%":   { transform: "scale(1.12)" },
          "100%": { transform: "scale(1)" },
        },
        progress: {
          "0%":   { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
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
        marquee:          "marquee 48s linear infinite",
        kenburns:         "kenburns 9s cubic-bezier(0.16, 1, 0.3, 1) both",
        progress:         "progress 7s linear both",
      },
    },
  },
  plugins: [],
};
export default config;
