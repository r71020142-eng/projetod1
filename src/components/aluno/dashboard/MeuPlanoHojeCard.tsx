"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  Video,
  FileCheck,
  Calendar,
  Layers,
  Compass,
  CheckCheck,
  Award,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { AcaoPlanoDiario } from "@/data/planoDiarioMotor";

interface MeuPlanoHojeCardProps {
  acoes: AcaoPlanoDiario[];
}

function renderAcaoIcon(icone: string) {
  const iconProps = { className: "w-4 h-4 shrink-0" };

  switch (icone) {
    case "AlertTriangle":
      return <AlertTriangle {...iconProps} className="w-4 h-4 text-rose-600" />;
    case "AlertCircle":
      return <AlertCircle {...iconProps} className="w-4 h-4 text-rose-600" />;
    case "Video":
      return <Video {...iconProps} className="w-4 h-4 text-[#5B2FE8]" />;
    case "FileCheck":
      return <FileCheck {...iconProps} className="w-4 h-4 text-[#D79A24]" />;
    case "Calendar":
      return <Calendar {...iconProps} className="w-4 h-4 text-[#D79A24]" />;
    case "Layers":
      return <Layers {...iconProps} className="w-4 h-4 text-[#5B2FE8]" />;
    case "Compass":
      return <Compass {...iconProps} className="w-4 h-4 text-emerald-600" />;
    case "CheckCheck":
      return <CheckCheck {...iconProps} className="w-4 h-4 text-blue-600" />;
    case "Award":
      return <Award {...iconProps} className="w-4 h-4 text-[#D79A24]" />;
    default:
      return <Clock {...iconProps} className="w-4 h-4 text-[#60708F]" />;
  }
}

export function MeuPlanoHojeCard({ acoes }: MeuPlanoHojeCardProps) {
  return (
    <div className="rounded-[14px] border border-[#DDDDE5] bg-white p-6 shadow-xs flex flex-col justify-between h-full relative group">
      {/* Linha Lateral Dourada no Topo */}
      <div className="absolute top-6 left-0 w-1.5 h-8 bg-[#D79A24] rounded-r" />

      <div>
        {/* Cabeçalho Editorial */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-[#07132E]">
              Meu plano de hoje
            </h2>
            <span className="inline-flex items-center justify-center ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF8F3] text-[#D79A24] border border-[#D79A24]/30 whitespace-nowrap">
              {acoes.length} {acoes.length === 1 ? "ação" : "ações"}
            </span>
          </div>

          <span className="text-[11px] font-semibold text-[#60708F] hidden sm:inline">
            Prioridade pedagógica
          </span>
        </div>

        {/* Lista de Ações Conectadas por Linha Vertical Dourada */}
        {acoes.length === 0 ? (
          <div className="py-8 text-center bg-[#FAF8F3] rounded-[10px] border border-dashed border-[#DDDDE5] my-2 px-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-[8px] bg-emerald-100 text-[#16A879] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-[#07132E]">
              Tudo em dia para hoje!
            </div>
            <div className="text-[11px] text-[#60708F] mt-1 max-w-xs mx-auto">
              Você não tem atividades atrasadas nem prazos imediatos. Aproveite para revisar conteúdos na biblioteca.
            </div>
          </div>
        ) : (
          <div className="relative space-y-3.5 my-2">
            {/* Linha Vertical Dourada conectando as etapas */}
            <div
              className="absolute top-4 bottom-4 left-3.5 w-0.5 bg-[#EDB84E]/40 z-0 pointer-events-none"
              aria-hidden="true"
            />

            {acoes.slice(0, 3).map((acao, index) => {
              const stepNumber = String(index + 1).padStart(2, "0");

              return (
                <div
                  key={`${acao.tipo}-${acao.id}`}
                  className="relative z-10 flex items-center justify-between gap-3 p-2.5 rounded-[10px] hover:bg-[#FAF8F3] transition-colors group/item"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Numeração 01, 02, 03 */}
                    <span className="w-7 h-7 rounded-[8px] bg-[#FAF8F3] border border-[#D79A24] text-[#D79A24] font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs font-sans">
                      {stepNumber}
                    </span>

                    {/* Ícone Quadrado Discreto */}
                    <div className="w-8 h-8 rounded-[8px] bg-slate-100 border border-slate-200/70 flex items-center justify-center shrink-0 text-slate-700 group-hover/item:border-[#5B2FE8]/30 group-hover/item:bg-[#5B2FE8]/10 transition-colors">
                      {renderAcaoIcon(acao.icone)}
                    </div>

                    {/* Texto principal, categoria, duração ou quantidade */}
                    <div className="min-w-0">
                      <Link
                        href={acao.href}
                        className="text-xs sm:text-sm font-semibold text-[#07132E] group-hover/item:text-[#5B2FE8] transition-colors truncate block"
                      >
                        {acao.titulo}
                      </Link>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#60708F] truncate mt-0.5">
                        <span className="truncate">{acao.contexto}</span>
                        <span>•</span>
                        <span className="text-[#07132E] font-medium shrink-0">
                          {acao.prazoOuTempo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botão de seta individual */}
                  <Link
                    href={acao.href}
                    aria-label={`${acao.botaoTexto}: ${acao.titulo}`}
                    className="w-8 h-8 rounded-[8px] border border-[#DDDDE5] hover:border-[#5B2FE8] hover:bg-[#5B2FE8] hover:text-white text-[#07132E] flex items-center justify-center shrink-0 transition-all shadow-2xs"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rodapé: Link "Ver todas as atividades" */}
      <div className="pt-3 mt-3 border-t border-[#DDDDE5]/80 flex items-center justify-between text-xs">
        <span className="text-[#60708F] text-[11px]">
          Foco diário guiado pelo Método Paulo
        </span>
        <Link
          href="/aluno/atividades"
          className="inline-flex items-center gap-1 font-bold text-[#5B2FE8] hover:text-[#7047F5] transition-colors"
        >
          <span>Ver todas as atividades</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
