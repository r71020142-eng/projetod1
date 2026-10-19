"use client";

import React from "react";
import Link from "next/link";
import {
  Layers,
  Compass,
  FileCheck,
  Video,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { AcaoPlanoDiario } from "@/data/planoDiarioMotor";

interface TodayPlanCardProps {
  acoes: AcaoPlanoDiario[];
}

function renderAcaoIcon(tipo: string, icone: string) {
  if (tipo === "flashcards" || icone === "Layers") {
    return (
      <div className="w-7 h-7 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
        <Layers className="w-3.5 h-3.5" aria-hidden="true" />
      </div>
    );
  }
  if (tipo === "pratica_diaria" || icone === "Compass") {
    return (
      <div className="w-7 h-7 rounded-lg bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
        <Compass className="w-3.5 h-3.5" aria-hidden="true" />
      </div>
    );
  }
  if (icone === "Video" || tipo === "self_presentation") {
    return (
      <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
        <Video className="w-3.5 h-3.5" aria-hidden="true" />
      </div>
    );
  }
  if (icone === "AlertCircle" || icone === "AlertTriangle") {
    return (
      <div className="w-7 h-7 rounded-lg bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center shrink-0">
        <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-lg bg-[#FFFBEB] text-[#D97706] flex items-center justify-center shrink-0">
      <FileCheck className="w-3.5 h-3.5" aria-hidden="true" />
    </div>
  );
}

export function TodayPlanCard({ acoes }: TodayPlanCardProps) {
  // Filtra itens concluídos e restringe a no máximo 3 pendências
  const acoesPendentes = acoes
    .filter((a) => a.tipo !== "feedback" && a.tipo !== "conquista")
    .slice(0, 3);

  return (
    <div className="rounded-[14px] border border-[#DDDDE5] bg-white p-5 shadow-xs flex flex-col justify-between h-full min-h-[300px] lg:max-h-[340px]">
      <div>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-base sm:text-lg font-bold text-[#07132E]">
              Para hoje
            </h2>
            {acoesPendentes.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#EDE9FE] text-[#5B2FE8]">
                {acoesPendentes.length} {acoesPendentes.length === 1 ? "ação" : "ações"}
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#60708F] font-sans">
            Ações prioritárias
          </span>
        </div>

        {/* Lista de Ações */}
        {acoesPendentes.length === 0 ? (
          <div className="py-8 px-4 text-center bg-[#FAF8F3] rounded-xl border border-dashed border-[#DDDDE5] my-2">
            <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-[#ECFDF5] text-[#16A879] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="text-xs font-bold text-[#07132E] font-sans">
              Tudo concluído por hoje!
            </div>
            <div className="text-[11px] text-[#60708F] mt-1 font-sans">
              Você está em dia com seu plano de estudos.
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 my-1">
            {acoesPendentes.map((acao) => (
              <Link
                key={`${acao.tipo}-${acao.id}`}
                href={acao.href}
                className="flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-[#FAF8F3] transition-colors border border-transparent hover:border-[#DDDDE5] group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {renderAcaoIcon(acao.tipo, acao.icone)}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#07132E] group-hover:text-[#5B2FE8] transition-colors truncate font-sans">
                      {acao.titulo}
                    </div>
                    <div className="text-[11px] text-[#60708F] truncate font-sans">
                      {acao.prazoOuTempo || acao.contexto}
                    </div>
                  </div>
                </div>

                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-slate-400 group-hover:text-[#5B2FE8] transition-colors">
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div className="pt-2.5 border-t border-[#DDDDE5]/80 flex items-center justify-between text-xs font-sans">
        <span className="text-[#60708F] text-[11px]">
          Plano de estudo
        </span>
        <Link
          href="/aluno/atividades"
          className="inline-flex items-center gap-1 font-bold text-[#5B2FE8] hover:text-[#7047F5] transition-colors"
        >
          <span>Ver atividades</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
