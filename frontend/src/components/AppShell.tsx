"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui/utils";
import { useI18n } from "@/lib/i18n";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();

  const navItems = [
    { label: t("nav_dashboard"), href: "/dashboard" },
    { label: t("nav_campaigns"), href: "/campaigns" },
    { label: t("nav_discovery"), href: "/discovery" },
    { label: t("nav_analytics"), href: "/analytics" },
    { label: t("nav_settings"), href: "/settings" },
  ];

  const titleMap: Record<string, string> = {
    "/dashboard": t("page_dashboard_title"),
    "/campaigns": t("page_campaigns_title"),
    "/discovery": t("page_discovery_title"),
    "/analytics": t("page_analytics_title"),
    "/settings": t("page_settings_title"),
  };

  const pageTitle = useMemo(() => {
    if (!pathname) {
      return "NivoxAI";
    }

    if (pathname.startsWith("/campaigns/") && pathname !== "/campaigns") {
      return t("page_campaign_detail_title");
    }

    return titleMap[pathname] ?? "NivoxAI";
  }, [pathname, t]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-[#f7f6f2] to-slate-100 text-slate-900">
      <div className="flex">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200/70 bg-white/95 px-6 pb-6 pt-6 backdrop-blur transition-transform duration-200 lg:static lg:translate-x-0",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
              N
            </div>
            <div>
              <div className="text-lg font-semibold">NivoxAI</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">
                MarTech Suite
              </div>
            </div>
          </div>

          <nav className="mt-10 space-y-1 text-sm">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-2xl px-3 py-2.5 transition",
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <span>{item.label}</span>
                  {isActive ? (
                    <span className="text-xs text-slate-200">●</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-10">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <p className="font-semibold text-slate-700">Workspace</p>
              <p className="mt-1">NivoxAI Demo • Heuristic v1</p>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-10">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 lg:hidden"
                  onClick={() => setIsOpen((prev) => !prev)}
                  aria-label="Toggle navigation"
                >
                  <span className="block h-0.5 w-4 rounded-full bg-slate-600" />
                  <span className="block h-0.5 w-4 rounded-full bg-slate-600" />
                  <span className="block h-0.5 w-4 rounded-full bg-slate-600" />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Workspace
                  </p>
                  <h1 className="text-lg font-semibold text-slate-900">
                    {pageTitle}
                  </h1>
                </div>
              </div>

              <div className="hidden items-center gap-3 lg:flex">
                <Link
                  href="/campaigns"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {t("action_create_campaign")}
                </Link>
                <Link
                  href="/discovery"
                  className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  {t("action_discover")}
                </Link>
                <Link
                  href="/campaigns/camp-demo-001"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {t("action_generate_strategy")}
                </Link>
                <select
                  value={locale}
                  onChange={(event) => setLocale(event.target.value as typeof locale)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600"
                  aria-label="Language selector"
                >
                  <option value="en">EN</option>
                  <option value="th">TH</option>
                </select>
              </div>
            </div>
          </header>

          <main className="page-enter px-4 py-6 lg:px-10 lg:py-10">
            {children}
          </main>
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
