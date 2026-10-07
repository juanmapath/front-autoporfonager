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
        // Autoporfonager Brand Palette
        navy: {
          DEFAULT: "#0A192F",
          deep: "#06101E",
          hover: "#112240",
          light: "#1B3A60",
          50: "#F0F4F8",
          100: "#D9E2EC",
          200: "#BCCCDC",
          300: "#9FB3C8",
          400: "#829AB1",
          500: "#627D98",
          600: "#486581",
          700: "#334E68",
          800: "#1E3A5F",
          900: "#0A192F",
        },
        tech: {
          blue: "#4274D9",
          "blue-hover": "#3361BF",
          "blue-light": "#EEF4FF",
          "blue-subtle": "#E0ECFF",
        },
        emerald: {
          success: "#10B981",
          "success-hover": "#059669",
          "success-light": "#ECFDF5",
        },
        slate: {
          canvas: "#F8F9FD",
          subtle: "#EAECF0",
          card: "#FFFFFF",
          muted: "#64748B",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        heading: ["var(--font-heading)", "Plus Jakarta Sans", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "card-subtle": "0 1px 3px 0 rgba(10, 25, 47, 0.04), 0 1px 2px -1px rgba(10, 25, 47, 0.02)",
        "card-hover": "0 10px 25px -5px rgba(10, 25, 47, 0.08), 0 8px 10px -6px rgba(10, 25, 47, 0.04)",
        "navy-glow": "0 8px 20px -4px rgba(10, 25, 47, 0.25)",
        "tech-glow": "0 8px 20px -4px rgba(66, 116, 217, 0.3)",
        "emerald-glow": "0 8px 20px -4px rgba(16, 185, 129, 0.3)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
export default config;

