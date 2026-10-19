import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16181d",
        brand: { DEFAULT: "#4f46e5", soft: "#eef2ff", dark: "#3730a3" },
      },
    },
  },
  plugins: [],
};
export default config;
