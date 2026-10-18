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
      return <Video {...iconProps} className="w-4 h-4 text-indigo-600" />;
    case "FileCheck":
      return <FileCheck {...iconProps} className="w-4 h-4 text-amber-600" />;
    case "Calendar":
      return <Calendar {...iconProps} className="w-4 h-4 text-amber-600" />;
    case "Layers":
      return <Layers {...iconProps} className="w-4 h-4 text-[#5B4DFC]" />;
    case "Compass":
      return <Compass {...iconProps} className="w-4 h-4 text-emerald-600" />;
    case "CheckCheck":
      return <CheckCheck {...iconProps} className="w-4 h-4 text-blue-600" />;
    case "Award":
      return <Award {...iconProps} className="w-4 h-4 text-amber-600" />;
    default:
      return <Clock {...iconProps} className="w-4 h-4 text-slate-500" />;
  }
}

function getUrgenciaBadgeClasses(urgencia: AcaoPlanoDiario["urgencia"]) {
  switch (urgencia) {
    case "critica":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "alta":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "media":
      return "bg-indigo-50 text-[#5B4DFC] border-indigo-200";
    case "baixa":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function getIconBgClasses(urgencia: AcaoPlanoDiario["urgencia"]) {
  switch (urgencia) {
    case "critica":
      return "bg-rose-100 border-rose-200";
    case "alta":
      return "bg-amber-100 border-amber-200";
    case "media":
      return "bg-indigo-100 border-indigo-200";
    case "baixa":
      return "bg-emerald-100 border-emerald-200";
    default:
      return "bg-slate-100 border-slate-200";
  }
}

export function MeuPlanoHojeCard({ acoes }: MeuPlanoHojeCardProps) {
  return (
    <div className="flex flex-col justify-between h-full bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all">
      <div>
        {/* Header do Card */}
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Meu plano de hoje
            </h2>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#F0EEFF] text-[#5B4DFC]">
              {acoes.length} {acoes.length === 1 ? "ação" : "ações"}
            </span>
          </div>

          <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
            Prioridade pedagógica
          </span>
        </div>

        {/* Lista de Ações (máximo 3) */}
        {acoes.length === 0 ? (
          <div className="py-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 my-2 px-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-800">
              Tudo em dia para hoje!
            </div>
            <div className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
              Você não tem atividades atrasadas nem prazos imediatos. Aproveite para revisar conteúdos na biblioteca.
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 my-1">
            {acoes.map((acao) => {
              const iconBg = getIconBgClasses(acao.urgencia);
              const badgeStyle = getUrgenciaBadgeClasses(acao.urgencia);

              return (
                <div
                  key={`${acao.tipo}-${acao.id}`}
                  className="group flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${iconBg}`}
                    >
                      {renderAcaoIcon(acao.icone)}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate group-hover:text-[#5B4DFC] transition-colors">
                        {acao.titulo}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate mt-0.5">
                        <span className="truncate">{acao.contexto}</span>
                        <span>•</span>
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border ${badgeStyle} shrink-0`}
                        >
                          {acao.prazoOuTempo}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={acao.href}
                    className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-[#5B4DFC] text-white transition-all shadow-2xs"
                  >
                    <span>{acao.botaoTexto}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rodapé: Link "Ver todas as atividades" */}
      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500 text-[11px]">
          Foco diário guiado pelo Método Paulo
        </span>
        <Link
          href="/aluno/atividades"
          className="inline-flex items-center gap-1 font-bold text-[#5B4DFC] hover:text-[#4a3ecc] transition-colors"
        >
          <span>Ver todas as atividades</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
