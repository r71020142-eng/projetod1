import React from "react";
import { StatusCadastro } from "@/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: StatusCadastro;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const isAtivo = status === "ativo";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border",
        isAtivo
          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
          : "bg-slate-100 text-slate-600 border-slate-200",
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isAtivo ? "bg-emerald-500" : "bg-slate-400"
        )}
      />
      <span>{isAtivo ? "Ativo" : "Inativo"}</span>
    </span>
  );
}
