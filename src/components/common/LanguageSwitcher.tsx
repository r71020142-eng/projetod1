"use client";

import React from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "header" | "pill" | "minimal";
}

export function LanguageSwitcher({
  className = "",
  variant = "header",
}: LanguageSwitcherProps) {
  const { locale, toggleLocale } = useLanguage();

  if (variant === "minimal") {
    return (
      <button
        type="button"
        onClick={toggleLocale}
        aria-label={locale === "pt" ? "Mudar para Inglês (EN)" : "Switch to Portuguese (PT)"}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs text-slate-700 ${className}`}
      >
        <Globe className="h-3.5 w-3.5 text-indigo-600" />
        <span>{locale === "pt" ? "PT" : "EN"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={locale === "pt" ? "Mudar idioma do sistema para Inglês" : "Switch system language to Portuguese"}
      title={locale === "pt" ? "Alternar para Inglês (EN)" : "Switch to Portuguese (PT)"}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200/80 bg-white hover:bg-indigo-50/60 text-xs font-bold transition-all shadow-2xs group ${className}`}
    >
      <Globe className="h-3.5 w-3.5 text-[#5B2FE8] group-hover:rotate-12 transition-transform" />
      <span className="flex items-center gap-1">
        <span className={locale === "pt" ? "text-[#5B2FE8] font-black" : "text-slate-400 font-medium"}>
          PT
        </span>
        <span className="text-slate-300">/</span>
        <span className={locale === "en" ? "text-[#5B2FE8] font-black" : "text-slate-400 font-medium"}>
          EN
        </span>
      </span>
    </button>
  );
}
