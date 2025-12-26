"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const strings = {
  en: {
    nav_dashboard: "Dashboard",
    nav_campaigns: "Campaigns",
    nav_discovery: "Discovery",
    nav_analytics: "Analytics",
    nav_settings: "Settings",
    page_dashboard_title: "Executive Dashboard",
    page_campaigns_title: "Campaigns",
    page_campaign_detail_title: "Campaign Workspace",
    page_discovery_title: "Influencer Discovery",
    page_analytics_title: "Analytics",
    page_settings_title: "Workspace Settings",
    action_create_campaign: "Create Campaign",
    action_discover: "Discover",
    action_generate_strategy: "Generate Strategy",
    action_run_recommendation: "Run Recommendation",
    action_generate_strategy_button: "Generate Strategy",
    tab_overview: "Overview",
    tab_influencers: "Influencers",
    tab_strategy: "Strategy",
    tab_performance: "Performance",
    tab_audit: "Audit",
    empty_campaigns_title: "No campaigns found",
    empty_campaigns_desc:
      "Create a new campaign to start generating recommendations and strategies.",
    empty_recommendations_title: "No recommendations yet",
    empty_recommendations_desc:
      "Run the recommendation engine to rank top-fit influencers.",
    empty_strategy_title: "No strategy draft",
    empty_strategy_desc:
      "Generate recommendations first, then draft a strategy with the agent.",
    empty_trace_title: "No trace yet",
    empty_trace_desc:
      "Generate a strategy to see planning + review trace steps.",
    empty_discovery_title: "No discovery results",
    empty_discovery_desc:
      "Run a search to populate this panel with RAG insights.",
    empty_analytics_title: "Analytics not configured",
    empty_analytics_desc:
      "Wire the backend analytics endpoint to populate KPIs.",
    status_available: "Available",
    status_unavailable: "Unavailable",
  },
  th: {
    nav_dashboard: "แดชบอร์ด",
    nav_campaigns: "แคมเปญ",
    nav_discovery: "ค้นหา",
    nav_analytics: "วิเคราะห์",
    nav_settings: "ตั้งค่า",
    page_dashboard_title: "แดชบอร์ดผู้บริหาร",
    page_campaigns_title: "แคมเปญ",
    page_campaign_detail_title: "เวิร์กสเปซแคมเปญ",
    page_discovery_title: "ค้นหาอินฟลูเอนเซอร์",
    page_analytics_title: "การวิเคราะห์",
    page_settings_title: "การตั้งค่าเวิร์กสเปซ",
    action_create_campaign: "สร้างแคมเปญ",
    action_discover: "ค้นหา",
    action_generate_strategy: "สร้างกลยุทธ์",
    action_run_recommendation: "จัดอันดับอินฟลูเอนเซอร์",
    action_generate_strategy_button: "สร้างกลยุทธ์",
    tab_overview: "ภาพรวม",
    tab_influencers: "อินฟลูเอนเซอร์",
    tab_strategy: "กลยุทธ์",
    tab_performance: "ผลงาน",
    tab_audit: "ตรวจสอบ",
    empty_campaigns_title: "ไม่พบแคมเปญ",
    empty_campaigns_desc:
      "สร้างแคมเปญใหม่เพื่อเริ่มแนะนำและวางกลยุทธ์ได้ทันที",
    empty_recommendations_title: "ยังไม่มีคำแนะนำ",
    empty_recommendations_desc:
      "เรียกใช้ระบบจัดอันดับเพื่อคัดอินฟลูเอนเซอร์ที่เหมาะสม",
    empty_strategy_title: "ยังไม่มีแผนกลยุทธ์",
    empty_strategy_desc:
      "สร้างคำแนะนำก่อน แล้วจึงร่างกลยุทธ์ด้วยเอเจนต์",
    empty_trace_title: "ยังไม่มีประวัติการทำงาน",
    empty_trace_desc:
      "สร้างกลยุทธ์เพื่อดูขั้นตอนการวางแผนและตรวจสอบ",
    empty_discovery_title: "ยังไม่มีผลลัพธ์",
    empty_discovery_desc:
      "พิมพ์คำค้นหาเพื่อเรียกผลลัพธ์จากระบบ RAG",
    empty_analytics_title: "ยังไม่ได้ตั้งค่า Analytics",
    empty_analytics_desc:
      "เชื่อมต่อบริการวิเคราะห์เพื่อแสดง KPI",
    status_available: "พร้อมใช้งาน",
    status_unavailable: "ไม่พร้อมใช้งาน",
  },
} as const;

export type Locale = "en" | "th";

type Strings = typeof strings.en;

let activeLocale: Locale = "en";

export function t(key: keyof Strings): string {
  return strings[activeLocale]?.[key] ?? strings.en[key];
}

export function getLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem("nivoxai-locale");
  return stored === "th" || stored === "en" ? stored : "en";
}

export function setLocale(locale: Locale) {
  activeLocale = locale;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("nivoxai-locale", locale);
  }
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof Strings) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = getLocale();
    activeLocale = stored;
    setLocaleState(stored);
  }, []);

  const handleSetLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setLocaleState(nextLocale);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: handleSetLocale,
      t: (key) => strings[locale]?.[key] ?? strings.en[key],
    }),
    [locale]
  );

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: "en",
      setLocale: () => undefined,
      t,
    };
  }
  return context;
}
