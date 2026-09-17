import type { Config } from "tailwindcss";

// Every colour is a CSS variable (RGB triplet) so light and dark are one set of
// classes; the values live in globals.css.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  // `dark:` follows the stored choice when there is one, the system otherwise —
  // the same rule the token block in globals.css uses.
  darkMode: [
    "variant",
    [
      '&:where([data-theme="dark"], [data-theme="dark"] *)',
      '@media (prefers-color-scheme: dark) { &:where(:not([data-theme="light"]):not([data-theme="light"] *)) }',
    ],
  ],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: { DEFAULT: v("surface"), 2: v("surface-2") },
        line: { DEFAULT: v("line"), soft: v("line-soft") },
        fg: v("fg"),
        muted: { DEFAULT: v("muted"), 2: v("muted-2") },
        accent: {
          DEFAULT: v("accent"),
          deep: v("accent-deep"),
          soft: v("accent-soft"),
          tint: v("accent-tint"),
          line: v("accent-line"),
          fg: v("accent-fg"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(var(--shadow) / 0.06)",
        fab: "0 6px 16px rgb(var(--accent) / 0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
