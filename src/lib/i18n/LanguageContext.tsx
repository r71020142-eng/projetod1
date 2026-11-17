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

const VALID_LOCALES: Locale[] = ["pt", "en", "fr", "es", "it", "zh"];

const LOCALE_HTML_LANG: Record<Locale, string> = {
  pt: "pt-BR",
  en: "en",
  fr: "fr",
  es: "es",
  it: "it",
  zh: "zh-CN",
};

const LOCALE_INTL_CODE: Record<Locale, string> = {
  pt: "pt-BR",
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
  zh: "zh-CN",
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("pt");

  // Carrega idioma salvo ou detecta do navegador
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
        if (saved && VALID_LOCALES.includes(saved)) {
          setLocaleState(saved);
          document.documentElement.lang = LOCALE_HTML_LANG[saved] || "pt-BR";
        }
      } catch {
        // Fallback para pt
      }
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    if (!VALID_LOCALES.includes(newLocale)) return;
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, newLocale);
        document.documentElement.lang = LOCALE_HTML_LANG[newLocale] || "pt-BR";
        window.dispatchEvent(
          new CustomEvent("mtd_locale_changed", { detail: { locale: newLocale } })
        );
      } catch {
        // Ignora erro no localStorage
      }
    }
  }, []);

  const toggleLocale = useCallback(() => {
    // Alterna sequencialmente entre os idiomas suportados ou cicla
    setLocaleState((curr) => {
      const idx = VALID_LOCALES.indexOf(curr);
      const next = VALID_LOCALES[(idx + 1) % VALID_LOCALES.length];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, next);
          document.documentElement.lang = LOCALE_HTML_LANG[next] || "pt-BR";
          window.dispatchEvent(
            new CustomEvent("mtd_locale_changed", { detail: { locale: next } })
          );
        } catch {
          // Ignora
        }
      }
      return next;
    });
  }, []);

  // Listener para sincronização entre janelas e eventos
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && VALID_LOCALES.includes(e.newValue as Locale)) {
        const newLoc = e.newValue as Locale;
        setLocaleState(newLoc);
        document.documentElement.lang = LOCALE_HTML_LANG[newLoc] || "pt-BR";
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

        const loc = LOCALE_INTL_CODE[locale] || "pt-BR";
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
      if (locale !== "en") return timeString;

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
      switch (locale) {
        case "en":
          return `${formattedDate} at ${formattedTime}`;
        case "fr":
          return `${formattedDate} à ${formattedTime}`;
        case "es":
          return `${formattedDate} a las ${formattedTime}`;
        case "it":
          return `${formattedDate} alle ${formattedTime}`;
        case "zh":
          return `${formattedDate} ${formattedTime}`;
        case "pt":
        default:
          return `${formattedDate} às ${formattedTime}`;
      }
    },
    [formatDate, formatTime, locale]
  );

  const translateStatus = useCallback(
    (status: string): string => {
      const s = status.toLowerCase();
      const MAP: Record<string, Record<Locale, string>> = {
        ativo: { pt: "Ativo", en: "Active", fr: "Actif", es: "Activo", it: "Attivo", zh: "活跃" },
        inativo: { pt: "Inativo", en: "Inactive", fr: "Inactif", es: "Inactivo", it: "Inattivo", zh: "停用" },
        agendada: { pt: "Agendada", en: "Scheduled", fr: "Programmée", es: "Programada", it: "Pianificata", zh: "已排期" },
        concluida: { pt: "Concluída", en: "Completed", fr: "Terminée", es: "Completada", it: "Completata", zh: "已完成" },
        concluída: { pt: "Concluída", en: "Completed", fr: "Terminée", es: "Completada", it: "Completata", zh: "已完成" },
        cancelada: { pt: "Cancelada", en: "Canceled", fr: "Annulée", es: "Cancelada", it: "Annullata", zh: "已取消" },
        em_andamento: { pt: "Em Andamento", en: "In Progress", fr: "En cours", es: "En curso", it: "In corso", zh: "进行中" },
        confirmada: { pt: "Confirmada", en: "Confirmed", fr: "Confirmée", es: "Confirmada", it: "Confermata", zh: "已确认" },
        a_confirmar: { pt: "A Confirmar", en: "Pending Confirmation", fr: "À confirmer", es: "Por confirmar", it: "Da confermare", zh: "待确认" },
        formacao: { pt: "Em formação", en: "Forming", fr: "En formation", es: "En formación", it: "In formazione", zh: "组班中" },
        pausada: { pt: "Pausada", en: "Paused", fr: "En pause", es: "Pausada", it: "In pausa", zh: "已暂停" },
        encerrada: { pt: "Encerrada", en: "Closed", fr: "Terminée", es: "Cerrada", it: "Chiusa", zh: "已结课" },
      };

      if (MAP[s] && MAP[s][locale]) {
        return MAP[s][locale];
      }
      return status;
    },
    [locale]
  );

  const translateModalidade = useCallback(
    (modalidade: string): string => {
      const isInd = modalidade.toLowerCase() === "individual";
      const MAP: Record<"ind" | "grp", Record<Locale, string>> = {
        ind: { pt: "Individual (VIP)", en: "1-on-1 (VIP)", fr: "Individuel (VIP)", es: "Individual (VIP)", it: "Individuale (VIP)", zh: "一对一 (VIP)" },
        grp: { pt: "Grupo", en: "Group", fr: "Groupe", es: "Grupo", it: "Gruppo", zh: "小组" },
      };
      return MAP[isInd ? "ind" : "grp"][locale] || modalidade;
    },
    [locale]
  );

  const translateTipoAula = useCallback(
    (tipo?: string): string => {
      if (!tipo) return "";
      const isRep = tipo.toLowerCase() === "reposicao";
      const MAP: Record<"rep" | "reg", Record<Locale, string>> = {
        rep: { pt: "Reposição", en: "Makeup Session", fr: "Rattrapage", es: "Recuperación", it: "Recupero", zh: "补课" },
        reg: { pt: "Regular", en: "Regular Class", fr: "Cours régulier", es: "Clase regular", it: "Lezione regolare", zh: "常规课" },
      };
      return MAP[isRep ? "rep" : "reg"][locale] || tipo;
    },
    [locale]
  );

  const translatePresenca = useCallback(
    (status: string): string => {
      const s = status.toLowerCase();
      const MAP: Record<string, Record<Locale, string>> = {
        presente: { pt: "Presente", en: "Present", fr: "Présent", es: "Presente", it: "Presente", zh: "出勤" },
        ausente: { pt: "Ausente", en: "Absent", fr: "Absent", es: "Ausente", it: "Assente", zh: "缺勤" },
        justificado: { pt: "Justificado", en: "Excused", fr: "Excusé", es: "Justificado", it: "Giustificato", zh: "已请假" },
        nao_registrado: { pt: "Não registrado", en: "Unrecorded", fr: "Non enregistré", es: "No registrado", it: "Non registrato", zh: "未记录" },
      };
      return MAP[s]?.[locale] || (locale === "pt" ? "Não registrado" : "Unrecorded");
    },
    [locale]
  );

  const translateNivel = useCallback(
    (nivel: string): string => {
      if (nivel === "nao_avaliado" || nivel === "nao_definido") {
        const MAP: Record<Locale, string> = {
          pt: "Não avaliado",
          en: "Not Evaluated",
          fr: "Non évalué",
          es: "No evaluado",
          it: "Non valutato",
          zh: "未评估",
        };
        return MAP[locale] || "Não avaliado";
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
