"use client";

import React, { useState, useEffect } from "react";
import { X, CheckSquare, AlertCircle } from "lucide-react";
import {
  Atividade,
  TipoAtividade,
  StatusAtividade,
  DestinoTipo,
  Material,
  Professor,
  Turma,
  Aluno,
} from "@/types";
import { atividadeRepository } from "@/data/atividadeRepository";
import { materialRepository } from "@/data/materialRepository";
import { professorRepository } from "@/data/professorRepository";
import { turmaRepository } from "@/data/turmaRepository";
import { alunoRepository } from "@/data/alunoRepository";

interface AtividadeFormModalProps {
  isOpen: boolean;
  atividadeParaEditar?: Atividade | null;
  onClose: () => void;
  onSuccess: (atividadeSalva: Atividade) => void;
}

export function AtividadeFormModal({
  isOpen,
  atividadeParaEditar,
  onClose,
  onSuccess,
}: AtividadeFormModalProps) {
  const [titulo, setTitulo] = useState("");
  const [instrucoes, setInstrucoes] = useState("");
  const [tipo, setTipo] = useState<TipoAtividade>("texto");
  const [materialRelacionadoId, setMaterialRelacionadoId] = useState("");
  const [destinoTipo, setDestinoTipo] = useState<DestinoTipo>("turma");
  const [destinoId, setDestinoId] = useState("");
  const [dataPublicacao, setDataPublicacao] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [prazoEntrega, setPrazoEntrega] = useState("");
  const [pontuacaoMaxima, setPontuacaoMaxima] = useState<string>("");
  const [status, setStatus] = useState<StatusAtividade>("publicada");
  const [professorId, setProfessorId] = useState("");
  const [permitirAtraso, setPermitirAtraso] = useState(true);
  const [observacoesInternas, setObservacoesInternas] = useState("");

  const [materiais, setMateriais] = useState<Material[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      materialRepository.listar().then(setMateriais);
      professorRepository.listar().then((p) => {
        setProfessores(p);
        if (p.length > 0 && !professorId) {
          const ativo = p.find((prof) => prof.status === "ativo");
          setProfessorId(ativo ? ativo.id : p[0].id);
        }
      });
      turmaRepository.listar().then(setTurmas);
      alunoRepository.listar().then(setAlunos);

      if (atividadeParaEditar) {
        setTitulo(atividadeParaEditar.titulo);
        setInstrucoes(atividadeParaEditar.instrucoes);
        setTipo(atividadeParaEditar.tipo);
        setMaterialRelacionadoId(atividadeParaEditar.materialRelacionadoId || "");
        setDestinoTipo(atividadeParaEditar.destinoTipo);
        setDestinoId(atividadeParaEditar.destinoId || "");
        setDataPublicacao(
          atividadeParaEditar.dataPublicacao || new Date().toISOString().slice(0, 10)
        );
        setPrazoEntrega(
          atividadeParaEditar.prazoEntrega ? atividadeParaEditar.prazoEntrega.slice(0, 16) : ""
        );
        setPontuacaoMaxima(
          atividadeParaEditar.pontuacaoMaxima !== undefined &&
            atividadeParaEditar.pontuacaoMaxima !== null
            ? String(atividadeParaEditar.pontuacaoMaxima)
            : ""
        );
        setStatus(atividadeParaEditar.status);
        setProfessorId(atividadeParaEditar.professorId);
        setPermitirAtraso(atividadeParaEditar.permitirAtraso);
        setObservacoesInternas(atividadeParaEditar.observacoesInternas || "");
      } else {
        setTitulo("");
        setInstrucoes("");
        setTipo("texto");
        setMaterialRelacionadoId("");
        setDestinoTipo("turma");
        setDestinoId("");
        setDataPublicacao(new Date().toISOString().slice(0, 10));
        setPrazoEntrega("");
        setPontuacaoMaxima("10");
        setStatus("publicada");
        setPermitirAtraso(true);
        setObservacoesInternas("");
      }
      setError(null);
      setFieldErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, atividadeParaEditar]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    const payload: Partial<Atividade> = {
      titulo,
      instrucoes,
      tipo,
      materialRelacionadoId: materialRelacionadoId || undefined,
      destinoTipo,
      destinoId: destinoTipo === "geral" ? undefined : destinoId,
      dataPublicacao,
      prazoEntrega: prazoEntrega ? prazoEntrega : undefined,
      pontuacaoMaxima: pontuacaoMaxima ? Number(pontuacaoMaxima) : null,
      status,
      professorId,
      permitirAtraso,
      observacoesInternas: observacoesInternas.trim().length > 0 ? observacoesInternas.trim() : undefined,
    };

    try {
      const res = atividadeParaEditar
        ? await atividadeRepository.atualizar(atividadeParaEditar.id, payload)
        : await atividadeRepository.criar(payload);

      if (!res.success) {
        setError(res.error || "Erro ao salvar atividade.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setIsSubmitting(false);
        return;
      }

      onSuccess(res.data!);
      onClose();
    } catch (err) {
      console.error("Erro inesperado ao salvar atividade:", err);
      setError("Erro inesperado ao salvar atividade.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="atividade-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 id="atividade-modal-title" className="text-base font-bold text-slate-800">
                {atividadeParaEditar ? "Editar Atividade" : "Nova Atividade Prática"}
              </h2>
              <p className="text-xs text-slate-500">
                Crie tarefas discursivas e de produção ativa para os alunos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="atv-titulo" className="block text-xs font-semibold text-slate-700 mb-1">
              Título da Atividade *
            </label>
            <input
              id="atv-titulo"
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Roteiro Escrito da Self Presentation (3 minutos)"
              className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none transition-colors ${
                fieldErrors.titulo
                  ? "border-rose-300 focus:border-rose-500"
                  : "border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              }`}
            />
            {fieldErrors.titulo && (
              <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.titulo}</p>
            )}
          </div>

          {/* Instructions */}
          <div>
            <label htmlFor="atv-instrucoes" className="block text-xs font-semibold text-slate-700 mb-1">
              Instruções Pedagógicas Detalhadas *
            </label>
            <textarea
              id="atv-instrucoes"
              rows={4}
              required
              value={instrucoes}
              onChange={(e) => setInstrucoes(e.target.value)}
              placeholder="Descreva exatamente o que o aluno deve produzir, estrutura requerida, vocabulário a aplicar e critérios de correção..."
              className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none transition-colors resize-none ${
                fieldErrors.instrucoes
                  ? "border-rose-300 focus:border-rose-500"
                  : "border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              }`}
            />
            {fieldErrors.instrucoes && (
              <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.instrucoes}</p>
            )}
          </div>

          {/* Response Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tipo de Resposta do Aluno *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <label
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-semibold transition-all ${
                  tipo === "texto"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="tipoAtividade"
                  value="texto"
                  checked={tipo === "texto"}
                  onChange={() => setTipo("texto")}
                  className="sr-only"
                />
                <span>Resposta em Texto</span>
              </label>

              <label
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-semibold transition-all ${
                  tipo === "link"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="tipoAtividade"
                  value="link"
                  checked={tipo === "link"}
                  onChange={() => setTipo("link")}
                  className="sr-only"
                />
                <span>Envio de Link HTTPS</span>
              </label>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs flex items-center justify-between opacity-60 cursor-not-allowed">
                <span>Múltipla Escolha</span>
                <span className="text-[10px]">(Em breve)</span>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs flex items-center justify-between opacity-60 cursor-not-allowed">
                <span>Áudio Gravado</span>
                <span className="text-[10px]">(Em breve)</span>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs flex items-center justify-between opacity-60 cursor-not-allowed">
                <span>Gravação em Vídeo</span>
                <span className="text-[10px]">(Em breve)</span>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs flex items-center justify-between opacity-60 cursor-not-allowed">
                <span>Envio de Arquivo</span>
                <span className="text-[10px]">(Em breve)</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              * Nesta etapa, as respostas são exclusivamente por texto ou link externo HTTPS.
            </p>
          </div>

          {/* Related Material & Responsible Teacher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="atv-mat" className="block text-xs font-semibold text-slate-700 mb-1">
                Material Didático Relacionado (opcional)
              </label>
              <select
                id="atv-mat"
                value={materialRelacionadoId}
                onChange={(e) => setMaterialRelacionadoId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 bg-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">Nenhum material vinculado</option>
                {materiais.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.titulo} ({m.tipo.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="atv-prof" className="block text-xs font-semibold text-slate-700 mb-1">
                Professor Responsável pela Correção *
              </label>
              <select
                id="atv-prof"
                required
                value={professorId}
                onChange={(e) => setProfessorId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 bg-white focus:border-purple-500 focus:outline-none"
              >
                {professores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nomeCompleto} {p.status === "inativo" ? "(Inativo)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Destination */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              Destinatários da Atividade
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`flex items-center justify-center p-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                  destinoTipo === "turma"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="atvDestinoTipo"
                  value="turma"
                  checked={destinoTipo === "turma"}
                  onChange={() => setDestinoTipo("turma")}
                  className="sr-only"
                />
                <span>Turma</span>
              </label>

              <label
                className={`flex items-center justify-center p-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                  destinoTipo === "aluno"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="atvDestinoTipo"
                  value="aluno"
                  checked={destinoTipo === "aluno"}
                  onChange={() => setDestinoTipo("aluno")}
                  className="sr-only"
                />
                <span>Aluno Individual</span>
              </label>

              <label
                className={`flex items-center justify-center p-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                  destinoTipo === "geral"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="atvDestinoTipo"
                  value="geral"
                  checked={destinoTipo === "geral"}
                  onChange={() => {
                    setDestinoTipo("geral");
                    setDestinoId("");
                  }}
                  className="sr-only"
                />
                <span>Todos os Alunos</span>
              </label>
            </div>

            {destinoTipo === "turma" && (
              <div>
                <label htmlFor="atv-turma-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Selecione a Turma *
                </label>
                <select
                  id="atv-turma-select"
                  required
                  value={destinoId}
                  onChange={(e) => setDestinoId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 bg-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Selecione uma turma...</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.nivel} • {t.modalidade})
                    </option>
                  ))}
                </select>
                {fieldErrors.destinoId && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.destinoId}</p>
                )}
              </div>
            )}

            {destinoTipo === "aluno" && (
              <div>
                <label htmlFor="atv-aluno-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Selecione o Aluno *
                </label>
                <select
                  id="atv-aluno-select"
                  required
                  value={destinoId}
                  onChange={(e) => setDestinoId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 bg-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Selecione um aluno...</option>
                  {alunos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nomeCompleto} ({a.email})
                    </option>
                  ))}
                </select>
                {fieldErrors.destinoId && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.destinoId}</p>
                )}
              </div>
            )}
          </div>

          {/* Dates & Score Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="atv-data-pub" className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Publicação *
              </label>
              <input
                id="atv-data-pub"
                type="date"
                required
                value={dataPublicacao}
                onChange={(e) => setDataPublicacao(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="atv-prazo" className="block text-xs font-semibold text-slate-700 mb-1">
                Prazo de Entrega (opcional)
              </label>
              <input
                id="atv-prazo"
                type="datetime-local"
                value={prazoEntrega}
                onChange={(e) => setPrazoEntrega(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:outline-none"
              />
              {fieldErrors.prazoEntrega && (
                <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.prazoEntrega}</p>
              )}
            </div>

            <div>
              <label htmlFor="atv-pontos" className="block text-xs font-semibold text-slate-700 mb-1">
                Pontuação Máxima (opcional)
              </label>
              <input
                id="atv-pontos"
                type="number"
                min="1"
                max="100"
                value={pontuacaoMaxima}
                onChange={(e) => setPontuacaoMaxima(e.target.value)}
                placeholder="Ex: 10"
                className="w-full px-3 py-1.5 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Late Submissions Checkbox & Status */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2">
              <input
                id="atv-atraso"
                type="checkbox"
                checked={permitirAtraso}
                onChange={(e) => setPermitirAtraso(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="atv-atraso" className="text-xs font-medium text-slate-700 cursor-pointer">
                Permitir envio com atraso (marcado como &quot;Atrasada&quot;)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="atv-status" className="text-xs font-semibold text-slate-700">
                Status:
              </label>
              <select
                id="atv-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusAtividade)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 bg-white"
              >
                <option value="publicada">Publicada</option>
                <option value="agendada">Agendada</option>
                <option value="rascunho">Rascunho</option>
                <option value="encerrada">Encerrada</option>
              </select>
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <label htmlFor="atv-obs" className="block text-xs font-semibold text-slate-700 mb-1">
              Observações Pedagógicas Internas
            </label>
            <input
              id="atv-obs"
              type="text"
              value={observacoesInternas}
              onChange={(e) => setObservacoesInternas(e.target.value)}
              placeholder="Critérios esperados, gabarito interno de referência..."
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{atividadeParaEditar ? "Salvar Alterações" : "Criar Atividade"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
