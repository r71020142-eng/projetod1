"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { NotificacaoInterna } from "@/types";
import { gamificacaoRepository } from "@/data/api";
import { Bell, CheckCheck, X, Trophy, MessageSquare, Award, Clock, AlertCircle } from "lucide-react";

interface NotificacoesDrawerProps {
  usuarioId: string;
  isOpen: boolean;
  onClose: () => void;
  onNotificacaoLida?: () => void;
}

export function NotificacoesDrawer({
  usuarioId,
  isOpen,
  onClose,
  onNotificacaoLida,
}: NotificacoesDrawerProps) {
  const [notificacoes, setNotificacoes] = useState<NotificacaoInterna[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const carregar = useCallback(async () => {
    try {
      const lista = await gamificacaoRepository.listarNotificacoes(usuarioId);
      setNotificacoes(lista);
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
    } finally {
      setLoading(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    if (isOpen) {
      carregar();
    }
  }, [isOpen, carregar]);

  // Trava a rolagem do body quando o drawer estiver aberto
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Fechar no teclado ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  async function handleMarcarLida(id: string) {
    await gamificacaoRepository.marcarNotificacaoComoLida(id);
    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    );
    if (onNotificacaoLida) onNotificacaoLida();
  }

  async function handleMarcarTodasLidas() {
    await gamificacaoRepository.marcarTodasComoLidas(usuarioId);
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    if (onNotificacaoLida) onNotificacaoLida();
  }

  // Se não estiver montado ou fechado, não renderiza
  if (!isOpen || !mounted) return null;

  const naoLidasCount = notificacoes.filter((n) => !n.lida).length;

  const drawerContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Central de notificações"
      className="fixed inset-0 z-[100] flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-sm h-full min-h-[100dvh] max-h-[100dvh] shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-250 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com Safe Area Top */}
        <div className="p-4 pt-[max(1rem,env(safe-area-inset-top,0px))] border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Bell className="w-4 h-4 text-indigo-600" />
            <span>Notificações</span>
            {naoLidasCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                {naoLidasCount} novas
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {naoLidasCount > 0 && (
              <button
                type="button"
                onClick={handleMarcarTodasLidas}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold p-1 hover:bg-slate-100 rounded transition"
                title="Marcar todas como lidas"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar painel de notificações"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lista com scroll isolado */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
          {loading ? (
            <p className="text-xs text-slate-400 text-center py-6">Carregando notificações...</p>
          ) : notificacoes.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Bell className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">Nenhuma notificação no momento.</p>
            </div>
          ) : (
            notificacoes.map((n) => {
              const iconMap: Record<string, React.ReactNode> = {
                conquista: <Trophy className="w-4 h-4 text-amber-500 shrink-0" />,
                conquista_desbloqueada: <Trophy className="w-4 h-4 text-amber-500 shrink-0" />,
                placa_status: <Award className="w-4 h-4 text-purple-600 shrink-0" />,
                status_placa: <Award className="w-4 h-4 text-purple-600 shrink-0" />,
                comentario_recebido: <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />,
                publicacao_aprovada: <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />,
                comunicado_fixado: <Bell className="w-4 h-4 text-indigo-600 shrink-0" />,
                feedback_publicacao: <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />,
                resultado_denuncia: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
              };

              return (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition ${
                    !n.lida
                      ? "bg-indigo-50/40 border-indigo-200"
                      : "bg-slate-50/60 border-slate-200/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      {iconMap[n.tipo] || <Bell className="w-4 h-4 text-slate-500" />}
                      <span className="leading-tight">{n.titulo}</span>
                    </div>

                    {!n.lida && (
                      <button
                        type="button"
                        onClick={() => handleMarcarLida(n.id)}
                        className="text-[10px] text-indigo-600 hover:underline font-semibold shrink-0"
                      >
                        Marcar lida
                      </button>
                    )}
                  </div>

                  <p className="text-slate-600 text-[11px] leading-relaxed">{n.mensagem}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100/60 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.criadoEm || n.criadaEm || 0).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    {n.linkDestino && (
                      <Link
                        href={n.linkDestino}
                        onClick={() => {
                          handleMarcarLida(n.id);
                          onClose();
                        }}
                        className="text-indigo-600 hover:underline font-semibold"
                      >
                        Ver detalhes →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer com Safe Area Bottom */}
        <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] border-t border-slate-100 text-center bg-slate-50 shrink-0">
          <p className="text-[11px] text-slate-400">
            Central de notificações pedagógicas da MTD
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
