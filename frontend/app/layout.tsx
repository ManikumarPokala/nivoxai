import "./globals.css";
import type { ReactNode } from "react";
import { Sora } from "next/font/google";
import AppShell from "@/components/AppShell";
import { I18nProvider } from "@/lib/i18n";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${sora.variable} text-slate-900 antialiased`}>
        <I18nProvider>
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
