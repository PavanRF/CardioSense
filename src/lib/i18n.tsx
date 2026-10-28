import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import hi from "@/locales/hi.json";

export const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "es", label: "Español", short: "ES" },
  { code: "hi", label: "हिन्दी", short: "हि" },
] as const;
export type Lang = (typeof LANGUAGES)[number]["code"];
export type MessageKey = keyof typeof en;

const DICTS: Record<Lang, Record<string, string>> = { en, es, hi };
const STORAGE_KEY = "cardiosense.lang";
const LOCALES: Record<Lang, string> = { en: "en-US", es: "es-ES", hi: "hi-IN" };

type Vars = Record<string, string | number>;
type I18n = {
  lang: Lang;
  locale: string;
  setLang: (l: Lang) => void;
  t: (key: MessageKey | (string & {}), vars?: Vars) => string;
  fmtPct: (v: number, digits?: number) => string;
  fmtNum: (v: number, digits?: number) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function translate(lang: Lang, key: string, vars?: Vars) {
  const raw = DICTS[lang][key] ?? DICTS.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es" || saved === "hi") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const value = useMemo<I18n>(() => {
    const locale = LOCALES[lang];
    return {
      lang,
      locale,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      fmtPct: (v, digits = 1) =>
        new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v),
      fmtNum: (v, digits = 0) =>
        new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
