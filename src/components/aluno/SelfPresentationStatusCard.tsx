"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Video,
  ArrowRight,
  Clock,
  RotateCcw,
  CheckCircle2,
  Award,
} from "lucide-react";
import { SelfPresentation } from "@/types";
import { selfPresentationRepository } from "@/data/selfPresentationRepository";
import { NivelBadge } from "@/components/common/NivelBadge";

interface SelfPresentationStatusCardProps {
  initialSp?: SelfPresentation | null;
  alunoId?: string;
}

export function SelfPresentationStatusCard({
  initialSp,
  alunoId = "alu-001",
}: SelfPresentationStatusCardProps) {
  const [sp, setSp] = useState<SelfPresentation | null>(initialSp || null);

  useEffect(() => {
    async function loadSp() {
      try {
        const found = await selfPresentationRepository.obterAtivaParaAluno(alunoId);
        setSp(found);
      } catch (err) {
        console.error("Erro ao carregar self presentation no card do aluno:", err);
      }
    }

    loadSp();

    const handleStorageUpdated = (e: Event) => {
      const custom = e as CustomEvent;
      if (
        !custom.detail ||
        custom.detail.entity === "self_presentations" ||
        custom.detail.entity === "alunos"
      ) {
        loadSp();
      }
    };

    window.addEventListener("mtd_storage_updated", handleStorageUpdated);
    return () => {
      window.removeEventListener("mtd_storage_updated", handleStorageUpdated);
    };
  }, [alunoId]);

  // ESTADO 1: Não enviada ou Rascunho não finalizado
  if (!sp || sp.status === "rascunho") {
    return (
      <div className="rounded-3xl border border-purple-200/90 bg-gradient-to-br from-purple-50/90 via-indigo-50/40 to-white p-6 shadow-xs hover:shadow-card-hover transition-all flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
              <Video className="h-3 w-3" />
              Rito Central do Método Paulo
            </span>
            {sp?.status === "rascunho" && (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                Rascunho Salvo
              </span>
            )}
          </div>

          <h3 className="text-base font-extrabold text-slate-900 leading-snug">
            {sp?.status === "rascunho"
              ? "Continue sua Self Presentation"
              : "Envie sua Self Presentation"}
          </h3>

          <p className="text-xs text-slate-600 leading-relaxed font-normal">
            Grave um vídeo espontâneo de 2 a 3 minutos para que nosso corpo docente diagnostique seu nível operacional de fala e personalize suas aulas.
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-purple-100/80 flex items-center justify-between">
          <span className="text-[11px] text-purple-700 font-semibold">
            {sp?.status === "rascunho" ? "Rascunho aguardando envio" : "Primeiro passo de nivelamento"}
          </span>
          <Link
            href="/aluno/self-presentation"
            className="inline-flex items-center gap-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 px-3.5 py-1.5 rounded-xl transition-all shadow-2xs"
          >
            <span>{sp?.status === "rascunho" ? "Continuar" : "Gravar Vídeo"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // ESTADO 2: Enviada (Aguardando avaliação)
  if (sp.status === "enviada") {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-6 shadow-xs hover:shadow-card-hover transition-all flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
              <Clock className="h-3 w-3 text-amber-600" />
              Aguardando Avaliação
            </span>
            <span className="text-[10px] text-amber-700 font-medium">
              Versão {sp.versao}
            </span>
          </div>

          <h3 className="text-base font-extrabold text-slate-900 leading-snug">
            Self Presentation em Fila Pedagógica
          </h3>

          <p className="text-xs text-slate-600 leading-relaxed">
            Seu vídeo foi enviado com sucesso em{" "}
            <strong>
              {sp.dataEnvio
                ? new Date(sp.dataEnvio).toLocaleDateString("pt-BR")
                : "data recente"}
            </strong>
            . Um professor especializado analisará sua produção oral em breve.
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between">
          <span className="text-[11px] text-amber-700 font-medium">
            Em análise pela coordenação
          </span>
          <Link
            href="/aluno/self-presentation"
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3.5 py-1.5 rounded-xl transition-all"
          >
            <span>Ver Detalhes</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // ESTADO 3: Em avaliação
  if (sp.status === "em_avaliacao") {
    return (
      <div className="rounded-3xl border border-indigo-200 bg-indigo-50/60 p-6 shadow-xs hover:shadow-card-hover transition-all flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
              <Clock className="h-3 w-3 text-indigo-600" />
              Em Avaliação Ativa
            </span>
            <span className="text-[10px] text-indigo-700 font-medium">
              Versão {sp.versao}
            </span>
          </div>

          <h3 className="text-base font-extrabold text-slate-900 leading-snug">
            Professor Analisando sua Fala
          </h3>

          <p className="text-xs text-slate-600 leading-relaxed">
            O professor <strong>{sp.professorAvaliadorNome || "MTD"}</strong> está aplicando a rubrica de fluência, gramática e pronúncia. O feedback completo será liberado assim que concluído.
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-indigo-200/60 flex items-center justify-between">
          <span className="text-[11px] text-indigo-700 font-medium">
            Rubricas MTD em preenchimento
          </span>
          <Link
            href="/aluno/self-presentation"
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white px-3.5 py-1.5 rounded-xl border border-indigo-200 transition-all shadow-2xs"
          >
            <span>Acompanhar</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // ESTADO 4: Reenvio Solicitado
  if (sp.status === "reenvio_solicitado") {
    return (
      <div className="rounded-3xl border border-purple-300 bg-purple-50 p-6 shadow-xs hover:shadow-card-hover transition-all flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-200 text-purple-900 border border-purple-300">
              <RotateCcw className="h-3 w-3 text-purple-700" />
              Reenvio Solicitado
            </span>
            <span className="text-[10px] text-purple-700 font-medium">
              Versão {sp.versao}
            </span>
          </div>

          <h3 className="text-base font-extrabold text-purple-950 leading-snug">
            Ajuste Necessário na Gravação
          </h3>

          <p className="text-xs text-purple-900 leading-relaxed line-clamp-2">
            {sp.solicitacaoReenvio?.motivo ||
              "O professor solicitou uma nova gravação com orientações pedagógicas para melhor avaliação."}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-purple-200 flex items-center justify-between">
          <span className="text-[11px] text-purple-800 font-semibold">
            Vídeo anterior preservado
          </span>
          <Link
            href="/aluno/self-presentation"
            className="inline-flex items-center gap-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 px-3.5 py-1.5 rounded-xl transition-all shadow-2xs"
          >
            <span>Gravar Nova Versão</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // ESTADO 5: Avaliação Concluída
  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-xs hover:shadow-card-hover transition-all flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Avaliação Concluída
          </span>
          {sp.avaliacao?.nivelDefinido && (
            <NivelBadge nivel={sp.avaliacao.nivelDefinido} />
          )}
        </div>

        <h3 className="text-base font-extrabold text-slate-900 leading-snug">
          Diagnóstico Oral Homologado
        </h3>

        <p className="text-xs text-slate-600 leading-relaxed">
          Sua Self Presentation foi avaliada pelo professor{" "}
          <strong>{sp.professorAvaliadorNome || "Lucas Ferreira"}</strong> com rubricas pedagógicas do Método Paulo.
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between">
        <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
          <Award className="h-3.5 w-3.5 text-emerald-600" />
          Parecer Pedagógico Liberado
        </span>
        <Link
          href={`/aluno/self-presentation/${sp.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-xl transition-all shadow-2xs"
        >
          <span>Ver Parecer</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
