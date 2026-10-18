"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  GraduationCap,
  VideoOff,
} from "lucide-react";
import { ProximaAula } from "@/types";

interface ProximaAulaCardProps {
  aula?: ProximaAula | null;
}

export function ProximaAulaCard({ aula }: ProximaAulaCardProps) {
  // Estado vazio: quando não há aula agendada
  if (!aula) {
    return (
      <div className="rounded-[14px] border border-[#DDDDE5] bg-white shadow-xs overflow-hidden flex flex-col justify-between h-full relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#D79A24] before:z-20">
        <div className="p-6 sm:p-7 bg-[#06142C] text-white relative">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#EDB84E] uppercase">
              PRÓXIMA AULA AO VIVO
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10.5px] font-medium bg-white/10 text-slate-300 border border-white/15">
              Sem agendamento
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
            Nenhuma aula ao vivo agendada
          </h2>
          <p className="text-xs text-slate-300 mt-2 max-w-md">
            Consulte a grade completa de aulas da sua turma ou acesse os materiais das aulas anteriores.
          </p>
        </div>

        <div className="p-5 bg-[#FAF8F3] border-t border-[#DDDDE5] flex items-center justify-between">
          <span className="text-[11px] text-[#60708F]">
            Programação atualizada pela coordenação
          </span>
          <Link
            href="/aluno/aulas"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B2FE8] hover:text-[#7047F5] transition-colors"
          >
            <span>Ver agenda de aulas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const temLinkZoom = Boolean(aula.meetingUrl && aula.meetingUrl.startsWith("https://"));

  return (
    <div className="rounded-[14px] border border-[#DDDDE5] bg-white shadow-xs overflow-hidden flex flex-col justify-between h-full relative group before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#D79A24] before:z-20">
      {/* 1. PARTE SUPERIOR: Usando mtd-class-card-background.webp como background oficial */}
      <div className="relative text-white p-6 sm:p-7 overflow-hidden bg-[#06142C] bg-[url('/assets/mtd/mtd-class-card-background.webp')] bg-cover bg-center bg-no-repeat">
        {/* Camada decorativa oficial com mapa múndi */}
        <div
          className="absolute right-0 top-0 bottom-0 w-3/5 bg-[url('/assets/mtd/mtd-world-map-overlay.webp')] bg-contain bg-no-repeat bg-right-center opacity-35 pointer-events-none mix-blend-screen"
          aria-hidden="true"
        />

        {/* Eyebrow & Status Badge */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-[#EDB84E]" />
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#EDB84E] uppercase">
              PRÓXIMA AULA AO VIVO
            </span>
          </div>

          {/* Badge do Status do Link do Zoom */}
          {temLinkZoom ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-semibold bg-[#16A879]/20 text-[#16A879] border border-[#16A879]/40 backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              Link oficial verificado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-medium bg-[#07142D]/85 text-[#EDB84E] border border-[#D79A24]/40 backdrop-blur-xs">
              <Clock className="w-3.5 h-3.5 text-[#EDB84E]" />
              Aguardando liberação do link
            </span>
          )}
        </div>

        {/* Título Grande Serifado em Branco */}
        <h2 className="relative z-10 text-xl sm:text-[23px] font-serif font-bold text-white tracking-tight leading-snug">
          {aula.titulo}
        </h2>

        {/* Metadados: Linha Única sem Duplicação de Horário */}
        <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-300 mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center gap-1.5 font-medium text-white">
            <Calendar className="w-3.5 h-3.5 text-[#EDB84E]" />
            <span>qui., 22/10, 19:30</span>
          </div>
          <span className="text-slate-500">|</span>
          <div className="flex items-center gap-1 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Duração: 50 min</span>
          </div>
          <span className="text-slate-500">|</span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <GraduationCap className="w-3.5 h-3.5 text-[#EDB84E]" />
            <span>English Fluency Immersion • B1</span>
          </div>
        </div>
      </div>

      {/* 2. PARTE INFERIOR: Fundo Marfim/Pérola + Professor + Zoom Status + Link Detalhes */}
      <div className="bg-[#FAF8F3] p-5 sm:p-6 border-t border-[#DDDDE5] flex flex-col justify-between gap-4 mt-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Professor Info */}
          <div className="flex items-center gap-3">
            <div
              className="relative w-11 h-11 rounded-[10px] overflow-hidden border border-[#DDDDE5] shrink-0 bg-slate-200 shadow-2xs"
              style={{ width: 44, height: 44, position: "relative" }}
            >
              <Image
                src={aula.professorAvatar || "/teacher-hd.jpg"}
                alt={aula.professorNome}
                fill
                className="object-cover"
                sizes="44px"
              />
            </div>
            <div className="min-w-0">
              <div className="text-[9.5px] font-bold text-[#60708F] uppercase tracking-wider">
                COM SEU PROFESSOR
              </div>
              <div className="text-sm font-bold text-[#07132E] truncate">
                {aula.professorNome}
              </div>
              <div className="text-[11px] text-[#60708F] truncate">
                {aula.professorTitulo || "Professor MTD"} • Método Paulo
              </div>
            </div>
          </div>

          {/* Divisor vertical sutil */}
          <div className="h-10 w-px bg-slate-200 hidden sm:block" />

          {/* Status do Zoom / Acesso */}
          <div className="flex items-center gap-2.5 max-w-xs text-xs text-[#60708F]">
            {temLinkZoom ? (
              <a
                href={aula.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#5B2FE8] hover:bg-[#7047F5] text-white text-xs font-bold transition-all shadow-xs"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Entrar na aula</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            ) : (
              <>
                <div className="w-8 h-8 rounded-lg border border-slate-200/80 bg-white flex items-center justify-center shrink-0 text-slate-500">
                  <VideoOff className="w-4 h-4" />
                </div>
                <span className="text-[11.5px] leading-snug">
                  O link do Zoom será liberado pela coordenação antes do início.
                  <span className="sr-only"> (Link da aula ainda não disponibilizado)</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Link Ver mais detalhes */}
        <div className="pt-2 border-t border-slate-200/60">
          <Link
            href="/aluno/aulas"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B2FE8] hover:text-[#7047F5] transition-colors"
          >
            <span>Ver mais detalhes da aula</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
