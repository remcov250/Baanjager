import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1c1917",
        paper: "#fafaf9",
        accent: "#c2410c",
      },
    },
  },
  plugins: [],
} satisfies Config;
