"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  User,
  ChevronRight,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MoreVertical,
  X,
  Info,
  ExternalLink,
} from "lucide-react";
import { ProximaAula } from "@/types";
import { cn } from "@/lib/utils";

interface HeroClassCardProps {
  aula: ProximaAula;
}

export function HeroClassCard({ aula }: HeroClassCardProps) {
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-[#5046E5] text-white shadow-card flex flex-col md:flex-row items-stretch justify-between p-3 sm:p-4 md:p-5 gap-6">
        {/* Left Side: Class details matching Image 1 */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between z-10">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-indigo-200">
              Próxima aula
            </span>

            <h2 className="text-xl sm:text-2xl lg:text-[26px] font-extrabold tracking-tight text-white leading-tight">
              {aula.modulo}
            </h2>

            <div className="flex flex-wrap items-center gap-5 text-xs sm:text-sm text-indigo-100 font-medium pt-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-200" />
                <span>{aula.dataTexto}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-indigo-200" />
                <span>{aula.professorNome}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 sm:pt-8">
            <button
              type="button"
              onClick={() => setShowNoticeModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-[#5046E5] shadow-xs hover:bg-indigo-50 transition-colors active:scale-[0.99]"
            >
              <span>Entrar na aula</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right Side: Real HD Webcam Video Card matching Image 1 */}
        <div className="relative w-full md:w-[48%] min-h-[220px] sm:min-h-[240px] md:min-h-[250px] rounded-2xl overflow-hidden shadow-md bg-slate-900 shrink-0">
          <Image
            src="/teacher-hd.jpg"
            alt={aula.professorNome}
            fill
            className={cn(
              "object-cover object-center transition-all duration-300",
              isVideoMuted && "filter grayscale brightness-50"
            )}
            priority
            unoptimized
          />

          {/* Fallback avatar if video is toggled off */}
          {isVideoMuted && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 text-xs font-medium z-10">
              <div className="relative h-16 w-16 rounded-full overflow-hidden mb-2 ring-2 ring-white/20">
                <Image
                  src="/teacher-avatar-hd.png"
                  alt={aula.professorNome}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <span>Câmera desligada</span>
            </div>
          )}

          {/* Real Interactive Floating Video Controls matching Image 1 */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-3 py-1.5 border border-white/10 z-20 shadow-lg">
            {/* Mic Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
              title={isMuted ? "Desmutar microfone" : "Mutar microfone"}
              aria-label={isMuted ? "Desmutar microfone" : "Mutar microfone"}
              className={cn(
                "rounded-full p-1.5 transition-colors focus:outline-none focus:ring-1 focus:ring-white",
                isMuted
                  ? "bg-rose-500/80 text-white"
                  : "text-white hover:bg-white/20"
              )}
            >
              {isMuted ? (
                <MicOff className="h-3.5 w-3.5" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Video Camera Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsVideoMuted(!isVideoMuted);
              }}
              title={isVideoMuted ? "Ligar câmera" : "Desligar câmera"}
              aria-label={isVideoMuted ? "Ligar câmera" : "Desligar câmera"}
              className={cn(
                "rounded-full p-1.5 transition-colors focus:outline-none focus:ring-1 focus:ring-white",
                isVideoMuted
                  ? "bg-rose-500/80 text-white"
                  : "text-white hover:bg-white/20"
              )}
            >
              {isVideoMuted ? (
                <VideoOff className="h-3.5 w-3.5" />
              ) : (
                <VideoIcon className="h-3.5 w-3.5" />
              )}
            </button>

            {/* More Options */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowNoticeModal(true);
              }}
              title="Mais opções da sala"
              aria-label="Mais opções da sala"
              className="rounded-full p-1.5 text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-1 focus:ring-white"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Direct Policy Modal */}
      {showNoticeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in"
          role="dialog"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setShowNoticeModal(false)}
              className="absolute top-4 right-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-2">
              Sala Virtual da Próxima Aula
            </h3>

            <p className="text-xs text-slate-600 mb-3">
              Aula: <strong>{aula.modulo}</strong> com{" "}
              <strong>{aula.professorNome}</strong> ({aula.dataTexto}).
            </p>

            <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2.5">
              <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">Status da Sala Virtual:</p>
                <p className="mt-0.5">{aula.meetingUrlNotice || "Link da aula ainda não disponibilizado."}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {aula.meetingUrl ? (
                <a
                  href={aula.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#5046E5] px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  <VideoIcon className="h-4 w-4" />
                  <span>Entrar no Zoom Agora</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
              <Link
                href="/aluno/aulas"
                onClick={() => setShowNoticeModal(false)}
                className="flex-1 inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                Ver Grade em Minhas Aulas
              </Link>
              <button
                type="button"
                onClick={() => setShowNoticeModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
