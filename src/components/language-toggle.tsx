import { Languages } from "lucide-react";

import { LANGUAGE_LABELS, useI18n, type Language } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const ORDER: Language[] = ["en", "hi"];

/** English / हिंदी switch for the parent-facing surfaces. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-background/70 p-0.5",
        className,
      )}
      role="group"
      aria-label={t("common.language", "Language")}
    >
      <Languages className="ml-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      {ORDER.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            lang === code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {LANGUAGE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
