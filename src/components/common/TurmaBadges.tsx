import React from "react";
import { ModalidadeTurma, StatusTurma, StatusAula, StatusPresenca } from "@/types";
import { cn } from "@/lib/utils";
import { Users, User, Check, X, AlertTriangle, HelpCircle } from "lucide-react";

export function TurmaStatusBadge({ status, className }: { status: StatusTurma; className?: string }) {
  const configs: Record<StatusTurma, { label: string; bg: string; text: string; dot: string; border: string }> = {
    formacao: {
      label: "Em formação",
      bg: "bg-amber-50",
      text: "text-amber-800",
      dot: "bg-amber-500",
      border: "border-amber-200/80",
    },
    ativa: {
      label: "Ativa",
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      dot: "bg-emerald-500",
      border: "border-emerald-200/80",
    },
    pausada: {
      label: "Pausada",
      bg: "bg-slate-100",
      text: "text-slate-700",
      dot: "bg-slate-400",
      border: "border-slate-200",
    },
    encerrada: {
      label: "Encerrada",
      bg: "bg-rose-50",
      text: "text-rose-800",
      dot: "bg-rose-500",
      border: "border-rose-200/80",
    },
  };

  const c = configs[status] || configs.ativa;

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
      <span>{c.label}</span>
    </span>
  );
}

export function ModalidadeBadge({ modalidade, className }: { modalidade: ModalidadeTurma; className?: string }) {
  const isIndividual = modalidade === "individual";

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
      <span>{isIndividual ? "Individual" : "Em Grupo"}</span>
    </span>
  );
}

export function AulaStatusBadge({ status, className }: { status: StatusAula; className?: string }) {
  const configs: Record<StatusAula, { label: string; bg: string; text: string; border: string }> = {
    agendada: {
      label: "Agendada",
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
    },
    concluida: {
      label: "Concluída",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
    },
    cancelada: {
      label: "Cancelada",
      bg: "bg-slate-100",
      text: "text-slate-500",
      border: "border-slate-200",
    },
  };

  const c = configs[status] || configs.agendada;

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
      {c.label}
    </span>
  );
}

export function PresencaBadge({ status, className }: { status: StatusPresenca; className?: string }) {
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
          <span>Presente</span>
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
          <span>Ausente</span>
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
          <span>Justificado</span>
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
          <span>Não registrado</span>
        </span>
      );
  }
}
