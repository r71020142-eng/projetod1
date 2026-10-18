"use client";

import React from "react";
import Link from "next/link";
import {
  MessageSquare,
  Award,
  ArrowRight,
  UserCheck,
  Calendar,
  Trophy,
} from "lucide-react";
import { SelfPresentation, ConquistaItem } from "@/types";

interface FeedbackRecenteData {
  titulo: string;
  tipoContexto: string; // ex: "Nivelamento oral concluído"
  nivelFormatado?: string; // ex: "B1 — Intermediário"
  professorNome: string;
  dataTexto: string;
  parecerResumo: string;
  linkDestino: string;
}

interface ConquistaRecenteData {
  id: string;
  nome: string;
  descricao: string;
  dataTexto: string;
  pontos: number;
  tipoPremio?: string;
  linkDestino: string;
}

interface AtualizacoesRecentesGridProps {
  selfPresentation?: SelfPresentation | null;
  conquistas?: ConquistaItem[];
  conquistaConcedidaDestaque?: {
    id: string;
    nome: string;
    descricao: string;
    dataTexto: string;
    pontos: number;
    tipoPremio?: string;
  } | null;
}

export function AtualizacoesRecentesGrid({
  selfPresentation,
  conquistas,
  conquistaConcedidaDestaque,
}: AtualizacoesRecentesGridProps) {
  // 1. Extração do Feedback Pedagógico Recente
  let feedback: FeedbackRecenteData | null = null;

  if (selfPresentation && selfPresentation.status === "avaliada" && selfPresentation.avaliacao) {
    const aval = selfPresentation.avaliacao;
    const dataObj = aval.concluidaEm ? new Date(aval.concluidaEm) : new Date();
    const dataFmt = !isNaN(dataObj.getTime())
      ? dataObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "Recentemente";

    // Formata o nível: "B1 — Intermediário" em vez de "B1 Intermediário (B1)"
    let nivelFmt = "B1 — Intermediário";
    if (aval.nivelDefinido) {
      if (aval.nivelDefinido.startsWith("B1")) nivelFmt = "B1 — Intermediário";
      else if (aval.nivelDefinido.startsWith("B2")) nivelFmt = "B2 — Independente";
      else if (aval.nivelDefinido.startsWith("A1")) nivelFmt = "A1 — Iniciante";
      else if (aval.nivelDefinido.startsWith("A2")) nivelFmt = "A2 — Básico";
      else if (aval.nivelDefinido.startsWith("C1")) nivelFmt = "C1 — Avançado";
      else if (aval.nivelDefinido.startsWith("C2")) nivelFmt = "C2 — Fluente";
      else nivelFmt = `${aval.nivelDefinido} — Operacional`;
    }

    const parecerTexto =
      aval.justificativaNivel ||
      aval.pontosFortes ||
      "Excelente desenvoltura oral, boa segurança na pronúncia e clareza fonética na exposição do repertório profissional.";

    feedback = {
      titulo: selfPresentation.titulo || "Apresentação Pessoal em Inglês",
      tipoContexto: "Nivelamento oral concluído",
      nivelFormatado: nivelFmt,
      professorNome: aval.professorNome || "Prof. Lucas Ferreira",
      dataTexto: dataFmt,
      parecerResumo: parecerTexto,
      linkDestino: `/aluno/self-presentation/${selfPresentation.id || "sp-001"}`,
    };
  }

  // 2. Extração da Conquista Recente
  let conquista: ConquistaRecenteData | null = null;

  if (conquistaConcedidaDestaque) {
    conquista = {
      id: conquistaConcedidaDestaque.id,
      nome: conquistaConcedidaDestaque.nome,
      descricao: conquistaConcedidaDestaque.descricao,
      dataTexto: conquistaConcedidaDestaque.dataTexto,
      pontos: conquistaConcedidaDestaque.pontos,
      tipoPremio: conquistaConcedidaDestaque.tipoPremio,
      linkDestino: "/aluno/conquistas",
    };
  } else if (conquistas && conquistas.length > 0) {
    const cq = conquistas[0];
    conquista = {
      id: cq.id,
      nome: cq.titulo,
      descricao: cq.descricao,
      dataTexto: cq.data || "Esta semana",
      pontos: 70,
      linkDestino: "/aluno/conquistas",
    };
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* CARD 1 — FEEDBACK PEDAGÓGICO RECENTE */}
      <div className="flex flex-col justify-between h-full bg-white rounded-[14px] border border-[#DDDDE5] p-5 sm:p-6 shadow-xs relative overflow-hidden group">
        <div>
          <div className="flex items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FAF8F3] text-[#D79A24] border border-[#D79A24]/30">
                <MessageSquare className="w-3.5 h-3.5 text-[#D79A24]" />
                Feedback recente
              </span>
            </div>

            {feedback?.nivelFormatado && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#5B2FE8]/10 text-[#5B2FE8] border border-[#5B2FE8]/20">
                {feedback.nivelFormatado}
              </span>
            )}
          </div>

          {feedback ? (
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-bold text-[#60708F] uppercase tracking-wider font-sans">
                  {feedback.tipoContexto}
                </div>
                <h3 className="font-serif text-base font-bold text-[#07132E] mt-0.5 line-clamp-1">
                  {feedback.titulo}
                </h3>
              </div>

              {/* Box com Parecer Qualitativo */}
              <div className="bg-[#FAF8F3] border border-[#DDDDE5] rounded-[10px] p-3.5 text-xs text-[#07132E] leading-relaxed italic relative">
                <p className="line-clamp-3">
                  &ldquo;{feedback.parecerResumo}&rdquo;
                </p>
              </div>

              {/* Assinatura do Professor */}
              <div className="flex items-center justify-between text-xs text-[#60708F] pt-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#07132E]">
                  <UserCheck className="w-3.5 h-3.5 text-[#5B2FE8]" />
                  <span>{feedback.professorNome}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#60708F]" />
                  <span>{feedback.dataTexto}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-[#60708F]">
              <div className="w-10 h-10 mx-auto mb-2 rounded-[10px] bg-slate-100 flex items-center justify-center text-slate-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-[#07132E]">
                Nenhum feedback pendente
              </div>
              <div className="text-[11px] mt-1">
                Envie suas atividades e Self Presentation para receber a avaliação detalhada do professor.
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 mt-4 border-t border-[#DDDDE5]">
          <Link
            href={feedback?.linkDestino || "/aluno/self-presentation"}
            className="inline-flex items-center justify-between w-full text-xs font-bold text-[#5B2FE8] hover:text-[#7047F5] transition-colors"
          >
            <span>Ver parecer pedagógico completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* CARD 2 — CONQUISTA RECENTE */}
      <div className="flex flex-col justify-between h-full bg-white rounded-[14px] border border-[#DDDDE5] p-5 sm:p-6 shadow-xs relative overflow-hidden group">
        <div>
          <div className="flex items-center justify-between gap-3 mb-3.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FAF8F3] text-[#D79A24] border border-[#D79A24]/30">
              <Award className="w-3.5 h-3.5 text-[#D79A24]" />
              Conquista recente
            </span>

            {conquista && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#16A879]/15 text-[#16A879] border border-[#16A879]/30">
                +{conquista.pontos} pts
              </span>
            )}
          </div>

          {conquista ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-[10px] bg-gradient-to-tr from-[#EDB84E] to-[#FAF8F3] text-amber-950 flex items-center justify-center shrink-0 shadow-2xs border border-[#EDB84E]/50">
                  <Trophy className="w-5 h-5 fill-amber-900/20" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-[#D79A24] uppercase tracking-wider font-sans">
                    Marco alcançado
                  </div>
                  <h3 className="font-serif text-base font-bold text-[#07132E] mt-0.5 line-clamp-1">
                    {conquista.nome}
                  </h3>
                  <p className="text-xs text-[#60708F] mt-1 line-clamp-2">
                    {conquista.descricao}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#60708F] pt-2 border-t border-[#DDDDE5]">
                <span>Método Paulo • Gamificação Pedagógica</span>
                <span>{conquista.dataTexto}</span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-[#60708F]">
              <div className="w-10 h-10 mx-auto mb-2 rounded-[10px] bg-slate-100 flex items-center justify-center text-slate-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-[#07132E]">
                Continue praticando
              </div>
              <div className="text-[11px] mt-1">
                Conquistas e medalhas são desbloqueadas conforme sua frequência e revisões SRS avançam.
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 mt-4 border-t border-[#DDDDE5]">
          <Link
            href="/aluno/conquistas"
            className="inline-flex items-center justify-between w-full text-xs font-bold text-[#5B2FE8] hover:text-[#7047F5] transition-colors"
          >
            <span>Ver todas as minhas conquistas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
