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

export function TipoAvaliacaoBadge({ tipo }: { tipo: TipoAvaliacao }) {
  if (tipo === "objetiva") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
        Objetiva (Múltipla Escolha)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
      <FileEdit className="w-3.5 h-3.5 text-purple-600" />
      Prática (Correção Humana)
    </span>
  );
}

export function StatusAvaliacaoBadge({ status }: { status: StatusAvaliacao }) {
  const configs: Record<StatusAvaliacao, { label: string; className: string }> = {
    rascunho: {
      label: "Rascunho",
      className: "bg-slate-100 text-slate-700 border-slate-200",
    },
    agendada: {
      label: "Agendada",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    publicada: {
      label: "Publicada",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    encerrada: {
      label: "Encerrada",
      className: "bg-rose-50 text-rose-700 border-rose-200",
    },
    arquivada: {
      label: "Arquivada",
      className: "bg-gray-100 text-gray-500 border-gray-200",
    },
  };

  const cfg = configs[status] || configs.rascunho;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

export function StatusTentativaBadge({ status }: { status: StatusTentativa }) {
  const configs: Record<
    StatusTentativa,
    { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    em_andamento: {
      label: "Em andamento (Rascunho)",
      className: "bg-slate-100 text-slate-700 border-slate-200",
      icon: Clock,
    },
    enviada: {
      label: "Enviada",
      className: "bg-blue-50 text-blue-700 border-blue-200",
      icon: CheckCircle2,
    },
    aguardando_correcao: {
      label: "Aguardando Correção",
      className: "bg-amber-50 text-amber-800 border-amber-200 font-semibold",
      icon: AlertCircle,
    },
    corrigida: {
      label: "Corrigida",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: CheckCircle2,
    },
    reaberta: {
      label: "Tentativa Reaberta",
      className: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: RotateCcw,
    },
  };

  const cfg = configs[status] || configs.em_andamento;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${cfg.className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

export function ResultadoBadge({ resultado }: { resultado?: ResultadoAvaliacao }) {
  if (!resultado) return null;

  const configs: Record<
    ResultadoAvaliacao,
    { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    aprovado: {
      label: "Aprovado",
      className: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: CheckCircle2,
    },
    reprovado: {
      label: "Reprovado",
      className: "bg-rose-100 text-rose-800 border-rose-200",
      icon: XCircle,
    },
    precisa_reforco: {
      label: "Precisa de Reforço",
      className: "bg-amber-100 text-amber-800 border-amber-200",
      icon: AlertCircle,
    },
    refazer: {
      label: "Refazer Avaliação",
      className: "bg-indigo-100 text-indigo-800 border-indigo-200",
      icon: RotateCcw,
    },
  };

  const cfg = configs[resultado];
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

export function StatusProgressoModuloBadge({
  status,
}: {
  status: StatusProgressoModulo;
}) {
  const configs: Record<
    StatusProgressoModulo,
    { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    nao_iniciado: {
      label: "Não Iniciado",
      className: "bg-slate-100 text-slate-600 border-slate-200",
      icon: Clock,
    },
    em_andamento: {
      label: "Em Andamento",
      className: "bg-blue-50 text-blue-700 border-blue-200",
      icon: Clock,
    },
    aguardando_validacao: {
      label: "Aguardando Validação do Professor",
      className: "bg-amber-50 text-amber-800 border-amber-300 font-semibold",
      icon: ShieldAlert,
    },
    concluido: {
      label: "Módulo Concluído",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold",
      icon: CheckCircle2,
    },
    reaberto: {
      label: "Módulo Reaberto",
      className: "bg-purple-50 text-purple-700 border-purple-200",
      icon: RotateCcw,
    },
  };

  const cfg = configs[status] || configs.nao_iniciado;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${cfg.className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

export function StatusModuloBadge({ status }: { status: StatusModulo }) {
  const configs: Record<StatusModulo, { label: string; className: string }> = {
    rascunho: { label: "Rascunho", className: "bg-slate-100 text-slate-600 border-slate-200" },
    ativo: { label: "Ativo", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    arquivado: { label: "Arquivado", className: "bg-gray-100 text-gray-500 border-gray-200" },
  };
  const cfg = configs[status] || configs.rascunho;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
