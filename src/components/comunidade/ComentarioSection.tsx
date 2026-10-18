"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ComentarioPublicacao } from "@/types";
import { comunidadeRepository } from "@/data/api";
import { Send, AlertTriangle, ShieldAlert } from "lucide-react";
import { DenunciaModal } from "./DenunciaModal";
import { ModeracaoModal } from "./ModeracaoModal";

interface ComentarioSectionProps {
  publicacaoId: string;
  autorAtualId: string;
  autorAtualNome: string;
  autorAtualAvatar?: string;
  autorAtualPapel: "aluno" | "professor" | "admin";
  permitirComentarios: boolean;
  isAdmin?: boolean;
}

export function ComentarioSection({
  publicacaoId,
  autorAtualId,
  autorAtualNome,
  autorAtualAvatar,
  autorAtualPapel,
  permitirComentarios,
  isAdmin = false,
}: ComentarioSectionProps) {
  const [comentarios, setComentarios] = useState<ComentarioPublicacao[]>([]);
  const [novoTexto, setNovoTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  // Modais de denúncia e moderação
  const [denunciaAlvo, setDenunciaAlvo] = useState<ComentarioPublicacao | null>(null);
  const [moderacaoAlvo, setModeracaoAlvo] = useState<ComentarioPublicacao | null>(null);

  const carregar = useCallback(async () => {
    try {
      const lista = await comunidadeRepository.listarComentarios(publicacaoId, !isAdmin);
      setComentarios(lista);
    } catch (err) {
      console.error("Erro ao carregar comentários:", err);
    } finally {
      setLoading(false);
    }
  }, [publicacaoId, isAdmin]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!novoTexto.trim()) return;

    setEnviando(true);
    setErro("");
    try {
      const res = await comunidadeRepository.criarComentario({
        publicacaoId,
        autorId: autorAtualId,
        autorNome: autorAtualNome,
        autorAvatar: autorAtualAvatar,
        autorPapel: autorAtualPapel,
        conteudo: novoTexto,
      });

      if (!res.success) {
        setErro(res.error || "Erro ao postar comentário.");
      } else {
        setNovoTexto("");
        carregar();
      }
    } catch {
      setErro("Erro de comunicação ao enviar comentário.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleDenunciar(motivo: import("@/types").MotivoDenuncia, descricao?: string) {
    if (!denunciaAlvo) return;
    await comunidadeRepository.denunciarConteudo({
      alvoTipo: "comentario",
      alvoId: denunciaAlvo.id,
      publicacaoId,
      denuncianteId: autorAtualId,
      denuncianteNome: autorAtualNome,
      motivo,
      descricao,
    });
    alert("Denúncia registrada com sucesso. Agradecemos por manter nossa comunidade segura!");
  }

  async function handleModerar(acao: import("@/types").AcaoModeracao, motivo: string) {
    if (!moderacaoAlvo) return;
    if (acao === "ocultar" || acao === "remover" || acao === "restaurar") {
      await comunidadeRepository.moderarComentario(
        moderacaoAlvo.id,
        acao,
        motivo,
        autorAtualId,
        autorAtualNome
      );
      carregar();
    }
  }

  return (
    <div className="pt-4 border-t border-slate-100 space-y-3">
      {/* Lista de Comentários */}
      {loading ? (
        <p className="text-xs text-slate-400">Carregando comentários...</p>
      ) : comentarios.length === 0 ? (
        <p className="text-xs text-slate-400 italic">
          Nenhum comentário ainda. Seja o primeiro a interagir!
        </p>
      ) : (
        <div className="space-y-2.5">
          {comentarios.map((c) => (
            <div
              key={c.id}
              className={`p-3 rounded-2xl border text-xs space-y-1 ${
                c.status === "oculto" || c.status === "removido"
                  ? "bg-slate-100/60 border-slate-200 text-slate-400"
                  : "bg-slate-50/70 border-slate-200/70 text-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-200 shrink-0 relative">
                    <Image
                      src={c.autorAvatar || (c.autorPapel === "professor" ? "/teacher-avatar-hd.png" : "/mariana-avatar.png")}
                      alt={c.autorNome}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <span className="font-semibold text-slate-900">{c.autorNome}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                    c.autorPapel === "professor" ? "bg-purple-100 text-purple-700" : "bg-slate-200 text-slate-600"
                  }`}>
                    {c.autorPapel}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(c.criadoEm).toLocaleDateString("pt-BR")}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDenunciaAlvo(c)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                    title="Denunciar comentário"
                  >
                    <AlertTriangle className="w-3 h-3" />
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => setModeracaoAlvo(c)}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition"
                      title="Moderar comentário"
                    >
                      <ShieldAlert className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <p className="leading-relaxed pl-7 text-slate-700">{c.conteudo}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulário de Novo Comentário */}
      {permitirComentarios ? (
        <form onSubmit={handleEnviar} className="pt-2">
          {erro && <p className="text-xs text-rose-600 mb-1">{erro}</p>}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={novoTexto}
              onChange={(e) => setNovoTexto(e.target.value)}
              placeholder="Escreva um comentário ou tire sua dúvida..."
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={enviando || !novoTexto.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1 transition disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              <span>Enviar</span>
            </button>
          </div>
        </form>
      ) : (
        <p className="text-[11px] text-slate-400 italic pt-1">
          Comentários desativados neste espaço pela coordenação.
        </p>
      )}

      {/* Modais */}
      {denunciaAlvo && (
        <DenunciaModal
          isOpen={Boolean(denunciaAlvo)}
          onClose={() => setDenunciaAlvo(null)}
          onSubmit={handleDenunciar}
          alvoTipo="comentario"
          alvoTitulo={denunciaAlvo.conteudo}
        />
      )}

      {moderacaoAlvo && (
        <ModeracaoModal
          isOpen={Boolean(moderacaoAlvo)}
          onClose={() => setModeracaoAlvo(null)}
          onSubmit={handleModerar}
          alvoTitulo={moderacaoAlvo.conteudo}
          statusAtual={moderacaoAlvo.status}
        />
      )}
    </div>
  );
}
