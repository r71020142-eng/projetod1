"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Award, CheckCircle2, ArrowRight, X } from "lucide-react";

export interface ContextNotificationData {
  tipo: "parecer" | "conquista";
  titulo: string;
  linkDestino: string;
  ctaTexto: string;
}

interface DashboardContextNotificationProps {
  notificacao?: ContextNotificationData | null;
}

export function DashboardContextNotification({
  notificacao,
}: DashboardContextNotificationProps) {
  const [visivel, setVisivel] = useState(true);

  if (!notificacao || !visivel) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-[#DDDDE5] shadow-2xs text-xs text-[#07132E] animate-in fade-in duration-200 w-full min-w-0"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="w-5 h-5 rounded-md bg-[#FAF8F3] border border-[#DDDDE5] flex items-center justify-center shrink-0">
          {notificacao.tipo === "parecer" ? (
            <CheckCircle2 className="w-3 h-3 text-[#16A879]" aria-hidden="true" />
          ) : (
            <Award className="w-3 h-3 text-[#D79A24]" aria-hidden="true" />
          )}
        </div>
        <span className="font-medium truncate font-sans text-xs min-w-0">
          {notificacao.titulo}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={notificacao.linkDestino}
          className="inline-flex items-center gap-1 font-bold text-[#5B2FE8] hover:text-[#7047F5] transition-colors text-xs shrink-0"
        >
          <span>{notificacao.ctaTexto}</span>
          <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => setVisivel(false)}
          className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors shrink-0"
          aria-label="Dispensar aviso"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
