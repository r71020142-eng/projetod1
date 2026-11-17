"use client";

import React from "react";
import {
  TipoAvaliacao,
  StatusAvaliacao,
  StatusTentativa,
  ResultadoAvaliacao,
  StatusProgressoModulo,
  StatusModulo,
} from "@/types";
import {
  FileCheck2,
  FileEdit,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Locale } from "@/lib/i18n/translations";

export function TipoAvaliacaoBadge({ tipo }: { tipo: TipoAvaliacao }) {
  const { locale } = useLanguage();

  const labelsObj: Record<Locale, string> = {
    pt: "Objetiva (Múltipla Escolha)",
    en: "Objective (Multiple Choice)",
    fr: "Objective (Choix multiple)",
    es: "Objetiva (Opción múltiple)",
    it: "Oggettiva (Scelta multipla)",
    zh: "客观题 (多项选择)",
  };

  const labelsPrat: Record<Locale, string> = {
    pt: "Prática (Correção Humana)",
    en: "Practical (Human Evaluation)",
    fr: "Pratique (Évaluation humaine)",
    es: "Práctica (Corrección humana)",
    it: "Pratica (Valutazione umana)",
    zh: "实操题 (人工批改)",
  };

  if (tipo === "objetiva") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
        {labelsObj[locale] || labelsObj.pt}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
      <FileEdit className="w-3.5 h-3.5 text-purple-600" />
      {labelsPrat[locale] || labelsPrat.pt}
    </span>
  );
}

export function StatusAvaliacaoBadge({ status }: { status: StatusAvaliacao }) {
  const { locale } = useLanguage();

  const labels: Record<StatusAvaliacao, Record<Locale, string>> = {
    rascunho: { pt: "Rascunho", en: "Draft", fr: "Brouillon", es: "Borrador", it: "Bozza", zh: "草稿" },
    agendada: { pt: "Agendada", en: "Scheduled", fr: "Programmée", es: "Programada", it: "Pianificata", zh: "已排期" },
    publicada: { pt: "Publicada", en: "Published", fr: "Publiée", es: "Publicada", it: "Pubblicata", zh: "已发布" },
    encerrada: { pt: "Encerrada", en: "Closed", fr: "Terminée", es: "Cerrada", it: "Chiusa", zh: "已结课" },
    arquivada: { pt: "Arquivada", en: "Archived", fr: "Archivée", es: "Archivada", it: "Archiviata", zh: "已归档" },
  };

  const styles: Record<StatusAvaliacao, string> = {
    rascunho: "bg-slate-100 text-slate-700 border-slate-200",
    agendada: "bg-amber-50 text-amber-700 border-amber-200",
    publicada: "bg-emerald-50 text-emerald-700 border-emerald-200",
    encerrada: "bg-rose-50 text-rose-700 border-rose-200",
    arquivada: "bg-gray-100 text-gray-500 border-gray-200",
  };

  const styleClass = styles[status] || styles.rascunho;
  const label = labels[status]?.[locale] || labels[status]?.pt || status;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styleClass}`}
    >
      {label}
    </span>
  );
}

export function StatusTentativaBadge({ status }: { status: StatusTentativa }) {
  const { locale } = useLanguage();

  const labels: Record<StatusTentativa, Record<Locale, string>> = {
    em_andamento: { pt: "Em andamento (Rascunho)", en: "In Progress (Draft)", fr: "En cours (Brouillon)", es: "En curso (Borrador)", it: "In corso (Bozza)", zh: "进行中 (草稿)" },
    enviada: { pt: "Enviada", en: "Submitted", fr: "Soumise", es: "Enviada", it: "Inviata", zh: "已提交" },
    aguardando_correcao: { pt: "Aguardando Correção", en: "Awaiting Grading", fr: "En attente de correction", es: "Esperando corrección", it: "In attesa di correzione", zh: "等待批改" },
    corrigida: { pt: "Corrigida", en: "Graded", fr: "Corrigée", es: "Calificada", it: "Corretta", zh: "已批改" },
    reaberta: { pt: "Tentativa Reaberta", en: "Attempt Reopened", fr: "Tentative rouverte", es: "Intento reabierto", it: "Tentativo riaperto", zh: "重新开启尝试" },
  };

  const configs: Record<
    StatusTentativa,
    { className: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    em_andamento: { className: "bg-slate-100 text-slate-700 border-slate-200", icon: Clock },
    enviada: { className: "bg-blue-50 text-blue-700 border-blue-200", icon: CheckCircle2 },
    aguardando_correcao: { className: "bg-amber-50 text-amber-800 border-amber-200 font-semibold", icon: AlertCircle },
    corrigida: { className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    reaberta: { className: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: RotateCcw },
  };

  const cfg = configs[status] || configs.em_andamento;
  const Icon = cfg.icon;
  const label = labels[status]?.[locale] || labels[status]?.pt || status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${cfg.className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export function ResultadoBadge({ resultado }: { resultado?: ResultadoAvaliacao }) {
  const { locale } = useLanguage();
  if (!resultado) return null;

  const labels: Record<ResultadoAvaliacao, Record<Locale, string>> = {
    aprovado: { pt: "Aprovado", en: "Passed", fr: "Admis", es: "Aprobado", it: "Superato", zh: "已通过" },
    reprovado: { pt: "Reprovado", en: "Failed", fr: "Échoué", es: "Reprobado", it: "Non superato", zh: "未通过" },
    precisa_reforco: { pt: "Precisa de Reforço", en: "Needs Reinforcement", fr: "Nécessite un renforcement", es: "Necesita refuerzo", it: "Necessita di rinforzo", zh: "需要巩固强化" },
    refazer: { pt: "Refazer Avaliação", en: "Retake Assessment", fr: "Repasser l'évaluation", es: "Repetir evaluación", it: "Ripetere valutazione", zh: "重新测评" },
  };

  const configs: Record<
    ResultadoAvaliacao,
    { className: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    aprovado: { className: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
    reprovado: { className: "bg-rose-100 text-rose-800 border-rose-200", icon: XCircle },
    precisa_reforco: { className: "bg-amber-100 text-amber-800 border-amber-200", icon: AlertCircle },
    refazer: { className: "bg-indigo-100 text-indigo-800 border-indigo-200", icon: RotateCcw },
  };

  const cfg = configs[resultado];
  if (!cfg) return null;
  const Icon = cfg.icon;
  const label = labels[resultado]?.[locale] || labels[resultado]?.pt || resultado;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export function StatusProgressoModuloBadge({
  status,
}: {
  status: StatusProgressoModulo;
}) {
  const { locale } = useLanguage();

  const labels: Record<StatusProgressoModulo, Record<Locale, string>> = {
    nao_iniciado: { pt: "Não Iniciado", en: "Not Started", fr: "Non commencé", es: "No iniciado", it: "Non iniziato", zh: "未开始" },
    em_andamento: { pt: "Em Andamento", en: "In Progress", fr: "En cours", es: "En curso", it: "In corso", zh: "进行中" },
    aguardando_validacao: { pt: "Aguardando Validação do Professor", en: "Awaiting Teacher Validation", fr: "En attente de validation du professeur", es: "Esperando validación del profesor", it: "In attesa di convalida del docente", zh: "等待教师核准" },
    concluido: { pt: "Módulo Concluído", en: "Module Completed", fr: "Module terminé", es: "Módulo completado", it: "Modulo completato", zh: "模块已完成" },
    reaberto: { pt: "Módulo Reaberto", en: "Module Reopened", fr: "Module rouvert", es: "Módulo reabierto", it: "Modulo riaperto", zh: "模块重新开放" },
  };

  const configs: Record<
    StatusProgressoModulo,
    { className: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    nao_iniciado: { className: "bg-slate-100 text-slate-600 border-slate-200", icon: Clock },
    em_andamento: { className: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
    aguardando_validacao: { className: "bg-amber-50 text-amber-800 border-amber-300 font-semibold", icon: ShieldAlert },
    concluido: { className: "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold", icon: CheckCircle2 },
    reaberto: { className: "bg-purple-50 text-purple-700 border-purple-200", icon: RotateCcw },
  };

  const cfg = configs[status] || configs.nao_iniciado;
  const Icon = cfg.icon;
  const label = labels[status]?.[locale] || labels[status]?.pt || status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${cfg.className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export function StatusModuloBadge({ status }: { status: StatusModulo }) {
  const { locale } = useLanguage();

  const labels: Record<StatusModulo, Record<Locale, string>> = {
    rascunho: { pt: "Rascunho", en: "Draft", fr: "Brouillon", es: "Borrador", it: "Bozza", zh: "草稿" },
    ativo: { pt: "Ativo", en: "Active", fr: "Actif", es: "Activo", it: "Attivo", zh: "活跃" },
    arquivado: { pt: "Arquivado", en: "Archived", fr: "Archivé", es: "Archivado", it: "Archiviato", zh: "已归档" },
  };

  const configs: Record<StatusModulo, string> = {
    rascunho: "bg-slate-100 text-slate-600 border-slate-200",
    ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
    arquivado: "bg-gray-100 text-gray-500 border-gray-200",
  };

  const className = configs[status] || configs.rascunho;
  const label = labels[status]?.[locale] || labels[status]?.pt || status;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}
