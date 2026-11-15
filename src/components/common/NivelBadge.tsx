"use client";

import React from "react";
import { NivelAluno } from "@/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface NivelBadgeProps {
  nivel: NivelAluno;
  className?: string;
  showSubtitle?: boolean;
}

export const NIVEL_CONFIG_PT: Record<
  NivelAluno,
  { label: string; short: string; bg: string; text: string; border: string }
> = {
  nao_avaliado: {
    label: "Não avaliado",
    short: "—",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
  },
  A1: {
    label: "Iniciante (A1)",
    short: "A1",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
  },
  A2: {
    label: "Básico (A2)",
    short: "A2",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  B1: {
    label: "Intermediário (B1)",
    short: "B1",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  B2: {
    label: "Interm. Superior (B2)",
    short: "B2",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  C1: {
    label: "Avançado (C1)",
    short: "C1",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  C2: {
    label: "Proficiente (C2)",
    short: "C2",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
};

export const NIVEL_CONFIG_EN: Record<
  NivelAluno,
  { label: string; short: string; bg: string; text: string; border: string }
> = {
  nao_avaliado: {
    label: "Not evaluated",
    short: "—",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
  },
  A1: {
    label: "Beginner (A1)",
    short: "A1",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
  },
  A2: {
    label: "Elementary (A2)",
    short: "A2",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  B1: {
    label: "Intermediate (B1)",
    short: "B1",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  B2: {
    label: "Upper Intermediate (B2)",
    short: "B2",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  C1: {
    label: "Advanced (C1)",
    short: "C1",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  C2: {
    label: "Proficient (C2)",
    short: "C2",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
};

export const NIVEL_CONFIG = NIVEL_CONFIG_PT;

export function NivelBadge({ nivel, className, showSubtitle = false }: NivelBadgeProps) {
  const { locale } = useLanguage();
  const configMap = locale === "en" ? NIVEL_CONFIG_EN : NIVEL_CONFIG_PT;
  const config = configMap[nivel] || configMap.nao_avaliado;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <span className="font-bold">{config.short !== "—" ? config.short : ""}</span>
      <span>{showSubtitle ? config.label : config.label}</span>
    </span>
  );
}
