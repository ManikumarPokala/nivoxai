import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import SidebarShell from "@/components/SidebarShell";

export const metadata: Metadata = {
  title: "NivoxAI",
  description: "AI-powered campaign analytics and recommendations",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <SidebarShell>{children}</SidebarShell>
      </body>
    </html>
  );
}
