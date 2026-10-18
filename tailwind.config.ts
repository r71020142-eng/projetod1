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
        academy: {
          navy: {
            950: "#06142C",
            900: "#0A1A38",
            800: "#12264B",
          },
          violet: {
            600: "#5B2FE8",
            500: "#7047F5",
          },
          gold: {
            500: "#D79A24",
            400: "#EDB84E",
          },
          ivory: "#FAF8F3",
          pearl: "#F5F3EE",
          border: "#DDDDE5",
          text: "#07132E",
          muted: "#60708F",
          success: "#16A879",
        },
        mtd: {
          navy: {
            DEFAULT: "#0F172A",
            dark: "#0B0826",
            darker: "#08061C",
            sidebar: "#0D0A2C",
            surface: "#14103B",
          },
          purple: {
            50: "#EEF2FF",
            100: "#E0E7FF",
            200: "#C7D2FE",
            300: "#A5B4FC",
            400: "#818CF8",
            500: "#6366F1",
            600: "#4F46E5",
            700: "#4338CA",
            800: "#3730A3",
            900: "#312E81",
          },
          slate: {
            bg: "#F8FAFC",
            card: "#FFFFFF",
            border: "#E2E8F0",
            muted: "#64748B",
          },
          emerald: {
            DEFAULT: "#10B981",
            light: "#ECFDF5",
            text: "#059669",
          },
          amber: {
            DEFAULT: "#F59E0B",
            light: "#FFFBEB",
            text: "#D97706",
          },
          rose: {
            DEFAULT: "#EF4444",
            light: "#FEF2F2",
            text: "#DC2626",
          },
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "DM Serif Display", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        "academy-card": "14px",
        "academy-elem": "10px",
        "academy-sm": "8px",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 2px 10px -2px rgba(15, 23, 42, 0.05), 0 1px 3px -1px rgba(15, 23, 42, 0.03)",
        "card-hover": "0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
