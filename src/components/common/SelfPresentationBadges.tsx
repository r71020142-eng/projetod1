"use client";

import React from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Award,
} from "lucide-react";
import { StatusSelfPresentation, TipoSelfPresentation } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Locale } from "@/lib/i18n/translations";

interface StatusSelfPresentationBadgeProps {
  status: StatusSelfPresentation;
  className?: string;
}

export function StatusSelfPresentationBadge({
  status,
  className = "",
}: StatusSelfPresentationBadgeProps) {
  const { locale } = useLanguage();

  const labels: Record<StatusSelfPresentation, Record<Locale, string>> = {
    rascunho: { pt: "Rascunho", en: "Draft", fr: "Brouillon", es: "Borrador", it: "Bozza", zh: "草稿" },
    enviada: { pt: "Aguardando Avaliação", en: "Pending Evaluation", fr: "En attente d'évaluation", es: "Esperando evaluación", it: "In attesa di valutazione", zh: "等待评估" },
    em_avaliacao: { pt: "Em Avaliação", en: "In Evaluation", fr: "En cours d'évaluation", es: "En evaluación", it: "In valutazione", zh: "评估中" },
    reenvio_solicitado: { pt: "Reenvio Solicitado", en: "Resubmission Requested", fr: "Nouvelle soumission requise", es: "Reenvío solicitado", it: "Reinvio richiesto", zh: "需重新提交" },
    avaliada: { pt: "Avaliação Concluída", en: "Evaluation Completed", fr: "Évaluation terminée", es: "Evaluación completada", it: "Valutazione completata", zh: "已完成评估" },
  };

  switch (status) {
    case "rascunho":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 ${className}`}
        >
          <FileText className="h-3.5 w-3.5 text-slate-500" />
          <span>{labels.rascunho[locale] || labels.rascunho.pt}</span>
        </span>
      );
    case "enviada":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 ${className}`}
        >
          <Clock className="h-3.5 w-3.5 text-amber-600" />
          <span>{labels.enviada[locale] || labels.enviada.pt}</span>
        </span>
      );
    case "em_avaliacao":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 ${className}`}
        >
          <Clock className="h-3.5 w-3.5 text-indigo-600" />
          <span>{labels.em_avaliacao[locale] || labels.em_avaliacao.pt}</span>
        </span>
      );
    case "reenvio_solicitado":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 ${className}`}
        >
          <RotateCcw className="h-3.5 w-3.5 text-purple-600" />
          <span>{labels.reenvio_solicitado[locale] || labels.reenvio_solicitado.pt}</span>
        </span>
      );
    case "avaliada":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 ${className}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>{labels.avaliada[locale] || labels.avaliada.pt}</span>
        </span>
      );
    default: {
      const undefinedLabel: Record<Locale, string> = {
        pt: "Status Indefinido",
        en: "Undefined Status",
        fr: "Statut indéfini",
        es: "Estado indefinido",
        it: "Stato non definito",
        zh: "未定义状态",
      };
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 ${className}`}
        >
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{undefinedLabel[locale] || "Status Indefinido"}</span>
        </span>
      );
    }
  }
}

interface TipoSelfPresentationBadgeProps {
  tipo: TipoSelfPresentation;
  className?: string;
}

export function TipoSelfPresentationBadge({
  tipo,
  className = "",
}: TipoSelfPresentationBadgeProps) {
  const { locale } = useLanguage();

  const labels: Record<TipoSelfPresentation, Record<Locale, string>> = {
    nivelamento_inicial: {
      pt: "Nivelamento Inicial",
      en: "Initial Leveling",
      fr: "Test de niveau initial",
      es: "Nivelación inicial",
      it: "Livellamento iniziale",
      zh: "初始定级",
    },
    reavaliacao: {
      pt: "Reavaliação",
      en: "Reassessment",
      fr: "Réévaluation",
      es: "Reevaluación",
      it: "Rivalutazione",
      zh: "重新评估",
    },
  };

  if (tipo === "nivelamento_inicial") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 ${className}`}
      >
        <Award className="h-3 w-3 text-indigo-600" />
        <span>{labels.nivelamento_inicial[locale] || labels.nivelamento_inicial.pt}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200/60 ${className}`}
    >
      <RotateCcw className="h-3 w-3 text-cyan-600" />
      <span>{labels.reavaliacao[locale] || labels.reavaliacao.pt}</span>
    </span>
  );
}

interface ScorePillProps {
  score: number; // 1 to 5
}

export function ScorePill({ score }: ScorePillProps) {
  const colors = [
    "bg-rose-100 text-rose-800 border-rose-200",
    "bg-amber-100 text-amber-800 border-amber-200",
    "bg-yellow-100 text-yellow-800 border-yellow-200",
    "bg-teal-100 text-teal-800 border-teal-200",
    "bg-emerald-100 text-emerald-800 border-emerald-200",
  ];
  const color = colors[Math.min(Math.max(score - 1, 0), 4)];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}
    >
      {score}/5
    </span>
  );
}
