"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Calendar, Plus, Clock } from "lucide-react";

interface AdminDashboardHeaderProps {
  userName: string;
  totalPendencias: number;
  mesReferencia?: string;
}

export function AdminDashboardHeader({
  userName,
  totalPendencias,
  mesReferencia,
}: AdminDashboardHeaderProps) {
  const { saudacao, dataFormatada, textoSituacao } = useMemo(() => {
    const agora = new Date();
    const hora = agora.getHours();

    let s = "Bom dia";
    if (hora >= 12 && hora < 18) {
      s = "Boa tarde";
    } else if (hora >= 18 || hora < 5) {
      s = "Boa noite";
    }

    const dataFmt = agora.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const dataCapitalizada = dataFmt.charAt(0).toUpperCase() + dataFmt.slice(1);

    let situacao = "";
    if (totalPendencias > 1) {
      situacao = `${totalPendencias} pendências operacionais requerem atenção da coordenação hoje.`;
    } else if (totalPendencias === 1) {
      situacao = "1 pendência operacional requer atenção da coordenação hoje.";
    } else {
      situacao = "Tudo em dia! Nenhuma ação urgente pendente na escola.";
    }

    return { saudacao: s, dataFormatada: dataCapitalizada, textoSituacao: situacao };
  }, [totalPendencias]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/70">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{dataFormatada}</span>
        </div>
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
          {saudacao}, <span className="text-[#5B4DFC]">{userName}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
          {textoSituacao}
        </p>
      </div>

      {/* Ações Rápidas da Coordenação e Mês de Referência */}
      <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200/90 bg-white text-xs font-bold text-slate-700 shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-[#5B4DFC]" />
          <span>{mesReferencia || "Outubro de 2026"}</span>
        </div>

        <Link
          href="/admin/turmas"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5B4DFC] hover:bg-[#4a3ecc] text-white text-xs font-bold transition-all shadow-xs shadow-[#5B4DFC]/20 hover:shadow-md"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Turma</span>
        </Link>
      </div>
    </div>
  );
}
