import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { HI } from "./hi";

// EduOS Hindi Parent Experience v1
// -------------------------------------------------------------------------
// A deliberately small translation layer. English copy stays inline in the
// components (so it is always the fallback and SEO/SSR keeps working), and
// Hindi lives in one reviewed dictionary keyed by a stable id.
//
//   t("diag.hero.title", "Find out where your child is losing marks.")
//
// If a key is missing from the Hindi dictionary the English string renders,
// so a partial translation can never blank a screen.

export type Language = "en" | "hi";

const STORAGE_KEY = "eduos.lang";

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  hi: "हिंदी",
};

type Vars = Record<string, string | number>;

export type Translate = (key: string, english: string, vars?: Vars) => string;

type I18nValue = {
  lang: Language;
  setLang: (next: Language) => void;
  t: Translate;
};

const I18nContext = createContext<I18nValue | null>(null);

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

function readStored(): Language {
  if (typeof window === "undefined") return "en";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always render English on the server and on the first client paint, then
  // switch after hydration — this keeps SSR markup and hydration in step.
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const stored = readStored();
    if (stored !== "en") setLangState(stored);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable — language simply won't persist */
    }
  }, []);

  const t = useCallback<Translate>(
    (key, english, vars) => {
      const hindi = lang === "hi" ? HI[key] : undefined;
      return interpolate(hindi ?? english, vars);
    },
    [lang],
  );

  const value = useMemo<I18nValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  // Outside the provider (tests, isolated renders) English is the answer.
  if (!ctx) {
    return {
      lang: "en",
      setLang: () => {},
      t: (_key, english, vars) => interpolate(english, vars),
    };
  }
  return ctx;
}
