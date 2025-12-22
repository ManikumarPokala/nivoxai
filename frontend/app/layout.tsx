import "./globals.css";
import type { ReactNode } from "react";
import SidebarShell from "./components/SidebarShell";

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
