import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 950: "#070d1f", 900: "#0b1530", 800: "#10204a", 700: "#17306b", 600: "#1f4290" },
        brand: { 400: "#5b9dff", 500: "#3b82f6", 600: "#2563eb" },
      },
      fontFamily: { sans: ["Inter", "Segoe UI", "system-ui", "-apple-system", "Roboto", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
