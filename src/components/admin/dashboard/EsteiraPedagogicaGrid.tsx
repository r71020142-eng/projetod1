"use client";

import React from "react";
import Link from "next/link";
import {
  Compass,
  Video,
  BarChart2,
  Layers,
  Award,
  ArrowRight,
} from "lucide-react";
import {
  SelfPresentationsMetricasAdmin,
  MetricasAvaliacoesAdmin,
  FlashcardsMetricasAdmin,
} from "@/types";

interface EsteiraPedagogicaGridProps {
  selfPresentationsMetricas?: SelfPresentationsMetricasAdmin;
  metricasAvaliacoes?: MetricasAvaliacoesAdmin;
  flashcardsMetricas?: FlashcardsMetricasAdmin;
  denunciasPendentesCount?: number;
  placasPendentesCount?: number;
}

export function EsteiraPedagogicaGrid({
  selfPresentationsMetricas,
  metricasAvaliacoes,
  flashcardsMetricas,
  denunciasPendentesCount = 0,
  placasPendentesCount = 0,
}: EsteiraPedagogicaGridProps) {
  const eixos = [
    {
      id: "self-presentation",
      titulo: "Self Presentation",
      subtitulo: "Nivelamento & Avaliação Oral",
      icone: Video,
      corIcone: "text-[#5B4DFC] bg-[#F0EEFF] border-[#5B4DFC]/20",
      href: "/admin/self-presentation",
      kpis: [
        {
          label: "Em avaliação",
          valor: selfPresentationsMetricas?.emAvaliacao ?? 0,
          alerta: (selfPresentationsMetricas?.emAvaliacao ?? 0) > 0,
        },
        {
          label: "Avaliadas",
          valor: selfPresentationsMetricas?.avaliadas ?? 0,
          alerta: false,
        },
        {
          label: "Reenvios",
          valor: selfPresentationsMetricas?.reenviosPendentes ?? 0,
          alerta: false,
        },
      ],
    },
    {
      id: "avaliacoes",
      titulo: "Avaliações & Módulos",
      subtitulo: "Checkpoints do Método Paulo",
      icone: BarChart2,
      corIcone: "text-blue-600 bg-blue-50 border-blue-200",
      href: "/admin/avaliacoes",
      kpis: [
        {
          label: "Em correção",
          valor: metricasAvaliacoes?.tentativasAguardandoCorrecao ?? 0,
          alerta: (metricasAvaliacoes?.tentativasAguardandoCorrecao ?? 0) > 0,
        },
        {
          label: "Aguardando validação",
          valor: metricasAvaliacoes?.alunosAguardandoValidacao ?? 0,
          alerta: (metricasAvaliacoes?.alunosAguardandoValidacao ?? 0) > 0,
        },
        {
          label: "Média objetivas",
          valor:
            metricasAvaliacoes?.mediaAvaliacoesObjetivas !== null &&
            metricasAvaliacoes?.mediaAvaliacoesObjetivas !== undefined
              ? `${metricasAvaliacoes.mediaAvaliacoesObjetivas}`
              : "—",
          alerta: false,
        },
      ],
    },
    {
      id: "flashcards",
      titulo: "Flashcards SRS",
      subtitulo: "Repetição Espaçada Ativa",
      icone: Layers,
      corIcone: "text-indigo-600 bg-indigo-50 border-indigo-200",
      href: "/admin/flashcards",
      kpis: [
        {
          label: "Cartões no acervo",
          valor: flashcardsMetricas?.totalCartoesAtivos ?? 0,
          alerta: false,
        },
        {
          label: "Revisões realizadas",
          valor: flashcardsMetricas?.revisoesRealizadas ?? 0,
          alerta: false,
        },
        {
          label: "Alunos praticando",
          valor: flashcardsMetricas?.alunosAtivosRevisando ?? 0,
          alerta: false,
        },
      ],
    },
    {
      id: "comunidade-placas",
      titulo: "Comunidade & Placas",
      subtitulo: "Moderação e Reconhecimento",
      icone: Award,
      corIcone: "text-amber-600 bg-amber-50 border-amber-200",
      href: "/admin/conquistas",
      kpis: [
        {
          label: "Denúncias pendentes",
          valor: denunciasPendentesCount,
          alerta: denunciasPendentesCount > 0,
        },
        {
          label: "Placas na esteira",
          valor: placasPendentesCount,
          alerta: placasPendentesCount > 0,
        },
        {
          label: "Status geral",
          valor: "Ativo",
          alerta: false,
        },
      ],
    },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0EEFF] text-[#5B4DFC]">
            <Compass className="w-3.5 h-3.5 text-[#5B4DFC]" />
            Esteira Pedagógica Integrada
          </span>
          <span className="text-xs font-bold text-slate-900 hidden sm:inline">
            Governança Acadêmica do Método Paulo
          </span>
        </div>

        <span className="text-xs text-slate-500 font-semibold">
          Fluxos síncronos e assíncronos
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {eixos.map((eixo) => {
          const Icon = eixo.icone;

          return (
            <Link
              key={eixo.id}
              href={eixo.href}
              className="group flex flex-col justify-between p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${eixo.corIcone}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-slate-400 group-hover:text-[#5B4DFC] transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-900 group-hover:text-[#5B4DFC] transition-colors">
                  {eixo.titulo}
                </div>
                <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  {eixo.subtitulo}
                </div>

                {/* Mini KPIs */}
                <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100">
                  {eixo.kpis.map((k, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-500 text-[11px]">{k.label}</span>
                      <span
                        className={`font-bold ${
                          k.alerta ? "text-amber-600 font-extrabold" : "text-slate-900"
                        }`}
                      >
                        {k.valor}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
