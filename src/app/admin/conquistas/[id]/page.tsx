"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ModeloConquista, ConquistaConcedida } from "@/types";
import { gamificacaoRepository } from "@/data/api";
import { ConquistaBadge } from "@/components/gamificacao/ConquistaBadge";
import { ModeloConquistaFormModal } from "@/components/gamificacao/ModeloConquistaFormModal";
import {
  ArrowLeft,
  Sparkles,
  Settings,
  Users,
  CheckCircle2,
} from "lucide-react";

export default function AdminConquistaDetalhePage() {
  const params = useParams();
  const id = params?.id as string;

  const [modelo, setModelo] = useState<ModeloConquista | null>(null);
  const [concedidas, setConcedidas] = useState<ConquistaConcedida[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalEditar, setModalEditar] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [mod, allConq] = await Promise.all([
        gamificacaoRepository.obterModeloPorId(id),
        gamificacaoRepository.listarTodasConcedidas(),
      ]);

      setModelo(mod);
      setConcedidas(allConq.filter((c) => c.modeloId === id));
    } catch (err) {
      console.error("Erro ao carregar detalhes da conquista:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) carregar();
  }, [id, carregar]);

  async function handleSalvar(dados: Partial<ModeloConquista>) {
    await gamificacaoRepository.salvarModelo(dados as Parameters<typeof gamificacaoRepository.salvarModelo>[0]);
    carregar();
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Carregando conquista...</div>;
  }

  if (!modelo) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-700">Modelo de conquista não encontrado.</p>
        <Link href="/admin/conquistas" className="text-xs text-indigo-600 hover:underline">
          ← Voltar para o catálogo de conquistas
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/conquistas"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Catálogo de Conquistas</span>
        </Link>

        <button
          onClick={() => setModalEditar(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Editar Parâmetros</span>
        </button>
      </div>

      {/* Hero do Modelo */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <ConquistaBadge icone={modelo.icone} tamanho="lg" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                {modelo.categoria}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">{modelo.nome}</h1>
              <p className="text-xs text-slate-600 mt-0.5">{modelo.descricao}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Sparkles className="w-3 h-3 text-amber-600" />
              +{modelo.pontosRecompensa} pts
            </span>
            <span className="block text-[11px] text-slate-400 mt-1">Status: {modelo.status}</span>
          </div>
        </div>

        {/* Parâmetros do Critério */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700">
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Tipo de Critério</span>
            <span className="font-semibold text-slate-900">{modelo.tipoCriterio}</span>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Meta Requerida</span>
            <span className="font-semibold text-slate-900">
              {modelo.nivelRequerido ? `Nível Operacional ${modelo.nivelRequerido}` : `${modelo.metaValor} un.`}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Tipo de Prêmio</span>
            <span className="font-semibold text-slate-900">{modelo.tipoPremio}</span>
          </div>
        </div>
      </div>

      {/* Alunos que Desbloquearam */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Alunos que Desbloquearam Este Marco ({concedidas.length})</span>
          </h2>
        </div>

        {concedidas.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">
            Nenhum aluno atingiu este marco até o momento.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {concedidas.map((conq) => (
              <div key={conq.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-900">{conq.alunoNome}</h4>
                    {conq.codigoValidacaoDigital && (
                      <p className="font-mono text-indigo-600 text-[10px]">
                        Identificador demonstrativo: {conq.codigoValidacaoDigital}
                      </p>
                    )}
                    {conq.justificativaDocente && (
                      <p className="text-purple-700 text-[10px] italic">
                        Justificativa: &quot;{conq.justificativaDocente}&quot;
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-400">
                  <span>Concedido em {new Date(conq.dataConcessao || conq.concedidaEm || 0).toLocaleDateString("pt-BR")}</span>
                  <span className="block text-[10px]">Via: {conq.concedidoPor}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Editar */}
      {modalEditar && (
        <ModeloConquistaFormModal
          isOpen={modalEditar}
          onClose={() => setModalEditar(false)}
          onSave={handleSalvar}
          modeloParaEditar={modelo}
        />
      )}
    </div>
  );
}
