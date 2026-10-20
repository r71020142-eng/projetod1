"use client";

import React, { useState, useEffect } from "react";
import {
  Avaliacao,
  TipoAvaliacao,
  StatusAvaliacao,
  DestinoTipo,
  QuestaoObjetiva,
  AlternativaQuestao,
  CriterioRubricaPratica,
  PoliticaExibicaoGabarito,
  Programa,
  Etapa,
  Modulo,
  Professor,
  Turma,
  Aluno,
} from "@/types";
import { validarQuestaoObjetiva, validarRubricaPratica } from "@/data/pedagogicoCalculos";
import {
  X,
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  BookOpen,
} from "lucide-react";

interface AvaliacaoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (avaliacao: Partial<Avaliacao>) => Promise<void>;
  avaliacaoParaEditar?: Avaliacao | null;
  temTentativasRegistradas?: boolean;
  programas: Programa[];
  etapas: Etapa[];
  modulos: Modulo[];
  professores: Professor[];
  turmas: Turma[];
  alunos: Aluno[];
}

export function AvaliacaoFormModal({
  isOpen,
  onClose,
  onSave,
  avaliacaoParaEditar,
  temTentativasRegistradas = false,
  programas,
  etapas,
  modulos,
  professores,
  turmas,
  alunos,
}: AvaliacaoFormModalProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<TipoAvaliacao>("objetiva");
  const [programaId, setProgramaId] = useState("");
  const [etapaId, setEtapaId] = useState("");
  const [moduloId, setModuloId] = useState("");
  const [professorId, setProfessorId] = useState("");
  const [destinoTipo, setDestinoTipo] = useState<DestinoTipo>("geral");
  const [destinoTurmaId, setDestinoTurmaId] = useState("");
  const [destinoAlunoId, setDestinoAlunoId] = useState("");
  const [status, setStatus] = useState<StatusAvaliacao>("publicada");
  const [prazo, setPrazo] = useState("");
  const [maxTentativas, setMaxTentativas] = useState(2);
  const [notaMaxima, setNotaMaxima] = useState(10);
  const [notaMinimaAprovacao, setNotaMinimaAprovacao] = useState(7);
  const [permitirEnvioAtrasado, setPermitirEnvioAtrasado] = useState(false);
  const [instrucoes, setInstrucoes] = useState("");

  // Config feedback e política de gabarito (Etapa 7 correção / Etapa 8)
  const [politicaGabarito, setPoliticaGabarito] = useState<PoliticaExibicaoGabarito>("gabarito_imediato");
  const [exibirNotaImediatamente, setExibirNotaImediatamente] = useState(true);
  const [exibirRespostasCorretas, setExibirRespostasCorretas] = useState(true);
  const [exibirExplicacao, setExibirExplicacao] = useState(true);

  // Objetiva
  const [questoes, setQuestoes] = useState<QuestaoObjetiva[]>([]);

  // Prática
  const [rubrica, setRubrica] = useState<CriterioRubricaPratica[]>([]);
  const [permitirTexto, setPermitirTexto] = useState(true);
  const [permitirLink, setPermitirLink] = useState(true);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (avaliacaoParaEditar) {
      setTitulo(avaliacaoParaEditar.titulo);
      setDescricao(avaliacaoParaEditar.descricao || "");
      setTipo(avaliacaoParaEditar.tipo);
      setProgramaId(avaliacaoParaEditar.programaId);
      setEtapaId(avaliacaoParaEditar.etapaId);
      setModuloId(avaliacaoParaEditar.moduloId);
      setProfessorId(avaliacaoParaEditar.professorId);
      setDestinoTipo(avaliacaoParaEditar.destinoTipo);
      setDestinoTurmaId(avaliacaoParaEditar.destinoTurmaId || "");
      setDestinoAlunoId(avaliacaoParaEditar.destinoAlunoId || "");
      setStatus(avaliacaoParaEditar.status);
      setPrazo(avaliacaoParaEditar.prazo || "");
      setMaxTentativas(avaliacaoParaEditar.maxTentativas || 1);
      setNotaMaxima(avaliacaoParaEditar.notaMaxima || 10);
      setNotaMinimaAprovacao(avaliacaoParaEditar.notaMinimaAprovacao || 7);
      setPermitirEnvioAtrasado(avaliacaoParaEditar.permitirEnvioAtrasado || false);
      setInstrucoes(avaliacaoParaEditar.instrucoes || "");
      setPoliticaGabarito(avaliacaoParaEditar.politicaGabarito || "gabarito_imediato");
      setExibirNotaImediatamente(avaliacaoParaEditar.configFeedback?.exibirNotaImediatamente ?? true);
      setExibirRespostasCorretas(avaliacaoParaEditar.configFeedback?.exibirRespostasCorretasAposEncerramento ?? true);
      setExibirExplicacao(avaliacaoParaEditar.configFeedback?.exibirExplicacaoAposEncerramento ?? true);
      setQuestoes(avaliacaoParaEditar.questoes ? JSON.parse(JSON.stringify(avaliacaoParaEditar.questoes)) : []);
      setRubrica(avaliacaoParaEditar.rubrica ? JSON.parse(JSON.stringify(avaliacaoParaEditar.rubrica)) : []);
      setPermitirTexto(avaliacaoParaEditar.permitirTexto ?? true);
      setPermitirLink(avaliacaoParaEditar.permitirLink ?? true);
    } else {
      setTitulo("");
      setDescricao("");
      setTipo("objetiva");
      setPoliticaGabarito("gabarito_imediato");
      setProgramaId(programas[0]?.id || "");
      setEtapaId(etapas[0]?.id || "");
      setModuloId(modulos[0]?.id || "");
      setProfessorId(professores[0]?.id || "");
      setDestinoTipo("geral");
      setDestinoTurmaId("");
      setDestinoAlunoId("");
      setStatus("publicada");
      setPrazo("");
      setMaxTentativas(2);
      setNotaMaxima(10);
      setNotaMinimaAprovacao(7);
      setPermitirEnvioAtrasado(false);
      setInstrucoes("");
      setExibirNotaImediatamente(true);
      setExibirRespostasCorretas(true);
      setExibirExplicacao(true);

      // Questão inicial para objetiva
      setQuestoes([
        {
          id: `q-${Date.now()}-1`,
          enunciado: "",
          alternativas: [
            { id: `alt-1`, texto: "", ordem: 1 },
            { id: `alt-2`, texto: "", ordem: 2 },
          ],
          alternativaCorretaId: "alt-1",
          pontos: 2.5,
          ordem: 1,
        },
      ]);

      // Rubrica inicial para prática
      setRubrica([
        {
          id: `cr-${Date.now()}-1`,
          nome: "Clareza e Fluência",
          descricao: "Capacidade de expressar ideias sem pausas excessivas",
          pontuacaoMaxima: 5,
          ordem: 1,
        },
        {
          id: `cr-${Date.now()}-2`,
          nome: "Gramática e Conectivos",
          descricao: "Estruturação adequada das orações",
          pontuacaoMaxima: 5,
          ordem: 2,
        },
      ]);
      setPermitirTexto(true);
      setPermitirLink(true);
    }
    setErro("");
    setLoading(false);
  }, [avaliacaoParaEditar, isOpen, programas, etapas, modulos, professores]);

  if (!isOpen) return null;

  // Filtragem de etapas por programa e módulos por etapa
  const etapasDisponiveis = programaId
    ? etapas.filter((e) => e.programaId === programaId)
    : etapas;
  const modulosDisponiveis = etapaId
    ? modulos.filter((m) => m.etapaId === etapaId)
    : modulos;

  // Gerenciamento de Questões Objetivas
  function handleAddQuestao() {
    const novaQ: QuestaoObjetiva = {
      id: `q-${Date.now()}-${questoes.length + 1}`,
      enunciado: "",
      alternativas: [
        { id: `alt-${Date.now()}-1`, texto: "", ordem: 1 },
        { id: `alt-${Date.now()}-2`, texto: "", ordem: 2 },
      ],
      alternativaCorretaId: `alt-${Date.now()}-1`,
      pontos: 2.5,
      ordem: questoes.length + 1,
    };
    setQuestoes([...questoes, novaQ]);
  }

  function handleRemoveQuestao(idx: number) {
    if (questoes.length <= 1) {
      alert("A avaliação objetiva deve ter pelo menos uma questão.");
      return;
    }
    setQuestoes(questoes.filter((_, i) => i !== idx));
  }

  function handleAddAlternativa(qIdx: number) {
    const q = questoes[qIdx];
    if (q.alternativas.length >= 6) {
      alert("Cada questão pode ter no máximo 6 alternativas.");
      return;
    }
    const altNova: AlternativaQuestao = {
      id: `alt-${Date.now()}-${q.alternativas.length + 1}`,
      texto: "",
      ordem: q.alternativas.length + 1,
    };
    const novasQuestoes = [...questoes];
    novasQuestoes[qIdx].alternativas.push(altNova);
    setQuestoes(novasQuestoes);
  }

  function handleRemoveAlternativa(qIdx: number, aIdx: number) {
    const q = questoes[qIdx];
    if (q.alternativas.length <= 2) {
      alert("Cada questão deve possuir no mínimo 2 alternativas.");
      return;
    }
    const altRemovida = q.alternativas[aIdx];
    const novasAlts = q.alternativas.filter((_, i) => i !== aIdx);
    const novasQuestoes = [...questoes];
    novasQuestoes[qIdx].alternativas = novasAlts;
    // Se a alternativa correta foi removida, define a primeira restante como correta
    if (q.alternativaCorretaId === altRemovida.id) {
      novasQuestoes[qIdx].alternativaCorretaId = novasAlts[0].id;
    }
    setQuestoes(novasQuestoes);
  }

  // Gerenciamento de Rubrica Prática
  function handleAddCriterio() {
    const novoC: CriterioRubricaPratica = {
      id: `cr-${Date.now()}-${rubrica.length + 1}`,
      nome: "",
      descricao: "",
      pontuacaoMaxima: 2.5,
      ordem: rubrica.length + 1,
    };
    setRubrica([...rubrica, novoC]);
  }

  function handleRemoveCriterio(idx: number) {
    if (rubrica.length <= 1) {
      alert("A avaliação prática deve conter ao menos um critério na rubrica.");
      return;
    }
    setRubrica(rubrica.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (!titulo.trim()) {
      setErro("O título da avaliação é obrigatório.");
      return;
    }
    if (!programaId || !etapaId || !moduloId) {
      setErro("Selecione o programa, a etapa e o módulo vinculados.");
      return;
    }
    if (!professorId) {
      setErro("Selecione o professor responsável.");
      return;
    }

    if (tipo === "objetiva") {
      if (questoes.length === 0) {
        setErro("Insira ao menos uma questão objetiva.");
        return;
      }
      for (let i = 0; i < questoes.length; i++) {
        const check = validarQuestaoObjetiva(questoes[i]);
        if (!check.isValid) {
          setErro(`Questão ${i + 1}: ${check.errors[0]}`);
          return;
        }
      }
    } else {
      if (rubrica.length === 0) {
        setErro("Insira ao menos um critério pedagógico na rubrica.");
        return;
      }
      const check = validarRubricaPratica(rubrica);
      if (!check.isValid) {
        setErro(`Rubrica: ${check.errors[0]}`);
        return;
      }
      if (!permitirTexto && !permitirLink) {
        setErro("Habilite envio de texto ou link externo na avaliação prática.");
        return;
      }
    }

    setLoading(true);
    try {
      const professor = professores.find((p) => p.id === professorId);

      await onSave({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        tipo,
        programaId,
        etapaId,
        moduloId,
        professorId,
        professorNome: professor?.nomeCompleto || "Professor MTD",
        destinoTipo,
        destinoTurmaId: destinoTipo === "turma" ? destinoTurmaId : undefined,
        destinoAlunoId: destinoTipo === "aluno" ? destinoAlunoId : undefined,
        status,
        prazo: prazo || undefined,
        maxTentativas: Number(maxTentativas) || 1,
        notaMaxima: Number(notaMaxima) || 10,
        notaMinimaAprovacao: Number(notaMinimaAprovacao) || 7,
        permitirEnvioAtrasado: Boolean(permitirEnvioAtrasado),
        instrucoes: instrucoes.trim(),
        politicaGabarito: tipo === "objetiva" ? politicaGabarito : undefined,
        configFeedback: {
          exibirNotaImediatamente: Boolean(exibirNotaImediatamente),
          exibirRespostasCorretasAposEncerramento: Boolean(exibirRespostasCorretas),
          exibirExplicacaoAposEncerramento: Boolean(exibirExplicacao),
        },
        questoes: tipo === "objetiva" ? questoes : undefined,
        rubrica: tipo === "pratica" ? rubrica : undefined,
        permitirTexto: tipo === "pratica" ? permitirTexto : undefined,
        permitirLink: tipo === "pratica" ? permitirLink : undefined,
      });

      onClose();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar avaliação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <FileText className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="font-semibold text-lg">
                {avaliacaoParaEditar ? `Editar Avaliação (v${avaliacaoParaEditar.versao})` : "Nova Avaliação"}
              </h2>
              <p className="text-xs text-slate-500">
                {tipo === "objetiva"
                  ? "Testes objetivos com correção automática de múltipla escolha"
                  : "Avaliação prática de produção textual ou oral com correção humana"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {erro && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {temTentativasRegistradas && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
              <div>
                <strong>Atenção:</strong> Esta avaliação já possui tentativas de alunos registradas. Alterações na estrutura das questões ou rubrica podem comprometer o histórico. Para grandes mudanças pedagógicas, recomenda-se duplicar em uma nova versão (v2, v3).
              </div>
            </div>
          )}

          {/* Dados Principais */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              1. Dados Gerais e Vínculo Pedagógico
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Título da Avaliação *
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Checkpoint 1 — Rotinas e Conexões Diárias"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Tipo de Avaliação *
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoAvaliacao)}
                  disabled={Boolean(avaliacaoParaEditar)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm disabled:bg-slate-100"
                >
                  <option value="objetiva">Objetiva (Múltipla Escolha)</option>
                  <option value="pratica">Prática (Correção Humana)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Programa *
                </label>
                <select
                  value={programaId}
                  onChange={(e) => {
                    setProgramaId(e.target.value);
                    const etapasFiltradas = etapas.filter((et) => et.programaId === e.target.value);
                    setEtapaId(etapasFiltradas[0]?.id || "");
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                >
                  {programas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Etapa *
                </label>
                <select
                  value={etapaId}
                  onChange={(e) => {
                    setEtapaId(e.target.value);
                    const mods = modulos.filter((m) => m.etapaId === e.target.value);
                    setModuloId(mods[0]?.id || "");
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                >
                  {etapasDisponiveis.map((et) => (
                    <option key={et.id} value={et.id}>
                      {et.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Módulo Vinculado *
                </label>
                <select
                  value={moduloId}
                  onChange={(e) => setModuloId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                >
                  {modulosDisponiveis.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Descrição Curta
              </label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Verificação prática de vocabulário e estruturas de conexão."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Instruções Gerais para o Aluno
              </label>
              <textarea
                rows={2}
                value={instrucoes}
                onChange={(e) => setInstrucoes(e.target.value)}
                placeholder="Explique o que é esperado do aluno, tempo sugerido ou recomendações..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
              />
            </div>
          </div>

          {/* Configuração Operacional */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              2. Destino, Prazos e Critérios
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Professor Responsável *
                </label>
                <select
                  value={professorId}
                  onChange={(e) => setProfessorId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                >
                  {professores.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.nomeCompleto}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Destinatários
                </label>
                <select
                  value={destinoTipo}
                  onChange={(e) => setDestinoTipo(e.target.value as DestinoTipo)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                >
                  <option value="geral">Todos os Alunos do Módulo</option>
                  <option value="turma">Turma Específica</option>
                  <option value="aluno">Aluno Específico</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusAvaliacao)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                >
                  <option value="publicada">Publicada (Disponível)</option>
                  <option value="rascunho">Rascunho</option>
                  <option value="agendada">Agendada</option>
                  <option value="encerrada">Encerrada</option>
                  <option value="arquivada">Arquivada</option>
                </select>
              </div>
            </div>

            {destinoTipo === "turma" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Selecione a Turma
                </label>
                <select
                  value={destinoTurmaId}
                  onChange={(e) => setDestinoTurmaId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                >
                  <option value="">Selecione...</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.modalidade})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {destinoTipo === "aluno" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Selecione o Aluno
                </label>
                <select
                  value={destinoAlunoId}
                  onChange={(e) => setDestinoAlunoId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                >
                  <option value="">Selecione...</option>
                  {alunos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nomeCompleto} ({a.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Data Limite / Prazo
                </label>
                <input
                  type="date"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Máx. Tentativas
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxTentativas}
                  onChange={(e) => setMaxTentativas(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nota Máxima
                </label>
                <input
                  type="number"
                  min={1}
                  value={notaMaxima}
                  onChange={(e) => setNotaMaxima(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Mín. Aprovação
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={notaMaxima}
                  value={notaMinimaAprovacao}
                  onChange={(e) => setNotaMinimaAprovacao(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={permitirEnvioAtrasado}
                  onChange={(e) => setPermitirEnvioAtrasado(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Permitir envio com atraso (marcado como atrasado)
              </label>

              {tipo === "objetiva" && (
                <div className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Política de Exibição do Gabarito e Explicações *
                  </label>
                  <p className="text-xs text-slate-500">
                    Define quando o aluno tem acesso às respostas corretas e comentários pedagógicos (nunca exibido durante a tentativa ativa).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <label className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${politicaGabarito === "gabarito_imediato" ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                      <input
                        type="radio"
                        name="politicaGabarito"
                        value="gabarito_imediato"
                        checked={politicaGabarito === "gabarito_imediato"}
                        onChange={() => setPoliticaGabarito("gabarito_imediato")}
                        className="sr-only"
                      />
                      <div className="font-bold text-slate-900 mb-0.5">Gabarito Imediato</div>
                      <div className="text-[11px] text-slate-500 font-normal">Mostra nota, respostas corretas e explicações logo após o envio do aluno.</div>
                    </label>

                    <label className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${politicaGabarito === "nota_imediata" ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                      <input
                        type="radio"
                        name="politicaGabarito"
                        value="nota_imediata"
                        checked={politicaGabarito === "nota_imediata"}
                        onChange={() => setPoliticaGabarito("nota_imediata")}
                        className="sr-only"
                      />
                      <div className="font-bold text-slate-900 mb-0.5">Nota Imediata</div>
                      <div className="text-[11px] text-slate-500 font-normal">Mostra somente a nota e resultado. Respostas corretas e explicações nunca são reveladas.</div>
                    </label>

                    <label className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${politicaGabarito === "gabarito_apos_encerramento" ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                      <input
                        type="radio"
                        name="politicaGabarito"
                        value="gabarito_apos_encerramento"
                        checked={politicaGabarito === "gabarito_apos_encerramento"}
                        onChange={() => setPoliticaGabarito("gabarito_apos_encerramento")}
                        className="sr-only"
                      />
                      <div className="font-bold text-slate-900 mb-0.5">Após Encerramento</div>
                      <div className="text-[11px] text-slate-500 font-normal">Mostra a nota imediatamente, mas libera respostas corretas somente após o encerramento da avaliação.</div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Builder de Conteúdo */}
          {tipo === "objetiva" ? (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    3. Banco de Questões de Múltipla Escolha ({questoes.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina o enunciado, as alternativas (2 a 6) e assinale a única correta.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddQuestao}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Questão
                </button>
              </div>

              <div className="space-y-6">
                {questoes.map((q, qIdx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        Questão {qIdx + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span>Pontos:</span>
                          <input
                            type="number"
                            step="0.5"
                            min={0.5}
                            value={q.pontos}
                            onChange={(e) => {
                              const novas = [...questoes];
                              novas[qIdx].pontos = Number(e.target.value) || 1;
                              setQuestoes(novas);
                            }}
                            className="w-16 px-2 py-0.5 rounded border border-slate-300 text-xs text-center"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestao(qIdx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                          title="Remover questão"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Enunciado da Questão *
                      </label>
                      <textarea
                        rows={2}
                        value={q.enunciado}
                        onChange={(e) => {
                          const novas = [...questoes];
                          novas[qIdx].enunciado = e.target.value;
                          setQuestoes(novas);
                        }}
                        placeholder="Ex: Choose the correct preposition: She has been working here ___ 2021."
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        required
                      />
                    </div>

                    {/* Alternativas */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="font-semibold">Alternativas (selecione a correta):</span>
                        {q.alternativas.length < 6 && (
                          <button
                            type="button"
                            onClick={() => handleAddAlternativa(qIdx)}
                            className="text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            + Alternativa
                          </button>
                        )}
                      </div>

                      {q.alternativas.map((alt, aIdx) => (
                        <div key={alt.id} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correta-${q.id}`}
                            checked={q.alternativaCorretaId === alt.id}
                            onChange={() => {
                              const novas = [...questoes];
                              novas[qIdx].alternativaCorretaId = alt.id;
                              setQuestoes(novas);
                            }}
                            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 shrink-0"
                            title="Marcar como correta"
                          />
                          <input
                            type="text"
                            value={alt.texto}
                            onChange={(e) => {
                              const novas = [...questoes];
                              novas[qIdx].alternativas[aIdx].texto = e.target.value;
                              setQuestoes(novas);
                            }}
                            placeholder={`Alternativa ${String.fromCharCode(65 + aIdx)}`}
                            className={`flex-1 px-3 py-1.5 rounded-lg border text-sm ${
                              q.alternativaCorretaId === alt.id
                                ? "border-emerald-400 bg-emerald-50/30"
                                : "border-slate-300"
                            }`}
                            required
                          />
                          {q.alternativaCorretaId === alt.id && (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                              Correta
                            </span>
                          )}
                          {q.alternativas.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAlternativa(qIdx, aIdx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Excluir alternativa"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Explicação Pedagógica (opcional)
                      </label>
                      <input
                        type="text"
                        value={q.explicacao || ""}
                        onChange={(e) => {
                          const novas = [...questoes];
                          novas[qIdx].explicacao = e.target.value;
                          setQuestoes(novas);
                        }}
                        placeholder="Ex: 'Since' é usado para pontos fixos no tempo, enquanto 'for' indica duração."
                        className="w-full px-3 py-1 rounded-lg border border-slate-200 text-xs text-slate-700"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Prática - Rubrica */
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    3. Rubrica Pedagógica de Correção ({rubrica.length} critérios)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Critérios avaliados pelo professor com pontuação e orientações.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddCriterio}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Critério
                </button>
              </div>

              <div className="flex gap-4 p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-purple-900">
                  <input
                    type="checkbox"
                    checked={permitirTexto}
                    onChange={(e) => setPermitirTexto(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  Permitir envio de texto / redação
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-purple-900">
                  <input
                    type="checkbox"
                    checked={permitirLink}
                    onChange={(e) => setPermitirLink(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  Permitir envio de link externo (Áudio/Vídeo HTTPS)
                </label>
              </div>

              <div className="space-y-4">
                {rubrica.map((cr, cIdx) => (
                  <div
                    key={cr.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                        Critério {cIdx + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span>Pontos Máx:</span>
                          <input
                            type="number"
                            step="0.5"
                            min={0.5}
                            value={cr.pontuacaoMaxima}
                            onChange={(e) => {
                              const novas = [...rubrica];
                              novas[cIdx].pontuacaoMaxima = Number(e.target.value) || 1;
                              setRubrica(novas);
                            }}
                            className="w-16 px-2 py-0.5 rounded border border-slate-300 text-xs text-center"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCriterio(cIdx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Nome do Critério *
                        </label>
                        <input
                          type="text"
                          value={cr.nome}
                          onChange={(e) => {
                            const novas = [...rubrica];
                            novas[cIdx].nome = e.target.value;
                            setRubrica(novas);
                          }}
                          placeholder="Ex: Precisão Gramatical e Vocabulário"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Descrição / O que observar
                        </label>
                        <input
                          type="text"
                          value={cr.descricao}
                          onChange={(e) => {
                            const novas = [...rubrica];
                            novas[cIdx].descricao = e.target.value;
                            setRubrica(novas);
                          }}
                          placeholder="Ex: Uso adequado dos tempos verbais de passado."
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition"
            >
              {loading ? "Salvando..." : "Salvar Avaliação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
