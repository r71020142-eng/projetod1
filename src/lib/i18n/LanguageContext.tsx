"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Locale, translations, TranslationKey } from "./translations";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey, fallback?: string) => string;
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (timeString: string) => string;
  formatDateTime: (dateIso: string, timeString: string) => string;
  translateStatus: (status: string) => string;
  translateModalidade: (modalidade: string) => string;
  translateTipoAula: (tipo?: string) => string;
  translatePresenca: (status: string) => string;
  translateNivel: (nivel: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "mtd_locale_preference_v1";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("pt");

  // Carrega idioma salvo ou detecta do navegador
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
        if (saved === "pt" || saved === "en") {
          setLocaleState(saved);
          document.documentElement.lang = saved === "en" ? "en" : "pt-BR";
        }
      } catch {
        // Fallback para pt
      }
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, newLocale);
        document.documentElement.lang = newLocale === "en" ? "en" : "pt-BR";
        window.dispatchEvent(
          new CustomEvent("mtd_locale_changed", { detail: { locale: newLocale } })
        );
      } catch {
        // Ignora erro no localStorage
      }
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "pt" ? "en" : "pt");
  }, [locale, setLocale]);

  // Listener para sincronização entre janelas e eventos
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "pt" || e.newValue === "en")) {
        setLocaleState(e.newValue);
        document.documentElement.lang = e.newValue === "en" ? "en" : "pt-BR";
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const t = useCallback(
    (key: TranslationKey, fallback?: string): string => {
      const dict = translations[locale] || translations.pt;
      if (key in dict) {
        return dict[key];
      }
      return fallback || key;
    },
    [locale]
  );

  const formatDate = useCallback(
    (dateInput: string | Date, options?: Intl.DateTimeFormatOptions): string => {
      if (!dateInput) return "";
      try {
        let d: Date;
        if (typeof dateInput === "string") {
          if (dateInput.includes("T")) {
            d = new Date(dateInput);
          } else {
            d = new Date(dateInput + "T00:00:00");
          }
        } else {
          d = dateInput;
        }

        if (isNaN(d.getTime())) return String(dateInput);

        const defaultOpts: Intl.DateTimeFormatOptions = options || {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        };

        const loc = locale === "en" ? "en-US" : "pt-BR";
        return new Intl.DateTimeFormat(loc, defaultOpts).format(d);
      } catch {
        return String(dateInput);
      }
    },
    [locale]
  );

  const formatTime = useCallback(
    (timeString: string): string => {
      if (!timeString || !timeString.includes(":")) return timeString;
      if (locale === "pt") return timeString;

      // Conversão para formato 12 horas AM/PM em inglês
      const parts = timeString.split(":");
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1] || "00";

      if (isNaN(hours)) return timeString;

      const ampm = hours >= 12 ? "PM" : "AM";
      const hours12 = hours % 12 || 12;
      return `${hours12}:${minutes} ${ampm}`;
    },
    [locale]
  );

  const formatDateTime = useCallback(
    (dateIso: string, timeString: string): string => {
      const formattedDate = formatDate(dateIso);
      const formattedTime = formatTime(timeString);
      if (locale === "en") {
        return `${formattedDate} at ${formattedTime}`;
      }
      return `${formattedDate} às ${formattedTime}`;
    },
    [formatDate, formatTime, locale]
  );

  const translateStatus = useCallback(
    (status: string): string => {
      const s = status.toLowerCase();
      if (locale === "en") {
        if (s === "ativo") return "Active";
        if (s === "inativo") return "Inactive";
        if (s === "agendada") return "Scheduled";
        if (s === "concluida" || s === "concluída") return "Completed";
        if (s === "cancelada") return "Canceled";
        if (s === "em_andamento") return "In Progress";
        if (s === "confirmada") return "Confirmed";
        if (s === "a_confirmar") return "Pending Confirmation";
      } else {
        if (s === "ativo") return "Ativo";
        if (s === "inativo") return "Inativo";
        if (s === "agendada") return "Agendada";
        if (s === "concluida" || s === "concluída") return "Concluída";
        if (s === "cancelada") return "Cancelada";
        if (s === "em_andamento") return "Em Andamento";
        if (s === "confirmada") return "Confirmada";
        if (s === "a_confirmar") return "A Confirmar";
      }
      return status;
    },
    [locale]
  );

  const translateModalidade = useCallback(
    (modalidade: string): string => {
      if (locale === "en") {
        return modalidade === "individual" ? "1-on-1 (VIP)" : "Group";
      }
      return modalidade === "individual" ? "Individual" : "Grupo";
    },
    [locale]
  );

  const translateTipoAula = useCallback(
    (tipo?: string): string => {
      if (!tipo) return "";
      if (locale === "en") {
        return tipo === "reposicao" ? "Makeup Session" : "Regular Class";
      }
      return tipo === "reposicao" ? "Reposição" : "Regular";
    },
    [locale]
  );

  const translatePresenca = useCallback(
    (status: string): string => {
      if (locale === "en") {
        if (status === "presente") return "Present";
        if (status === "ausente") return "Absent";
        if (status === "justificado") return "Excused";
        return "Unrecorded";
      }
      if (status === "presente") return "Presente";
      if (status === "ausente") return "Ausente";
      if (status === "justificado") return "Justificado";
      return "Não registrado";
    },
    [locale]
  );

  const translateNivel = useCallback(
    (nivel: string): string => {
      if (nivel === "nao_avaliado" || nivel === "nao_definido") {
        return locale === "en" ? "Not Evaluated" : "Não avaliado";
      }
      return nivel;
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
      formatDate,
      formatTime,
      formatDateTime,
      translateStatus,
      translateModalidade,
      translateTipoAula,
      translatePresenca,
      translateNivel,
    }),
    [
      locale,
      setLocale,
      toggleLocale,
      t,
      formatDate,
      formatTime,
      formatDateTime,
      translateStatus,
      translateModalidade,
      translateTipoAula,
      translatePresenca,
      translateNivel,
    ]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback gracioso caso chamado fora do provider
    return {
      locale: "pt" as Locale,
      setLocale: () => {},
      toggleLocale: () => {},
      t: (key: TranslationKey, fallback?: string) => fallback || key,
      formatDate: (d: string | Date) => String(d),
      formatTime: (t: string) => t,
      formatDateTime: (d: string, t: string) => `${d} às ${t}`,
      translateStatus: (s: string) => s,
      translateModalidade: (m: string) => m,
      translateTipoAula: (tp?: string) => tp || "",
      translatePresenca: (p: string) => p,
      translateNivel: (n: string) => n,
    };
  }
  return context;
}
