"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { SUPPORTED_LANGUAGES, Locale } from "@/lib/i18n/translations";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "header" | "pill" | "minimal";
}

export function LanguageSwitcher({
  className = "",
  variant = "header",
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const currentLang =
    SUPPORTED_LANGUAGES.find((lang) => lang.code === locale) ||
    SUPPORTED_LANGUAGES[0];

  const handleSelectLanguage = (code: Locale) => {
    setLocale(code);
    setIsOpen(false);
  };

  if (variant === "minimal") {
    return (
      <div className={`relative inline-block ${className}`} ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={`Idioma atual: ${currentLang.nativeLabel}. Clique para alterar.`}
          aria-expanded={isOpen}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs text-slate-700"
        >
          <span>{currentLang.flag}</span>
          <span className="uppercase">{currentLang.code}</span>
          <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-slate-200/90 bg-white py-1.5 shadow-lg z-50 animate-in fade-in-50 zoom-in-95">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === locale;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors ${
                    isSelected
                      ? "bg-indigo-50/80 text-indigo-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50 font-medium"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <span>{lang.nativeLabel}</span>
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Idioma: ${currentLang.nativeLabel}. Clique para selecionar idioma.`}
        aria-expanded={isOpen}
        title="Alterar idioma da plataforma (PT, EN, FR, ES, IT, ZH)"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-200/80 bg-white hover:bg-indigo-50/60 text-xs font-bold transition-all shadow-2xs group text-slate-700"
      >
        <Globe className="h-3.5 w-3.5 text-[#5B2FE8] group-hover:rotate-12 transition-transform shrink-0" />
        <span className="flex items-center gap-1.5 font-bold">
          <span className="text-sm leading-none">{currentLang.flag}</span>
          <span className="text-[#5B2FE8] tracking-wide uppercase font-black">
            {currentLang.code}
          </span>
        </span>
        <ChevronDown
          className={`h-3 w-3 text-slate-400 group-hover:text-indigo-600 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl shadow-indigo-950/10 z-50 animate-in fade-in-50 zoom-in-95 backdrop-blur-md">
          <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Idioma / Language
            </span>
          </div>

          <div className="space-y-0.5">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === locale;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-left transition-colors ${
                    isSelected
                      ? "bg-[#5B2FE8]/10 text-[#5B2FE8] font-bold"
                      : "text-slate-700 hover:bg-slate-50 font-medium"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-lg leading-none">{lang.flag}</span>
                    <div className="flex flex-col">
                      <span className="leading-tight">{lang.nativeLabel}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {lang.label} ({lang.code.toUpperCase()})
                      </span>
                    </div>
                  </span>
                  {isSelected && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5B2FE8] text-white">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
