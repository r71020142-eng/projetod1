"use client";

import React, { useState } from "react";
import Image from "next/image";
import { PublicacaoComunidade } from "@/types";
import { TipoPublicacaoBadge, StatusPublicacaoBadge } from "./EspacoBadges";
import { ComentarioSection } from "./ComentarioSection";
import { DenunciaModal } from "./DenunciaModal";
import { ModeracaoModal } from "./ModeracaoModal";
import { comunidadeRepository } from "@/data/api";
import {
  MessageCircle,
  ThumbsUp,
  Heart,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

interface PublicacaoCardProps {
  publicacao: PublicacaoComunidade;
  usuarioAtualId: string;
  usuarioAtualNome: string;
  usuarioAtualPapel: "aluno" | "professor" | "admin";
  permitirComentarios?: boolean;
  isAdmin?: boolean;
  onAtualizar?: () => void;
}

export function PublicacaoCard({
  publicacao,
  usuarioAtualId,
  usuarioAtualNome,
  usuarioAtualPapel,
  permitirComentarios = true,
  isAdmin = false,
  onAtualizar,
}: PublicacaoCardProps) {
  const [expandirComentarios, setExpandirComentarios] = useState(false);
  const [denunciaAberta, setDenunciaAberta] = useState(false);
  const [moderacaoAberta, setModeracaoAberta] = useState(false);
  const [reacoesLocais, setReacoesLocais] = useState(publicacao.reacoes || {});
  const [reacaoUsuarioLocal, setReacaoUsuarioLocal] = useState<string | undefined>(
    publicacao.reacoesPorUsuario?.[usuarioAtualId]
  );

  async function handleReacao(tipo: "curtidas" | "apoio" | "parabens") {
    const anterior = reacaoUsuarioLocal;
    const novasReacoes = { ...reacoesLocais };
    let novaReacaoUsuario: string | undefined = tipo;

    if (anterior === tipo) {
      // Toggle off
      novasReacoes[tipo] = Math.max(0, (novasReacoes[tipo] || 0) - 1);
      novaReacaoUsuario = undefined;
    } else {
      // Substitui reação anterior
      if (anterior && (anterior === "curtidas" || anterior === "apoio" || anterior === "parabens")) {
        novasReacoes[anterior] = Math.max(0, (novasReacoes[anterior] || 0) - 1);
      }
      novasReacoes[tipo] = (novasReacoes[tipo] || 0) + 1;
    }

    setReacoesLocais(novasReacoes);
    setReacaoUsuarioLocal(novaReacaoUsuario);

    try {
      await comunidadeRepository.alternarReacaoPublicacao(publicacao.id, tipo, usuarioAtualId);
      if (onAtualizar) onAtualizar();
    } catch (err) {
      console.error("Erro ao registrar reação:", err);
    }
  }

  async function handleDenunciar(motivo: import("@/types").MotivoDenuncia, descricao?: string) {
    await comunidadeRepository.denunciarConteudo({
      alvoTipo: "publicacao",
      alvoId: publicacao.id,
      publicacaoId: publicacao.id,
      denuncianteId: usuarioAtualId,
      denuncianteNome: usuarioAtualNome,
      motivo,
      descricao,
    });
    alert("Publicação denunciada. Nossa equipe analisará o conteúdo.");
    if (onAtualizar) onAtualizar();
  }

  async function handleModerar(acao: import("@/types").AcaoModeracao, motivo: string) {
    await comunidadeRepository.moderarPublicacao(
      publicacao.id,
      acao,
      motivo,
      usuarioAtualId,
      usuarioAtualNome
    );
    if (onAtualizar) onAtualizar();
  }

  return (
    <article
      className={`p-6 rounded-3xl bg-white border transition shadow-xs space-y-4 ${
        publicacao.fixada
          ? "border-amber-300/80 bg-linear-to-b from-amber-50/20 to-white ring-1 ring-amber-300/40"
          : publicacao.status === "denunciada"
          ? "border-rose-300/80 bg-rose-50/10"
          : "border-slate-200/80 hover:border-slate-300"
      }`}
    >
      {/* Header do Card */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
            <Image
              src={
                publicacao.autorAvatar ||
                (publicacao.autorPapel === "professor"
                  ? "/teacher-avatar-hd.png"
                  : publicacao.autorPapel === "admin"
                  ? "/teacher-avatar-hd.png"
                  : "/mariana-avatar.png")
              }
              alt={publicacao.autorNome}
              fill
              className="object-cover"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-sm">
                {publicacao.autorNome}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  publicacao.autorPapel === "professor"
                    ? "bg-purple-100 text-purple-700"
                    : publicacao.autorPapel === "admin"
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {publicacao.autorPapel === "professor"
                  ? "Professor"
                  : publicacao.autorPapel === "admin"
                  ? "Coordenação"
                  : "Aluno"}
              </span>
              <TipoPublicacaoBadge tipo={publicacao.tipo} />
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>{publicacao.espacoNome}</span>
              <span>•</span>
              <time dateTime={publicacao.criadoEm}>
                {new Date(publicacao.criadoEm).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
          </div>
        </div>

        {/* Badges de Status e Moderação */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusPublicacaoBadge
            status={publicacao.status}
            fixada={publicacao.fixada}
          />

          <button
            onClick={() => setDenunciaAberta(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
            title="Denunciar publicação"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
          </button>

          {isAdmin && (
            <button
              onClick={() => setModeracaoAberta(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
              title="Ações de moderação administrativa"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Título e Conteúdo */}
      <div className="space-y-2">
        {publicacao.titulo && (
          <h3 className="font-bold text-slate-900 text-base leading-snug">
            {publicacao.titulo}
          </h3>
        )}
        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
          {publicacao.conteudo}
        </p>
      </div>

      {/* Link Externo HTTPS Seguro */}
      {publicacao.linkExterno && (() => {
        const url = typeof publicacao.linkExterno === "string" ? publicacao.linkExterno : publicacao.linkExterno.url;
        const titulo = typeof publicacao.linkExterno === "object" ? publicacao.linkExterno.titulo : undefined;
        return (
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 truncate">
              <ExternalLink className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-slate-900 block truncate">
                  {titulo || "Link de Referência"}
                </span>
                <span className="text-[11px] text-slate-500 truncate block">
                  {url}
                </span>
              </div>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs whitespace-nowrap transition inline-flex items-center gap-1"
            >
              <span>Acessar (Link externo HTTPS)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        );
      })()}

      {/* Barra de Reações e Ações */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleReacao("curtidas")}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-medium transition ${
              reacaoUsuarioLocal === "curtidas"
                ? "bg-blue-50 text-blue-700 ring-1 ring-blue-300 font-semibold shadow-xs"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700"
            }`}
            title="Curtir (1 reação por usuário)"
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${reacaoUsuarioLocal === "curtidas" ? "fill-blue-600 text-blue-600" : "text-blue-600"}`} />
            <span>Curtir</span>
            {(reacoesLocais.curtidas || 0) > 0 && (
              <span className="ml-0.5 font-bold text-slate-900">
                {reacoesLocais.curtidas}
              </span>
            )}
          </button>

          <button
            onClick={() => handleReacao("apoio")}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-medium transition ${
              reacaoUsuarioLocal === "apoio"
                ? "bg-rose-50 text-rose-700 ring-1 ring-rose-300 font-semibold shadow-xs"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700"
            }`}
            title="Apoiar (1 reação por usuário)"
          >
            <Heart className={`w-3.5 h-3.5 ${reacaoUsuarioLocal === "apoio" ? "fill-rose-500 text-rose-500" : "text-rose-500"}`} />
            <span>Apoiar</span>
            {(reacoesLocais.apoio || 0) > 0 && (
              <span className="ml-0.5 font-bold text-slate-900">
                {reacoesLocais.apoio}
              </span>
            )}
          </button>

          <button
            onClick={() => handleReacao("parabens")}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-medium transition ${
              reacaoUsuarioLocal === "parabens"
                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-300 font-semibold shadow-xs"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700"
            }`}
            title="Parabenizar (1 reação por usuário)"
          >
            <Sparkles className={`w-3.5 h-3.5 ${reacaoUsuarioLocal === "parabens" ? "fill-amber-500 text-amber-500" : "text-amber-500"}`} />
            <span>Parabéns</span>
            {(reacoesLocais.parabens || 0) > 0 && (
              <span className="ml-0.5 font-bold text-slate-900">
                {reacoesLocais.parabens}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={() => setExpandirComentarios(!expandirComentarios)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 font-semibold transition"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>
            {publicacao.comentariosCount || 0}{" "}
            {(publicacao.comentariosCount || 0) === 1
              ? "comentário"
              : "comentários"}
          </span>
        </button>
      </div>

      {/* Seção Expansível de Comentários */}
      {expandirComentarios && (
        <ComentarioSection
          publicacaoId={publicacao.id}
          autorAtualId={usuarioAtualId}
          autorAtualNome={usuarioAtualNome}
          autorAtualPapel={usuarioAtualPapel}
          permitirComentarios={permitirComentarios}
          isAdmin={isAdmin}
        />
      )}

      {/* Modais */}
      {denunciaAberta && (
        <DenunciaModal
          isOpen={denunciaAberta}
          onClose={() => setDenunciaAberta(false)}
          onSubmit={handleDenunciar}
          alvoTipo="publicacao"
          alvoTitulo={publicacao.titulo || publicacao.conteudo}
        />
      )}

      {moderacaoAberta && (
        <ModeracaoModal
          isOpen={moderacaoAberta}
          onClose={() => setModeracaoAberta(false)}
          onSubmit={handleModerar}
          alvoTitulo={publicacao.titulo || publicacao.conteudo}
          isFixada={publicacao.fixada}
          statusAtual={publicacao.status}
        />
      )}
    </article>
  );
}
