import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // K-Bridge brand palette — sourced from logo
        brand: {
          navy:       "#1B3A6B",
          "navy-mid": "#2D5499",
          "navy-light":"#E8EEF7",
          "navy-pale": "#F0F4FA",
          red:        "#C0272D",
          "red-mid":  "#E04848",
          "red-light":"#F9EAEA",
          white:      "#FFFFFF",
        },
        // Semantic aliases
        primary:   "#1B3A6B",
        danger:    "#C0272D",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.08)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.5" },
        },
      },
      animation: {
        "fade-in":  "fade-in 0.2s ease-out",
        "slide-in": "slide-in 0.2s ease-out",
        pulse:      "pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
