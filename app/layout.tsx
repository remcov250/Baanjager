import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { APP_NAME } from "@/lib/app";
import { getLocale } from "@/lib/i18n";
import { getTheme } from "@/lib/theme";
import "./globals.css";

// Self-hosted by next/font at build time, so the CSP's font-src 'self' holds.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Vacatures beoordelen, criteria aanscherpen.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0e0d" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const theme = await getTheme();
  return (
    <html
      lang={locale}
      className={`${display.variable} ${sans.variable}`}
      data-theme={theme === "system" ? undefined : theme}
    >
      <body>{children}</body>
    </html>
  );
}
