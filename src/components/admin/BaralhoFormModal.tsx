"use client";

import React, { useState, useEffect } from "react";
import {
  Baralho,
  DestinoTipo,
  NivelMaterial,
  OperationResult,
  StatusBaralho,
  Turma,
  Aluno,
  Professor,
} from "@/types";
import { X, Layers, AlertCircle, Info } from "lucide-react";
import { validateBaralhoInput } from "@/data/validators";

interface BaralhoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  baralhoParaEditar?: Baralho | null;
  onSalvar: (dados: Partial<Baralho>) => Promise<OperationResult<Baralho>>;
  turmas: Turma[];
  alunos: Aluno[];
  professores: Professor[];
}

export function BaralhoFormModal({
  isOpen,
  onClose,
  baralhoParaEditar,
  onSalvar,
  turmas,
  alunos,
  professores,
}: BaralhoFormModalProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("Pronúncia e Fala");
  const [nivelRecomendado, setNivelRecomendado] = useState<NivelMaterial>("todos");
  const [idiomaOrigem, setIdiomaOrigem] = useState("Inglês");
  const [idiomaDestino, setIdiomaDestino] = useState("Português");
  const [destinoTipo, setDestinoTipo] = useState<DestinoTipo>("geral");
  const [destinoId, setDestinoId] = useState("");
  const [professorId, setProfessorId] = useState("");
  const [limiteDiarioNovos, setLimiteDiarioNovos] = useState(20);
  const [tagsStr, setTagsStr] = useState("método-paulo");
  const [status, setStatus] = useState<StatusBaralho>("publicado");

  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (baralhoParaEditar) {
      setNome(baralhoParaEditar.nome);
      setDescricao(baralhoParaEditar.descricao);
      setCategoria(baralhoParaEditar.categoria);
      setNivelRecomendado(baralhoParaEditar.nivelRecomendado);
      setIdiomaOrigem(baralhoParaEditar.idiomaOrigem || "Inglês");
      setIdiomaDestino(baralhoParaEditar.idiomaDestino || "Português");
      setDestinoTipo(baralhoParaEditar.destinoTipo);
      setDestinoId(baralhoParaEditar.destinoId || "");
      setProfessorId(baralhoParaEditar.professorId);
      setLimiteDiarioNovos(baralhoParaEditar.limiteDiarioNovos || 20);
      setTagsStr(baralhoParaEditar.tags ? baralhoParaEditar.tags.join(", ") : "");
      setStatus(baralhoParaEditar.status);
    } else {
      setNome("");
      setDescricao("");
      setCategoria("Pronúncia e Fala");
      setNivelRecomendado("todos");
      setIdiomaOrigem("Inglês");
      setIdiomaDestino("Português");
      setDestinoTipo("geral");
      setDestinoId("");
      const primeiroProf = professores.find((p) => p.status === "ativo") || professores[0];
      setProfessorId(primeiroProf?.id || "prof-001");
      setLimiteDiarioNovos(20);
      setTagsStr("método-paulo");
      setStatus("publicado");
    }
    setErros({});
  }, [baralhoParaEditar, isOpen, professores]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErros({});

    const tags = tagsStr
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const prof = professores.find((p) => p.id === professorId);

    const payload: Partial<Baralho> = {
      ...(baralhoParaEditar ? { id: baralhoParaEditar.id } : {}),
      nome,
      descricao,
      categoria,
      nivelRecomendado,
      idiomaOrigem,
      idiomaDestino,
      destinoTipo,
      destinoId: destinoTipo === "geral" ? undefined : destinoId,
      professorId,
      professorNome: prof?.nomeCompleto || "Professor MTD",
      limiteDiarioNovos: Number(limiteDiarioNovos),
      tags,
      status,
    };

    const val = validateBaralhoInput(payload);
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
        setErros({ submit: res.error || "Falha ao salvar baralho." });
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {baralhoParaEditar ? "Editar Baralho de Flashcards" : "Novo Baralho de Flashcards"}
              </h2>
              <p className="text-xs text-gray-500">
                Repetição espaçada com base metodológica MTD
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {erros.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erros.submit}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Nome do Baralho *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Connected Speech & Reduções Cotidianas"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {erros.nome && <p className="text-xs text-red-500 mt-1">{erros.nome}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Descrição Pedagógica *
            </label>
            <textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o propósito deste conjunto de cartões e as habilidades orais ou gramaticais estimuladas..."
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {erros.descricao && <p className="text-xs text-red-500 mt-1">{erros.descricao}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Categoria *
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="Pronúncia e Fala">Pronúncia e Fala</option>
                <option value="Vocabulário Prático">Vocabulário Prático</option>
                <option value="Business English">Business English</option>
                <option value="Gramática Aplicada">Gramática Aplicada</option>
                <option value="Executive English">Executive English</option>
                <option value="Expressões Idiomáticas">Expressões Idiomáticas</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Nível Recomendado *
              </label>
              <select
                value={nivelRecomendado}
                onChange={(e) => setNivelRecomendado(e.target.value as NivelMaterial)}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="todos">Todos os níveis (Geral)</option>
                <option value="A1">A1 - Iniciante</option>
                <option value="A2">A2 - Básico</option>
                <option value="B1">B1 - Intermediário</option>
                <option value="B2">B2 - Usuário Independente</option>
                <option value="C1">C1 - Avançado</option>
                <option value="C2">C2 - Domínio Pleno</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Destino do Baralho *
              </label>
              <select
                value={destinoTipo}
                onChange={(e) => setDestinoTipo(e.target.value as DestinoTipo)}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="geral">Geral (Biblioteca para todos os alunos)</option>
                <option value="turma">Turma específica</option>
                <option value="aluno">Aluno individualizado</option>
              </select>
            </div>

            {destinoTipo === "turma" && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Selecione a Turma *
                </label>
                <select
                  value={destinoId}
                  onChange={(e) => setDestinoId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Selecione uma turma...</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.nivel} • {t.modalidade})
                    </option>
                  ))}
                </select>
                {erros.destinoId && <p className="text-xs text-red-500 mt-1">{erros.destinoId}</p>}
              </div>
            )}

            {destinoTipo === "aluno" && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Selecione o Aluno *
                </label>
                <select
                  value={destinoId}
                  onChange={(e) => setDestinoId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Selecione um aluno...</option>
                  {alunos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nomeCompleto} ({a.email})
                    </option>
                  ))}
                </select>
                {erros.destinoId && <p className="text-xs text-red-500 mt-1">{erros.destinoId}</p>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Professor Responsável *
              </label>
              <select
                value={professorId}
                onChange={(e) => setProfessorId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {professores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nomeCompleto}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Limite Diário de Novos Cartões
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={limiteDiarioNovos}
                onChange={(e) => setLimiteDiarioNovos(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-gray-400">Padrão: 20 cartões/dia (1 a 100)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Tags (separadas por vírgula)
              </label>
              <input
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="Ex.: pronúncia, connected-speech, reunião"
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Status do Baralho
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusBaralho)}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="publicado">Publicado (Visível para discentes)</option>
                <option value="rascunho">Rascunho (Oculto aos discentes)</option>
                <option value="arquivado">Arquivado (Inativo)</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <strong className="font-semibold">Princípios de Repetição Espaçada:</strong> Este
              sistema é fundamentado no método MTD e em princípios de repetição espaçada
              (SRS). Não possui nem declara integração oficial ou dependência com o software Anki.
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
              {salvando ? "Salvando..." : baralhoParaEditar ? "Salvar Alterações" : "Criar Baralho"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
