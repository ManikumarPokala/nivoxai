"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui/utils";
import { useI18n } from "@/i18n";
import {
  Activity,
  BarChart3,
  Bot,
  Database,
  FileCheck2,
  KeyRound,
  Lock,
  MoreVertical,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import DiagnosticsDrawer from "@/components/DiagnosticsDrawer";
import ToastViewport from "@/components/ui/ToastViewport";
import {
  bootstrapDemoSession,
  getStoredTenantId,
  subscribeAuth,
  syncSessionFromCookies,
} from "@/lib/auth";
import { requestJson } from "@/lib/apiClient";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"ready" | "missing" | "bootstrapping">(
    "bootstrapping"
  );
  const [sessionTenant, setSessionTenant] = useState<string | null>(getStoredTenantId());
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const initRef = useRef(false);
  const loginInFlightRef = useRef(false);
  const { locale, setLocale, t } = useI18n();
  const gitSha = process.env.NEXT_PUBLIC_GIT_SHA ?? "dev";

  const navItems = [
    { label: t("nav_demo"), href: "/demo", icon: PlayCircle },
    { label: t("nav_qa_ops"), href: "/qa/ops", icon: ShieldCheck },
    { label: t("nav_qa_auth"), href: "/qa/auth", icon: KeyRound },
    { label: t("nav_qa_campaigns"), href: "/qa/campaigns", icon: Target },
    { label: t("nav_qa_recommend"), href: "/qa/recommend", icon: Sparkles },
    { label: t("nav_qa_rag"), href: "/qa/rag", icon: Database },
    { label: t("nav_qa_agent"), href: "/qa/agent", icon: Bot },
    { label: t("nav_qa_analytics"), href: "/qa/analytics", icon: BarChart3 },
    { label: t("nav_qa_admin"), href: "/qa/admin", icon: Lock },
  ];

  const titleMap: Record<string, string> = {
    "/campaigns": t("page_campaigns_title"),
    "/analytics": t("page_analytics_title"),
    "/demo": t("demo_title"),
    "/qa/ops": t("nav_qa_ops"),
    "/qa/auth": t("nav_qa_auth"),
    "/qa/campaigns": t("nav_qa_campaigns"),
    "/qa/recommend": t("nav_qa_recommend"),
    "/qa/rag": t("nav_qa_rag"),
    "/qa/agent": t("nav_qa_agent"),
    "/qa/analytics": t("nav_qa_analytics"),
    "/qa/admin": t("nav_qa_admin"),
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


  async function ensureSession() {
    if (sessionStatus === "ready" || loginInFlightRef.current) {
      return;
    }
    loginInFlightRef.current = true;
    setSessionStatus("bootstrapping");
    const existing = await syncSessionFromCookies();
    if (existing?.tenant_id) {
      setSessionTenant(existing.tenant_id);
      setSessionRole(existing.role ?? null);
      setSessionStatus("ready");
      loginInFlightRef.current = false;
      return;
    }
    if (typeof window !== "undefined") {
      const lastAttempt = Number(window.sessionStorage.getItem("nivoxai_demo_login_at") ?? "0");
      if (lastAttempt && Date.now() - lastAttempt < 30_000) {
        setSessionStatus("missing");
        loginInFlightRef.current = false;
        return;
      }
      window.sessionStorage.setItem("nivoxai_demo_login_at", String(Date.now()));
    }
    const demo = await bootstrapDemoSession();
    if (demo?.tenant_id) {
      setSessionTenant(demo.tenant_id);
      setSessionRole(demo.role ?? null);
      setSessionStatus("ready");
      loginInFlightRef.current = false;
      return;
    }
    setSessionStatus("missing");
    loginInFlightRef.current = false;
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (initRef.current) {
      return;
    }
    initRef.current = true;
    void ensureSession();
  }, []);

  useEffect(() => {
    const unsub = subscribeAuth(() => {
      const tenantId = getStoredTenantId();
      setSessionTenant(tenantId);
      setSessionStatus(tenantId ? "ready" : "missing");
    });
    return () => {
      unsub();
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-50 via-[#f7f6f2] to-slate-100 text-slate-900">
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
                {t("label_suite")}
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
                  <span className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  {isActive ? (
                    <span className="text-xs text-slate-200">●</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-10">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <p className="font-semibold text-slate-700">{t("label_workspace")}</p>
              <p className="mt-1">{t("label_workspace_hint")}</p>
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
                  aria-label={t("label_menu")}
                >
                  <span className="block h-0.5 w-4 rounded-full bg-slate-600" />
                  <span className="block h-0.5 w-4 rounded-full bg-slate-600" />
                  <span className="block h-0.5 w-4 rounded-full bg-slate-600" />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {t("label_workspace")}
                  </p>
                  <h1 className="text-lg font-semibold text-slate-900">
                    {pageTitle}
                  </h1>
                </div>
              </div>

              <div className="hidden items-center gap-3 lg:flex">
                {sessionStatus === "ready" ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {t("header_session_active")} • {t("label_tenant")}{" "}
                    {sessionTenant ?? t("status_missing")} • {t("label_role")}{" "}
                    {sessionRole ?? t("status_missing")}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={ensureSession}
                    className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700"
                  >
                    {t("header_start_demo")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await requestJson("/api/session", { method: "DELETE" });
                    setSessionStatus("missing");
                    void ensureSession();
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  <span className="flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4" />
                    {t("header_reset_session")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiagnostics(true)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600"
                >
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {t("diagnostics_subtitle")}
                  </span>
                </button>
                <div className="flex items-center rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                  <button
                    type="button"
                    onClick={() => setLocale("en")}
                    className={cn(
                      "rounded-full px-2 py-1",
                      locale === "en" ? "bg-slate-900 text-white" : "text-slate-600"
                    )}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocale("th")}
                    className={cn(
                      "rounded-full px-2 py-1",
                      locale === "th" ? "bg-slate-900 text-white" : "text-slate-600"
                    )}
                  >
                    TH
                  </button>
                </div>
              </div>
              <div className="relative flex items-center gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => setShowDiagnostics(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
                  aria-label={t("diagnostics_subtitle")}
                >
                  <Activity className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActionsOpen((prev) => !prev)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
                  aria-label={t("label_menu")}
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {actionsOpen ? (
                  <div className="absolute right-0 top-11 z-50 w-52 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={ensureSession}
                        className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left font-semibold text-amber-700"
                      >
                        {t("header_start_demo")}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await requestJson("/api/session", { method: "DELETE" });
                          setSessionStatus("missing");
                          void ensureSession();
                        }}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-slate-600"
                      >
                        {t("header_reset_session")}
                      </button>
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                        <span className="text-slate-500">{t("label_language")}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setLocale("en")}
                            className={cn(
                              "rounded-full px-2 py-1",
                              locale === "en" ? "bg-slate-900 text-white" : "text-slate-600"
                            )}
                          >
                            EN
                          </button>
                          <button
                            type="button"
                            onClick={() => setLocale("th")}
                            className={cn(
                              "rounded-full px-2 py-1",
                              locale === "th" ? "bg-slate-900 text-white" : "text-slate-600"
                            )}
                          >
                            TH
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="page-enter px-4 py-6 lg:px-10 lg:py-10">
            {sessionStatus !== "ready" ? (
              <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                {sessionStatus === "bootstrapping"
                  ? t("header_session_bootstrapping")
                  : t("header_session_missing")}
              </div>
            ) : null}
            {children}
          </main>
          <footer className="border-t border-slate-200/70 bg-white/80 px-4 py-3 text-xs text-slate-500 lg:px-10">
            {t("label_build")} {gitSha}
          </footer>
        </div>
      </div>

      {isOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-label={t("label_close_navigation")}
        />
      ) : null}

      <DiagnosticsDrawer open={showDiagnostics} onClose={() => setShowDiagnostics(false)} />
      <ToastViewport />
    </div>
  );
}
