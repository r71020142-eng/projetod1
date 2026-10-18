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
      borderRadius: {
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
