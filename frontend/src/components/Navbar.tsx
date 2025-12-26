"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "AI Strategy Chat", href: "/chat" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:px-0">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-semibold text-white">
            N
          </span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-slate-900">NivoxAI</span>
            <span className="rounded-full bg-accent-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-900">
              AI Labs Demo
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 transition hover:text-slate-900 ${
                  isActive
                    ? "bg-brand-50 font-semibold text-slate-900"
                    : "text-slate-600"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
