"use client";

import React from "react";
import Link from "next/link";
import {
  Video,
  FileCheck,
  Layers,
  Compass,
  Check,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { AcaoPlanoDiario } from "@/data/planoDiarioMotor";

interface MeuPlanoHojeCardProps {
  acoes: AcaoPlanoDiario[];
}

function renderAcaoIcon(icone: string) {
  switch (icone) {
    case "Layers":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center shrink-0">
          <Layers className="w-4 h-4" />
        </div>
      );
    case "Compass":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
          <Compass className="w-4 h-4" />
        </div>
      );
    case "CheckCheck":
    case "Check":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
          <Check className="w-4 h-4" />
        </div>
      );
    case "Video":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#EDE9FE] text-[#5B2FE8] flex items-center justify-center shrink-0">
          <Video className="w-4 h-4" />
        </div>
      );
    case "FileCheck":
      return (
        <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] text-[#D97706] flex items-center justify-center shrink-0">
          <FileCheck className="w-4 h-4" />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4" />
        </div>
      );
  }
}

export function MeuPlanoHojeCard({ acoes }: MeuPlanoHojeCardProps) {
  return (
    <div className="rounded-[14px] border border-[#DDDDE5] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full relative group">
      <div>
        {/* Cabeçalho Editorial com Barra Dourada */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-5 bg-[#EDB84E] rounded-full shrink-0" aria-hidden="true" />
            <h2 className="font-serif text-base sm:text-lg font-bold tracking-wide text-[#07132E] uppercase">
              MEU PLANO DE HOJE
            </h2>
            <span className="inline-flex items-center justify-center ml-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EDE9FE] text-[#5B2FE8] whitespace-nowrap">
              {acoes.length} {acoes.length === 1 ? "ação" : "ações"}
            </span>
          </div>

          <span className="text-[11px] font-medium text-[#60708F] hidden sm:inline">
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
                  className="relative z-10 flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-[#FAF8F3] transition-colors group/item"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Numeração 01, 02, 03 */}
                    <span className="w-7 h-7 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs font-sans">
                      {stepNumber}
                    </span>

                    {/* Ícone Quadrado Colorido */}
                    {renderAcaoIcon(acao.icone)}

                    {/* Texto principal e sublinha com badge */}
                    <div className="min-w-0">
                      <Link
                        href={acao.href}
                        className="text-xs sm:text-[13px] font-bold text-[#07132E] group-hover/item:text-[#5B2FE8] transition-colors truncate block"
                      >
                        {acao.titulo}
                      </Link>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#60708F] truncate mt-0.5">
                        <span className="truncate">{acao.contexto}</span>
                        {acao.tipo === "flashcards" ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#EDE9FE] text-[#6D28D9] shrink-0">
                            4 cartões para hoje
                          </span>
                        ) : acao.tipo === "pratica_diaria" ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#ECFDF5] text-[#047857] shrink-0">
                            5 min de foco
                          </span>
                        ) : acao.tipo === "feedback" ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#ECFDF5] text-[#047857] shrink-0">
                            Disponível para leitura
                          </span>
                        ) : (
                          <span className="text-[#07132E] font-medium shrink-0">
                            • {acao.prazoOuTempo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botão de seta individual ChevronRight */}
                  <Link
                    href={acao.href}
                    aria-label={`${acao.botaoTexto}: ${acao.titulo}`}
                    className="w-8 h-8 rounded-xl border border-slate-200/80 bg-white hover:border-slate-400 flex items-center justify-center shrink-0 transition-all shadow-2xs"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover/item:text-slate-700" />
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
