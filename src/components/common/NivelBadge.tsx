"use client";

import React from "react";
import { NivelAluno } from "@/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Locale } from "@/lib/i18n/translations";

interface NivelBadgeProps {
  nivel: NivelAluno;
  className?: string;
  showSubtitle?: boolean;
}

const NIVEL_LABELS: Record<NivelAluno, Record<Locale, string>> = {
  nao_avaliado: {
    pt: "Não avaliado",
    en: "Not evaluated",
    fr: "Non évalué",
    es: "No evaluado",
    it: "Non valutato",
    zh: "未评估",
  },
  A1: {
    pt: "Iniciante (A1)",
    en: "Beginner (A1)",
    fr: "Débutant (A1)",
    es: "Principiante (A1)",
    it: "Principiante (A1)",
    zh: "入门级 (A1)",
  },
  A2: {
    pt: "Básico (A2)",
    en: "Elementary (A2)",
    fr: "Élémentaire (A2)",
    es: "Básico (A2)",
    it: "Elementare (A2)",
    zh: "初级 (A2)",
  },
  B1: {
    pt: "Intermediário (B1)",
    en: "Intermediate (B1)",
    fr: "Intermédiaire (B1)",
    es: "Intermedio (B1)",
    it: "Intermedio (B1)",
    zh: "中级 (B1)",
  },
  B2: {
    pt: "Interm. Superior (B2)",
    en: "Upper Intermediate (B2)",
    fr: "Intermédiaire Supérieur (B2)",
    es: "Intermedio Superior (B2)",
    it: "Intermedio Superiore (B2)",
    zh: "中高级 (B2)",
  },
  C1: {
    pt: "Avançado (C1)",
    en: "Advanced (C1)",
    fr: "Avancé (C1)",
    es: "Avanzado (C1)",
    it: "Avanzato (C1)",
    zh: "高级 (C1)",
  },
  C2: {
    pt: "Proficiente (C2)",
    en: "Proficient (C2)",
    fr: "Expérimenté (C2)",
    es: "Competente (C2)",
    it: "Padronanza (C2)",
    zh: "精通级 (C2)",
  },
};

const NIVEL_STYLES: Record<
  NivelAluno,
  { short: string; bg: string; text: string; border: string }
> = {
  nao_avaliado: {
    short: "—",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
  },
  A1: {
    short: "A1",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
  },
  A2: {
    short: "A2",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  B1: {
    short: "B1",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  B2: {
    short: "B2",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  C1: {
    short: "C1",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  C2: {
    short: "C2",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
};

export function NivelBadge({ nivel, className }: NivelBadgeProps) {
  const { locale } = useLanguage();
  const styles = NIVEL_STYLES[nivel] || NIVEL_STYLES.nao_avaliado;
  const label = NIVEL_LABELS[nivel]?.[locale] || NIVEL_LABELS[nivel]?.pt || nivel;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border",
        styles.bg,
        styles.text,
        styles.border,
        className
      )}
    >
      <span className="font-bold">{styles.short !== "—" ? styles.short : ""}</span>
      <span>{label}</span>
    </span>
  );
}
