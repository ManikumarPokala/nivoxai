"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarShellProps = {
  children: React.ReactNode;
};

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "AI Strategy Chat", href: "/chat" },
];

export default function SidebarShell({ children }: SidebarShellProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white px-5 pb-6 pt-6 transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-xs font-semibold text-white">
              N
            </span>
            <div>
              <div className="text-lg font-semibold">NivoxAI</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                AI Labs Demo
              </div>
            </div>
          </div>

          <nav className="mt-10 space-y-2 text-sm">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center rounded-xl px-3 py-2 transition ${
                    isActive
                      ? "bg-brand-50 font-semibold text-slate-900"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-10 text-xs text-slate-400">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="font-semibold text-slate-600">Demo Workspace</p>
              <p className="mt-1">v0.1 • Heuristic mode</p>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="flex h-14 items-center justify-between px-4 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden"
                  onClick={() => setIsOpen((prev) => !prev)}
                  aria-label="Toggle navigation"
                >
                  <span className="block h-0.5 w-4 rounded-full bg-slate-600" />
                  <span className="block h-0.5 w-4 rounded-full bg-slate-600" />
                  <span className="block h-0.5 w-4 rounded-full bg-slate-600" />
                </button>
                <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 shadow-sm sm:flex">
                  <span className="text-slate-400">⌘</span>
                  <span>Search or type a command</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <button
                  type="button"
                  className="rounded-pill border border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-100"
                >
                  New Project
                </button>
                <div className="h-8 w-8 rounded-full bg-slate-200" />
              </div>
            </div>
          </header>

          <main className="px-4 py-6 lg:px-8 lg:py-10">{children}</main>
        </div>
      </div>

      {isOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-label="Close navigation overlay"
        />
      ) : null}
    </div>
  );
}
