"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, MessageSquare, Send, Check } from "lucide-react";

interface TeacherCardProps {
  teacher: {
    name: string;
    role: string;
    avatarUrl: string;
    bio: string;
  };
}

export function TeacherCard({ teacher }: TeacherCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900">
              Seu professor
            </h3>
            <Link
              href="/aluno/perfil"
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Ver perfil do professor"
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>

          {/* Teacher Profile Info */}
          <div className="flex items-center gap-3.5 mb-3">
            <div
              className="relative h-11 w-11 rounded-full overflow-hidden bg-slate-100 shrink-0"
              style={{ width: 44, height: 44, position: "relative" }}
            >
              <Image
                src={teacher.avatarUrl}
                alt={teacher.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">
                {teacher.name}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{teacher.role}</p>
            </div>
          </div>

          {/* Bio message box with chat bubble icon matching Image 1 */}
          <div className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed mb-4">
            <MessageSquare className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
            <p>{teacher.bio}</p>
          </div>
        </div>

        {/* Action Button: Light lavender pill matching Image 1 */}
        <div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#F0EEFF] px-4 py-2.5 text-xs font-bold text-[#5B4DFC] hover:bg-indigo-100/70 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Enviar mensagem</span>
          </button>
        </div>
      </div>

      {/* Message Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          role="dialog"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Enviar mensagem para {teacher.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Canal de comunicação do Método Paulo.
            </p>

            {messageSent ? (
              <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-center space-y-2">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold text-emerald-900">
                  Mensagem enviada com sucesso!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMessageSent(false);
                    setIsModalOpen(false);
                  }}
                  className="mt-2 text-xs font-semibold text-emerald-800 underline"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setMessageSent(true);
                }}
                className="space-y-4"
              >
                <textarea
                  rows={3}
                  required
                  placeholder="Olá Professor Lucas! Gostaria de tirar uma dúvida sobre a pronúncia do Módulo 3..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#5B4DFC] outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#5B4DFC] px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Enviar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
