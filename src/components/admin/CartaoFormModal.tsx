"use client";

import React, { useState, useEffect } from "react";
import { Cartao, OperationResult, StatusCartao } from "@/types";
import { X, CreditCard, AlertCircle } from "lucide-react";
import { validateCartaoInput } from "@/data/validators";

interface CartaoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  baralhoId: string;
  cartaoParaEditar?: Cartao | null;
  onSalvar: (dados: Partial<Cartao>) => Promise<OperationResult<Cartao>>;
}

export function CartaoFormModal({
  isOpen,
  onClose,
  baralhoId,
  cartaoParaEditar,
  onSalvar,
}: CartaoFormModalProps) {
  const [frente, setFrente] = useState("");
  const [verso, setVerso] = useState("");
  const [exemplo, setExemplo] = useState("");
  const [traducao, setTraducao] = useState("");
  const [dica, setDica] = useState("");
  const [pronuncia, setPronuncia] = useState("");
  const [linkAudio, setLinkAudio] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [status, setStatus] = useState<StatusCartao>("ativo");

  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (cartaoParaEditar) {
      setFrente(cartaoParaEditar.frente);
      setVerso(cartaoParaEditar.verso);
      setExemplo(cartaoParaEditar.exemplo || "");
      setTraducao(cartaoParaEditar.traducao || "");
      setDica(cartaoParaEditar.dica || "");
      setPronuncia(cartaoParaEditar.pronuncia || "");
      setLinkAudio(cartaoParaEditar.linkAudio || "");
      setTagsStr(cartaoParaEditar.tags ? cartaoParaEditar.tags.join(", ") : "");
      setStatus(cartaoParaEditar.status);
    } else {
      setFrente("");
      setVerso("");
      setExemplo("");
      setTraducao("");
      setDica("");
      setPronuncia("");
      setLinkAudio("");
      setTagsStr("");
      setStatus("ativo");
    }
    setErros({});
    setSalvando(false);
  }, [cartaoParaEditar, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErros({});

    const tags = tagsStr
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const payload: Partial<Cartao> = {
      ...(cartaoParaEditar ? { id: cartaoParaEditar.id } : {}),
      baralhoId,
      frente,
      verso,
      exemplo: exemplo.trim() || undefined,
      traducao: traducao.trim() || undefined,
      dica: dica.trim() || undefined,
      pronuncia: pronuncia.trim() || undefined,
      linkAudio: linkAudio.trim() || undefined,
      tags,
      status,
    };

    const val = validateCartaoInput(payload);
    if (!val.isValid) {
      setErros(val.errors);
      return;
    }

    setSalvando(true);
    try {
      const res = await onSalvar(payload);
      if (res.success) {
        onClose();
      } else {
        setErros({ submit: res.error || "Falha ao salvar cartão." });
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {cartaoParaEditar ? "Editar Cartão" : "Adicionar Cartão ao Baralho"}
              </h2>
              <p className="text-xs text-gray-500">
                Frente, verso e referências pedagógicas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erros.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erros.submit}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Frente do Cartão (Pergunta / Expressão) *
            </label>
            <textarea
              rows={2}
              value={frente}
              onChange={(e) => setFrente(e.target.value)}
              placeholder="Ex.: What are you going to do?"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {erros.frente && <p className="text-xs text-red-500 mt-1">{erros.frente}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Verso do Cartão (Significado / Resposta) *
            </label>
            <textarea
              rows={2}
              value={verso}
              onChange={(e) => setVerso(e.target.value)}
              placeholder="Ex.: O que você vai fazer?"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {erros.verso && <p className="text-xs text-red-500 mt-1">{erros.verso}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Exemplo Contextualizado
              </label>
              <input
                type="text"
                value={exemplo}
                onChange={(e) => setExemplo(e.target.value)}
                placeholder="Ex.: Whatcha gonna do about it?"
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Tradução do Exemplo
              </label>
              <input
                type="text"
                value={traducao}
                onChange={(e) => setTraducao(e.target.value)}
                placeholder="Ex.: O que você vai fazer a respeito?"
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Guia de Pronúncia / Fonética
              </label>
              <input
                type="text"
                value={pronuncia}
                onChange={(e) => setPronuncia(e.target.value)}
                placeholder="Ex.: /ˈwʌtʃə gənə duː/ ou WUH-chuh"
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Dica Pedagógica
              </label>
              <input
                type="text"
                value={dica}
                onChange={(e) => setDica(e.target.value)}
                placeholder="Ex.: Fusão fonética comum no inglês falado"
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Link Externo de Áudio (HTTPS - Opcional)
            </label>
            <input
              type="url"
              value={linkAudio}
              onChange={(e) => setLinkAudio(e.target.value)}
              placeholder="https://exemplo.com/audio.mp3"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {erros.linkAudio && <p className="text-xs text-red-500 mt-1">{erros.linkAudio}</p>}
            <p className="text-[11px] text-gray-400 mt-1">
              Caso não haja arquivo ou link HTTPS configurado, o botão de áudio ficará oculto para não fingir reprodução.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Tags (separadas por vírgula)
              </label>
              <input
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="Ex.: cotidiano, fala, perguntas"
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Status do Cartão
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusCartao)}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ativo">Ativo (Entra no fluxo de revisões)</option>
                <option value="suspenso">Suspenso (Pausado temporariamente)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {salvando ? "Salvando..." : cartaoParaEditar ? "Salvar Alterações" : "Adicionar Cartão"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
