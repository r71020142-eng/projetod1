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
  AlertCircle,
  Users,
} from "lucide-react";
import { ProximaAula } from "@/types";

interface ProximaAulaCardProps {
  aula?: ProximaAula | null;
}

export function ProximaAulaCard({ aula }: ProximaAulaCardProps) {
  // Estado vazio: quando não há aula agendada
  if (!aula) {
    return (
      <div className="flex flex-col justify-between h-full bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Próxima Aula
            </span>
          </div>

          <div className="py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Nenhuma aula ao vivo agendada
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mt-1">
              Consulte a programação completa da sua turma ou confira as gravações das aulas anteriores.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <Link
            href="/aluno/aulas"
            className="inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
          >
            <span>Ver agenda de aulas</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const temLinkZoom = Boolean(aula.meetingUrl && aula.meetingUrl.startsWith("https://"));

  return (
    <div className="flex flex-col justify-between h-full bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all">
      <div>
        {/* Top Header Badge & Tag */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0EEFF] text-[#5B4DFC]">
              <Video className="w-3.5 h-3.5 text-[#5B4DFC]" />
              Próxima aula ao vivo
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600">
              <Users className="w-3 h-3 text-slate-500" />
              {aula.modulo}
            </span>
          </div>

          {/* Status do Link do Zoom */}
          {temLinkZoom ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Link oficial verificado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Aguardando liberação do link
            </span>
          )}
        </div>

        {/* Título da Aula */}
        <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug line-clamp-2">
          {aula.titulo}
        </h2>

        {/* Metadados: Data, Horário e Duração */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-slate-600 mt-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Calendar className="w-4 h-4 text-[#5B4DFC]" />
            <span>{aula.dataTexto}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Duração: 50 min</span>
          </div>
        </div>

        {/* Professor Compacto (Foto menor e elegante, não ocupa metade da tela) */}
        <div className="flex items-center gap-3 mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div
            className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-200/80 shadow-xs bg-slate-200"
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
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 truncate">
              {aula.professorNome}
            </div>
            <div className="text-[11px] text-slate-500 font-medium truncate">
              {aula.professorTitulo || "Professor MTD"} • Método Paulo
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Ação na Base */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-4 mt-4 border-t border-slate-100">
        {temLinkZoom ? (
          <a
            href={aula.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full sm:flex-1 gap-2 px-4 py-2.5 rounded-xl bg-[#5B4DFC] hover:bg-[#4a3ecc] text-white text-xs font-bold transition-all shadow-xs shadow-[#5B4DFC]/20 hover:shadow-md"
          >
            <Video className="w-4 h-4" />
            <span>Entrar na aula</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        ) : (
          <div className="w-full sm:flex-1 text-[11px] text-slate-500 text-center sm:text-left font-medium py-1">
            O link do Zoom será liberado pela coordenação antes do início.
          </div>
        )}

        <Link
          href="/aluno/aulas"
          className="inline-flex items-center justify-center w-full sm:w-auto gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
        >
          <span>Ver detalhes</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
