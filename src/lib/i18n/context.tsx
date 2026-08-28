import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

// EduOS interface language: ENGLISH ONLY (founder decision, 2026-08-28).
// -------------------------------------------------------------------------
// The Hindi dictionary and the English/हिंदी toggle were removed. What remains
// is the generic, harmless copy helper used by ~20 parent/learner surfaces:
//
//   t("diag.hero.title", "Find out where your child is losing marks.")
//
// English copy stays inline in the components, so `t()` is now an identity
// function with `{token}` interpolation. There is no locale state, no locale
// selector, and no runtime branch that can render another language.

export type Language = "en";

const STORAGE_KEY = "eduos.lang";

type Vars = Record<string, string | number>;

export type Translate = (key: string, english: string, vars?: Vars) => string;

type I18nValue = {
  lang: Language;
  t: Translate;
};

export function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

const t: Translate = (_key, english, vars) => interpolate(english, vars);

const VALUE: I18nValue = { lang: "en", t };

const I18nContext = createContext<I18nValue>(VALUE);

/** Drops any legacy `eduos.lang` preference left in a returning browser. */
export function clearStoredLanguagePreference() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — nothing to clean up */
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // A stored "hi" preference from the previous release must never be able to
    // reactivate Hindi; it is simply removed on first load.
    clearStoredLanguagePreference();
    if (typeof document !== "undefined") document.documentElement.lang = "en";
  }, []);

  const value = useMemo(() => VALUE, []);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
