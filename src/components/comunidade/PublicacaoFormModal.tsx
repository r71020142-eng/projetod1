"use client";

import React, { useState } from "react";
import { EspacoComunidade, TipoPublicacaoComunidade } from "@/types";
import { validarLinkExternoHttps } from "@/data/comunidadeRegras";
import { X, Send, AlertCircle, Link as LinkIcon } from "lucide-react";

interface PublicacaoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dados: {
    espacoId: string;
    tipo: TipoPublicacaoComunidade;
    titulo?: string;
    conteudo: string;
    linkExternoUrl?: string;
    linkExternoTitulo?: string;
  }) => Promise<void>;
  espacosDisponiveis: EspacoComunidade[];
  espacoPreSelecionadoId?: string;
}

export function PublicacaoFormModal({
  isOpen,
  onClose,
  onSubmit,
  espacosDisponiveis,
  espacoPreSelecionadoId,
}: PublicacaoFormModalProps) {
  const [espacoId, setEspacoId] = useState(
    espacoPreSelecionadoId || espacosDisponiveis[0]?.id || ""
  );
  const [tipo, setTipo] = useState<TipoPublicacaoComunidade>("texto");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitulo, setLinkTitulo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!conteudo.trim() || conteudo.trim().length < 5) {
      setErro("O conteúdo deve ter no mínimo 5 caracteres.");
      return;
    }

    if (linkUrl.trim()) {
      const val = validarLinkExternoHttps(linkUrl);
      if (!val.isValid) {
        setErro(val.error || "Link externo inválido.");
        return;
      }
    }

    setSalvando(true);
    setErro("");
    try {
      await onSubmit({
        espacoId,
        tipo,
        titulo: titulo.trim() || undefined,
        conteudo: conteudo.trim(),
        linkExternoUrl: linkUrl.trim() || undefined,
        linkExternoTitulo: linkTitulo.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao publicar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-xl w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="font-bold text-slate-900 text-sm">Nova Publicação na Comunidade</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Espaço de Destino *
              </label>
              <select
                value={espacoId}
                onChange={(e) => setEspacoId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              >
                {espacosDisponiveis.map((esp) => (
                  <option key={esp.id} value={esp.id}>
                    {esp.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tipo de Post *
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoPublicacaoComunidade)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="texto">Texto Geral</option>
                <option value="dica">Dica de Estudo</option>
                <option value="duvida">Dúvida para Colegas / Professor</option>
                <option value="conquista">Compartilhar Conquista</option>
                <option value="aviso">Aviso / Comunicado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Título da Postagem (Opcional)
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Minha experiência com a técnica FORD em viagens..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Conteúdo da Postagem *
            </label>
            <textarea
              rows={5}
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Escreva sua mensagem, reflexão ou dúvida para a comunidade..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
              required
            />
          </div>

          {/* Anexo de Link Externo Seguro */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Adicionar Link Externo HTTPS (Opcional)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Para preservar a segurança da plataforma, anexe apenas links externos seguros (iniciando com https://). Não é permitido upload direto de arquivos nesta versão.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://exemplo.com/artigo-ou-audio"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                type="text"
                value={linkTitulo}
                onChange={(e) => setLinkTitulo(e.target.value)}
                placeholder="Título do link (Ex: Artigo BBC News)"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{salvando ? "Publicando..." : "Publicar"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
