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
  GraduationCap,
  VideoOff,
} from "lucide-react";
import { ProximaAula } from "@/types";

interface CompactNextClassCardProps {
  aula?: ProximaAula | null;
}

export function CompactNextClassCard({ aula }: CompactNextClassCardProps) {
  if (!aula) {
    return (
      <div className="rounded-[14px] border border-[#DDDDE5] bg-white shadow-xs overflow-hidden flex flex-col justify-between h-full min-h-[300px] max-h-[340px] relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#D79A24] before:z-20">
        <div className="p-6 bg-[#06142C] text-white flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Video className="w-3.5 h-3.5 text-[#EDB84E]" aria-hidden="true" />
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#EDB84E] uppercase font-sans">
              PRÓXIMA AULA
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
            Nenhuma aula ao vivo agendada
          </h2>
          <p className="text-xs text-slate-300 mt-2 max-w-md font-sans">
            Consulte a grade completa de aulas da sua turma na agenda.
          </p>
        </div>

        <div className="p-4 bg-[#FAF8F3] border-t border-[#DDDDE5] flex items-center justify-between">
          <span className="text-[11px] text-[#60708F] font-sans">
            Agenda do Método Paulo
          </span>
          <Link
            href="/aluno/aulas"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B2FE8] hover:text-[#7047F5] transition-colors"
          >
            <span>Ver detalhes da aula</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  const temLinkZoom = Boolean(aula.meetingUrl && aula.meetingUrl.startsWith("https://"));

  return (
    <div className="rounded-[14px] border border-[#DDDDE5] bg-white shadow-xs overflow-hidden flex flex-col justify-between h-full min-h-[300px] lg:max-h-[340px] relative w-full min-w-0 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#D79A24] before:z-20">
      {/* 1. PARTE SUPERIOR: Background oficial do card de aula */}
      <div className="relative text-white p-5 sm:p-6 overflow-hidden bg-[#06142C] bg-[url('/assets/mtd/mtd-class-card-background.webp')] bg-cover bg-center bg-no-repeat flex-1 flex flex-col justify-between">
        {/* Camada decorativa com mapa-múndi */}
        <div
          className="absolute right-0 top-0 bottom-0 w-3/5 bg-[url('/assets/mtd/mtd-world-map-overlay.webp')] bg-contain bg-no-repeat bg-right-center opacity-30 pointer-events-none mix-blend-screen"
          aria-hidden="true"
        />

        <div className="relative z-10">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-2">
            <Video className="w-3.5 h-3.5 text-[#EDB84E]" aria-hidden="true" />
            <span className="text-[10px] font-bold tracking-[0.22em] text-[#EDB84E] uppercase font-sans">
              PRÓXIMA AULA
            </span>
          </div>

          {/* Título da Aula */}
          <h2 className="text-lg sm:text-[21px] font-serif font-bold text-white tracking-tight leading-snug line-clamp-2">
            {aula.titulo}
          </h2>
        </div>

        {/* Metadados: Data, Horário, Duração, Módulo em linha compacta */}
        <div className="relative z-10 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-300 pt-3 border-t border-white/10 mt-3 font-sans min-w-0">
          <div className="flex items-center gap-1.5 font-medium text-white shrink-0">
            <Calendar className="w-3.5 h-3.5 text-[#EDB84E]" aria-hidden="true" />
            <span>{aula.dataTexto || "qui., 22/10, 19:30"}</span>
          </div>
          <span className="text-slate-500">•</span>
          <div className="flex items-center gap-1 text-slate-300 shrink-0">
            <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>50 min</span>
          </div>
          <span className="text-slate-500">•</span>
          <div className="flex items-center gap-1.5 text-slate-300 min-w-0 max-w-[200px]">
            <GraduationCap className="w-3.5 h-3.5 text-[#EDB84E] shrink-0" aria-hidden="true" />
            <span className="truncate">{aula.modulo || "Turma B1"}</span>
          </div>
        </div>
      </div>

      {/* 2. PARTE INFERIOR: Professor + Status do Link + CTA */}
      <div className="bg-[#FAF8F3] px-5 py-3.5 sm:py-4 border-t border-[#DDDDE5] flex flex-col gap-3 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Professor em linha única compacta */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="relative w-9 h-9 rounded-lg overflow-hidden border border-[#DDDDE5] shrink-0 bg-slate-200"
              style={{ width: 36, height: 36, position: "relative" }}
            >
              <Image
                src={aula.professorAvatar || "/teacher-hd.jpg"}
                alt={aula.professorNome}
                fill
                className="object-cover"
                sizes="36px"
              />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#07132E] truncate">
                {aula.professorNome}
              </div>
              <div className="text-[11px] text-[#60708F] truncate">
                {aula.modulo || "Método Paulo"}
              </div>
            </div>
          </div>

          {/* Ação Principal / Status do link */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {temLinkZoom ? (
              <a
                href={aula.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#5B2FE8] hover:bg-[#7047F5] text-white text-xs font-bold transition-all shadow-xs w-full sm:w-auto"
              >
                <Video className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Entrar na aula</span>
                <ExternalLink className="w-3 h-3 opacity-80" aria-hidden="true" />
              </a>
            ) : (
              <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#DDDDE5] text-[11px] font-medium text-[#60708F] w-full sm:w-auto">
                <VideoOff className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <span className="truncate">Link da aula ainda não disponibilizado</span>
              </div>
            )}
          </div>
        </div>

        {/* CTA Secundário */}
        <div className="pt-2 border-t border-[#DDDDE5]/60 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-[#60708F]">
            {temLinkZoom ? "Sala ao vivo no Zoom" : "Programação da semana"}
          </span>
          <Link
            href="/aluno/aulas"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#5B2FE8] hover:text-[#7047F5] transition-colors"
          >
            <span>Ver detalhes da aula</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
