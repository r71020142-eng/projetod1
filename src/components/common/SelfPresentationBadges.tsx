"use client";

import React from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  Award,
} from "lucide-react";
import { StatusSelfPresentation, TipoSelfPresentation } from "@/types";

interface StatusSelfPresentationBadgeProps {
  status: StatusSelfPresentation;
  className?: string;
}

export function StatusSelfPresentationBadge({
  status,
  className = "",
}: StatusSelfPresentationBadgeProps) {
  switch (status) {
    case "rascunho":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 ${className}`}
        >
          <FileText className="h-3.5 w-3.5 text-slate-500" />
          <span>Rascunho</span>
        </span>
      );
    case "enviada":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 ${className}`}
        >
          <Clock className="h-3.5 w-3.5 text-amber-600" />
          <span>Aguardando Avaliação</span>
        </span>
      );
    case "em_avaliacao":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 ${className}`}
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
          <span>Em Avaliação</span>
        </span>
      );
    case "reenvio_solicitado":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 ${className}`}
        >
          <RotateCcw className="h-3.5 w-3.5 text-purple-600" />
          <span>Reenvio Solicitado</span>
        </span>
      );
    case "avaliada":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 ${className}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>Avaliação Concluída</span>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 ${className}`}
        >
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Status Indefinido</span>
        </span>
      );
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
  if (tipo === "nivelamento_inicial") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 ${className}`}
      >
        <Award className="h-3 w-3 text-indigo-600" />
        <span>Nivelamento Inicial</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200/60 ${className}`}
    >
      <RotateCcw className="h-3 w-3 text-cyan-600" />
      <span>Reavaliação</span>
    </span>
  );
}

interface ScorePillProps {
  score: number; // 1 to 5
}

export function ScorePill({ score }: ScorePillProps) {
  const colors: Record<number, string> = {
    1: "bg-red-50 text-red-700 border-red-200",
    2: "bg-amber-50 text-amber-700 border-amber-200",
    3: "bg-yellow-50 text-yellow-800 border-yellow-200",
    4: "bg-blue-50 text-blue-700 border-blue-200",
    5: "bg-emerald-50 text-emerald-800 border-emerald-200",
  };

  const colorClass = colors[score] || "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-black border ${colorClass}`}
    >
      {score}/5
    </span>
  );
}
