import type { Metadata } from "next";
import { APP_NAME } from "@/lib/app";
import { getLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Vacatures beoordelen, criteria aanscherpen.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
