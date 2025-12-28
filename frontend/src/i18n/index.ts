"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { en } from "./en";
import { th } from "./th";

export type Locale = "en" | "th";
export type I18nKey = keyof typeof en;

const strings = { en, th } as const;
const STORAGE_KEY = "nivoxai_lang";
const COOKIE_KEY = "lang";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: I18nKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const readCookie = (): Locale | null => {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_KEY}=`));
  if (!match) {
    return null;
  }
  const value = match.split("=")[1];
  return value === "th" ? "th" : value === "en" ? "en" : null;
};

const writeCookie = (locale: Locale) => {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${COOKIE_KEY}=${locale}; path=/; max-age=31536000`;
};

const readStoredLocale = (): Locale => {
  if (typeof window === "undefined") {
    return "en";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "th" || stored === "en") {
    return stored;
  }
  const cookieLocale = readCookie();
  return cookieLocale ?? "en";
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const initial = readStoredLocale();
    setLocaleState(initial);
  }, []);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextLocale);
      writeCookie(nextLocale);
    }
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
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
      t: (key) => strings.en[key],
    };
  }
  return context;
}
