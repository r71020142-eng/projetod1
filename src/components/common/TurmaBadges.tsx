"use client";

import React from "react";
import { ModalidadeTurma, StatusTurma, StatusAula, StatusPresenca } from "@/types";
import { cn } from "@/lib/utils";
import { Users, User, Check, X, AlertTriangle, HelpCircle, RotateCcw } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Locale } from "@/lib/i18n/translations";

export function TurmaStatusBadge({ status, className }: { status: StatusTurma; className?: string }) {
  const { locale } = useLanguage();

  const labels: Record<StatusTurma, Record<Locale, string>> = {
    formacao: { pt: "Em formação", en: "Forming", fr: "En formation", es: "En formación", it: "In formazione", zh: "组班中" },
    ativa: { pt: "Ativa", en: "Active", fr: "Active", es: "Activa", it: "Attiva", zh: "活跃" },
    pausada: { pt: "Pausada", en: "Paused", fr: "En pause", es: "Pausada", it: "In pausa", zh: "已暂停" },
    encerrada: { pt: "Encerrada", en: "Closed", fr: "Terminée", es: "Cerrada", it: "Chiusa", zh: "已结课" },
  };

  const styleConfigs: Record<StatusTurma, { bg: string; text: string; dot: string; border: string }> = {
    formacao: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      dot: "bg-amber-500",
      border: "border-amber-200/80",
    },
    ativa: {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      dot: "bg-emerald-500",
      border: "border-emerald-200/80",
    },
    pausada: {
      bg: "bg-slate-100",
      text: "text-slate-700",
      dot: "bg-slate-400",
      border: "border-slate-200",
    },
    encerrada: {
      bg: "bg-rose-50",
      text: "text-rose-800",
      dot: "bg-rose-500",
      border: "border-rose-200/80",
    },
  };

  const c = styleConfigs[status] || styleConfigs.ativa;
  const label = labels[status]?.[locale] || labels[status]?.pt || status;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border",
        c.bg,
        c.text,
        c.border,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      <span>{label}</span>
    </span>
  );
}

export function ModalidadeBadge({ modalidade, className }: { modalidade: ModalidadeTurma; className?: string }) {
  const { locale } = useLanguage();
  const isIndividual = modalidade === "individual";

  const labelsInd: Record<Locale, string> = {
    pt: "Individual",
    en: "Individual",
    fr: "Individuel",
    es: "Individual",
    it: "Individuale",
    zh: "一对一",
  };

  const labelsGrp: Record<Locale, string> = {
    pt: "Em Grupo",
    en: "Group",
    fr: "En Groupe",
    es: "En Grupo",
    it: "Di Gruppo",
    zh: "小组",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border",
        isIndividual
          ? "bg-purple-50 text-purple-700 border-purple-200/80"
          : "bg-sky-50 text-sky-700 border-sky-200/80",
        className
      )}
    >
      {isIndividual ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
      <span>{isIndividual ? labelsInd[locale] || "Individual" : labelsGrp[locale] || "Grupo"}</span>
    </span>
  );
}

export function AulaTipoBadge({ tipo, className }: { tipo?: "regular" | "reposicao" | string; className?: string }) {
  const { locale } = useLanguage();
  if (tipo !== "reposicao") return null;

  const labels: Record<Locale, string> = {
    pt: "Reposição",
    en: "Makeup",
    fr: "Rattrapage",
    es: "Recuperación",
    it: "Recupero",
    zh: "补课",
  };

  const titles: Record<Locale, string> = {
    pt: "Aula de reposição pedagógica",
    en: "Makeup class session",
    fr: "Cours de rattrapage pédagogique",
    es: "Clase de recuperación pedagógica",
    it: "Lezione di recupero pedagogico",
    zh: "补课课时",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-xs",
        className
      )}
      title={titles[locale] || titles.pt}
    >
      <RotateCcw className="h-3 w-3 stroke-[2.5]" />
      <span>{labels[locale] || "Reposição"}</span>
    </span>
  );
}

export function AulaStatusBadge({ status, className }: { status: StatusAula; className?: string }) {
  const { locale } = useLanguage();

  const labels: Record<StatusAula, Record<Locale, string>> = {
    agendada: { pt: "Agendada", en: "Scheduled", fr: "Programmée", es: "Programada", it: "Pianificata", zh: "已排期" },
    concluida: { pt: "Concluída", en: "Completed", fr: "Terminée", es: "Completada", it: "Completata", zh: "已完成" },
    cancelada: { pt: "Cancelada", en: "Canceled", fr: "Annulée", es: "Cancelada", it: "Annullata", zh: "已取消" },
  };

  const styles: Record<StatusAula, { bg: string; text: string; border: string }> = {
    agendada: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    concluida: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    cancelada: { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
  };

  const c = styles[status] || styles.agendada;
  const label = labels[status]?.[locale] || labels[status]?.pt || status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border",
        c.bg,
        c.text,
        c.border,
        className
      )}
    >
      {label}
    </span>
  );
}

export function PresencaBadge({ status, className }: { status: StatusPresenca; className?: string }) {
  const { locale } = useLanguage();

  const labels: Record<StatusPresenca, Record<Locale, string>> = {
    presente: { pt: "Presente", en: "Present", fr: "Présent", es: "Presente", it: "Presente", zh: "出勤" },
    ausente: { pt: "Ausente", en: "Absent", fr: "Absent", es: "Ausente", it: "Assente", zh: "缺勤" },
    justificado: { pt: "Justificado", en: "Excused", fr: "Excusé", es: "Justificado", it: "Giustificato", zh: "已请假" },
    nao_registrado: { pt: "Não registrado", en: "Not recorded", fr: "Non enregistré", es: "No registrado", it: "Non registrato", zh: "未记录" },
  };

  switch (status) {
    case "presente":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200",
            className
          )}
        >
          <Check className="h-3 w-3 stroke-[3]" />
          <span>{labels.presente[locale] || "Presente"}</span>
        </span>
      );
    case "ausente":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 border border-rose-200",
            className
          )}
        >
          <X className="h-3 w-3 stroke-[3]" />
          <span>{labels.ausente[locale] || "Ausente"}</span>
        </span>
      );
    case "justificado":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200",
            className
          )}
        >
          <AlertTriangle className="h-3 w-3" />
          <span>{labels.justificado[locale] || "Justificado"}</span>
        </span>
      );
    case "nao_registrado":
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-200",
            className
          )}
        >
          <HelpCircle className="h-3 w-3" />
          <span>{labels.nao_registrado[locale] || "Não registrado"}</span>
        </span>
      );
  }
}
