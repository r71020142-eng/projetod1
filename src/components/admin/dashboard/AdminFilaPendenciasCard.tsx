"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Video,
  AlertCircle,
  CheckCircle,
  FileCheck,
  FileText,
  Award,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { ItemPendenciaAdmin } from "@/data/adminPendenciasMotor";

interface AdminFilaPendenciasCardProps {
  pendencias: ItemPendenciaAdmin[];
}

function renderPendenciaIcon(icone: string) {
  const iconProps = { className: "w-4 h-4 shrink-0" };

  switch (icone) {
    case "ShieldAlert":
      return <ShieldAlert {...iconProps} className="w-4 h-4 text-rose-600" />;
    case "Video":
      return <Video {...iconProps} className="w-4 h-4 text-indigo-600" />;
    case "AlertCircle":
      return <AlertCircle {...iconProps} className="w-4 h-4 text-amber-600" />;
    case "CheckCircle":
      return <CheckCircle {...iconProps} className="w-4 h-4 text-emerald-600" />;
    case "FileCheck":
      return <FileCheck {...iconProps} className="w-4 h-4 text-[#5B4DFC]" />;
    case "FileText":
      return <FileText {...iconProps} className="w-4 h-4 text-blue-600" />;
    case "Award":
      return <Award {...iconProps} className="w-4 h-4 text-amber-600" />;
    default:
      return <Clock {...iconProps} className="w-4 h-4 text-slate-500" />;
  }
}

function getUrgenciaBadge(urgencia: ItemPendenciaAdmin["urgencia"]) {
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

function getIconBg(urgencia: ItemPendenciaAdmin["urgencia"]) {
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

export function AdminFilaPendenciasCard({ pendencias }: AdminFilaPendenciasCardProps) {
  return (
    <div className="flex flex-col justify-between h-full bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all">
      <div>
        {/* Header do Card */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Fila de Ação da Coordenação
            </h2>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#F0EEFF] text-[#5B4DFC]">
              {pendencias.length} {pendencias.length === 1 ? "ação urgente" : "ações urgentes"}
            </span>
          </div>

          <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
            Prioridade operacional
          </span>
        </div>

        {/* Lista de Pendências */}
        {pendencias.length === 0 ? (
          <div className="py-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 my-2 px-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-800">
              Tudo em dia na coordenação!
            </div>
            <div className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
              Nenhuma denúncia pendente, avaliações orais em dia e todas as aulas síncronas configuradas.
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 my-1">
            {pendencias.map((item) => {
              const iconBgClass = getIconBg(item.urgencia);
              const badgeClass = getUrgenciaBadge(item.urgencia);

              return (
                <div
                  key={`${item.tipo}-${item.id}`}
                  className="group flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${iconBgClass}`}
                    >
                      {renderPendenciaIcon(item.icone)}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate group-hover:text-[#5B4DFC] transition-colors">
                        {item.titulo}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate mt-0.5">
                        <span className="truncate">{item.responsavelSugerido}</span>
                        <span>•</span>
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border ${badgeClass} shrink-0`}
                        >
                          {item.prazoOuTempo}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={item.href}
                    className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-[#5B4DFC] text-white transition-all shadow-2xs"
                  >
                    <span>{item.botaoTexto}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500 text-[11px]">
          Fila integrada com regras do Método Paulo
        </span>
        <Link
          href="/admin/avaliacoes"
          className="inline-flex items-center gap-1 font-bold text-[#5B4DFC] hover:text-[#4a3ecc] transition-colors"
        >
          <span>Ver central pedagógica</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
