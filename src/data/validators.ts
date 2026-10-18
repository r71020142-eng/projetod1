import {
  Aluno,
  Professor,
  Turma,
  Aula,
  FormValidationResult,
  NivelAluno,
  NivelTurma,
  ModalidadeTurma,
  StatusCadastro,
  StatusTurma,
  StatusAula,
  ConflitoHorario,
  FrequenciaCalculada,
  Material,
  Atividade,
  ConteudoDiario,
  SelfPresentation,
  AvaliacaoPedagogica,
  RubricaPedagogica,
  SolicitacaoReenvio,
  Baralho,
  Cartao,
  ItemImportacaoCSV,
} from "@/types";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const HTTPS_URL_REGEX = /^https:\/\/[^\s$.?#].[^\s]*$/i;

/**
 * Validação robusta de URL externa HTTPS utilizando o parser nativo URL,
 * evitando depender unicamente de expressões regulares.
 */
export function isValidHttpsUrl(urlString?: string | null): boolean {
  if (!urlString || typeof urlString !== "string") return false;
  try {
    const trimmed = urlString.trim();
    if (trimmed.length < 8) return false;
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === "https:" &&
      Boolean(parsed.hostname) &&
      parsed.hostname.includes(".") &&
      !parsed.hostname.startsWith(".") &&
      !parsed.hostname.endsWith(".")
    );
  } catch {
    return false;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

// ==========================================
// VALIDAÇÃO DE ALUNO
// ==========================================
export function validateAlunoInput(
  input: {
    nomeCompleto?: string;
    email?: string;
    telefone?: string;
    objetivoIngles?: string;
    nivel?: NivelAluno;
    status?: StatusCadastro;
    observacoesPedagogicas?: string;
  },
  currentId?: string,
  existingList: Aluno[] = []
): FormValidationResult<Aluno> {
  const errors: Partial<Record<keyof Aluno, string>> = {};

  const nome = normalizeText(input.nomeCompleto || "");
  if (!nome) {
    errors.nomeCompleto = "O nome completo é obrigatório.";
  } else if (nome.length < 3) {
    errors.nomeCompleto = "O nome completo deve conter no mínimo 3 caracteres.";
  }

  const email = normalizeEmail(input.email || "");
  if (!email) {
    errors.email = "O e-mail é obrigatório.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Insira um endereço de e-mail válido (ex.: usuario@dominio.com).";
  } else {
    const isDuplicate = existingList.some(
      (a) => a.id !== currentId && normalizeEmail(a.email) === email
    );
    if (isDuplicate) {
      errors.email = "Este e-mail já está cadastrado para outro aluno.";
    }
  }

  const objetivo = normalizeText(input.objetivoIngles || "");
  if (!objetivo) {
    errors.objetivoIngles = "O objetivo com o inglês é obrigatório.";
  } else if (objetivo.length < 5) {
    errors.objetivoIngles = "Descreva o objetivo com pelo menos 5 caracteres.";
  }

  const validNiveis: NivelAluno[] = [
    "nao_avaliado",
    "A1",
    "A2",
    "B1",
    "B2",
    "C1",
    "C2",
  ];
  if (!input.nivel || !validNiveis.includes(input.nivel)) {
    errors.nivel = "Selecione um nível válido para o aluno.";
  }

  if (input.status !== "ativo" && input.status !== "inativo") {
    errors.status = "Selecione um status válido (ativo ou inativo).";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ==========================================
// VALIDAÇÃO DE PROFESSOR
// ==========================================
export function validateProfessorInput(
  input: {
    nomeCompleto?: string;
    email?: string;
    telefone?: string;
    biografiaCurta?: string;
    idiomasFalados?: string[];
    status?: StatusCadastro;
  },
  currentId?: string,
  existingList: Professor[] = []
): FormValidationResult<Professor> {
  const errors: Partial<Record<keyof Professor, string>> = {};

  const nome = normalizeText(input.nomeCompleto || "");
  if (!nome) {
    errors.nomeCompleto = "O nome completo é obrigatório.";
  } else if (nome.length < 3) {
    errors.nomeCompleto = "O nome completo deve conter no mínimo 3 caracteres.";
  }

  const email = normalizeEmail(input.email || "");
  if (!email) {
    errors.email = "O e-mail é obrigatório.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Insira um endereço de e-mail válido (ex.: professor@mtd.com).";
  } else {
    const isDuplicate = existingList.some(
      (p) => p.id !== currentId && normalizeEmail(p.email) === email
    );
    if (isDuplicate) {
      errors.email = "Este e-mail já está cadastrado para outro professor.";
    }
  }

  const bio = normalizeText(input.biografiaCurta || "");
  if (!bio) {
    errors.biografiaCurta = "A biografia pedagógica curta é obrigatória.";
  } else if (bio.length < 10) {
    errors.biografiaCurta = "A biografia deve conter pelo menos 10 caracteres.";
  }

  const idiomas = (input.idiomasFalados || [])
    .map((i) => i.trim())
    .filter(Boolean);
  if (idiomas.length === 0) {
    errors.idiomasFalados = "Informe pelo menos um idioma falado pelo professor.";
  }

  if (input.status !== "ativo" && input.status !== "inativo") {
    errors.status = "Selecione um status válido (ativo ou inativo).";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ==========================================
// VALIDAÇÃO DE TURMA
// ==========================================
export function validateTurmaInput(
  input: {
    nome?: string;
    modalidade?: ModalidadeTurma;
    nivel?: NivelTurma;
    objetivoPrincipal?: string;
    professorId?: string;
    alunoIds?: string[];
    capacidade?: number;
    status?: StatusTurma;
    dataInicio?: string;
    observacoes?: string;
  },
  professores: Professor[],
  alunos: Aluno[],
  currentTurma?: Turma | null
): FormValidationResult<Turma> {
  const errors: Partial<Record<keyof Turma, string>> = {};

  // Nome da turma
  const nome = normalizeText(input.nome || "");
  if (!nome) {
    errors.nome = "O nome da turma é obrigatório.";
  } else if (nome.length < 3) {
    errors.nome = "O nome da turma deve ter pelo menos 3 caracteres.";
  }

  // Modalidade
  if (input.modalidade !== "individual" && input.modalidade !== "grupo") {
    errors.modalidade = "Selecione uma modalidade válida (Individual ou Grupo).";
  }

  // Nível
  const validNiveis: NivelTurma[] = [
    "nao_definido",
    "A1",
    "A2",
    "B1",
    "B2",
    "C1",
    "C2",
  ];
  if (!input.nivel || !validNiveis.includes(input.nivel)) {
    errors.nivel = "Selecione um nível válido.";
  }

  // Objetivo principal
  const objetivo = normalizeText(input.objetivoPrincipal || "");
  if (!objetivo) {
    errors.objetivoPrincipal = "O objetivo principal da turma é obrigatório.";
  } else if (objetivo.length < 5) {
    errors.objetivoPrincipal = "Descreva o objetivo com pelo menos 5 caracteres.";
  }

  // Professor responsável
  if (!input.professorId) {
    errors.professorId = "Selecione o professor responsável pela turma.";
  } else {
    const prof = professores.find((p) => p.id === input.professorId);
    if (!prof) {
      errors.professorId = "O professor selecionado não foi encontrado.";
    } else {
      // If it's a new assignment, professor must be active
      const isNewAssignment = !currentTurma || currentTurma.professorId !== input.professorId;
      if (isNewAssignment && prof.status !== "ativo") {
        errors.professorId = `O professor "${prof.nomeCompleto}" está inativo. Apenas professores ativos podem ser responsáveis por novas turmas.`;
      }
    }
  }

  // Capacidade
  const capacidade = input.capacidade ?? (input.modalidade === "individual" ? 1 : 6);
  if (input.modalidade === "individual") {
    if (capacidade !== 1) {
      errors.capacidade = "Turmas individuais aceitam rigorosamente capacidade máxima de 1 aluno.";
    }
  } else {
    if (capacidade < 1) {
      errors.capacidade = "A capacidade planejada deve ser de pelo menos 1 aluno.";
    }
  }

  // Alunos matriculados
  const alunoIds = input.alunoIds || [];
  // Check duplicates in same class
  const uniqueAlunoIds = new Set(alunoIds);
  if (uniqueAlunoIds.size !== alunoIds.length) {
    errors.alunoIds = "Não é permitido cadastrar o mesmo aluno duas vezes na mesma turma.";
  }

  // Check individual limit
  if (input.modalidade === "individual" && alunoIds.length > 1) {
    errors.alunoIds = "Turma individual aceita no máximo 1 aluno matriculado.";
  }

  // Check group capacity
  if (input.modalidade === "grupo" && alunoIds.length > capacidade) {
    errors.alunoIds = `A quantidade de alunos (${alunoIds.length}) excede a capacidade planejada (${capacidade}).`;
  }

  // Check that newly enrolled students are active
  const existingEnrolled = new Set(currentTurma?.alunoIds || []);
  for (const aId of alunoIds) {
    if (!existingEnrolled.has(aId)) {
      const aluno = alunos.find((a) => a.id === aId);
      if (!aluno) {
        errors.alunoIds = `Aluno com ID ${aId} não foi encontrado.`;
        break;
      } else if (aluno.status !== "ativo") {
        errors.alunoIds = `O discente "${aluno.nomeCompleto}" está inativo. Apenas alunos com matrícula ativa podem ser vinculados a turmas.`;
        break;
      }
    }
  }

  // Status
  const validStatus: StatusTurma[] = ["formacao", "ativa", "pausada", "encerrada"];
  if (!input.status || !validStatus.includes(input.status)) {
    errors.status = "Selecione um status de turma válido.";
  }

  // Data de início
  if (!input.dataInicio) {
    errors.dataInicio = "A data de início da turma é obrigatória.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ==========================================
// VALIDAÇÃO DE AULA
// ==========================================
export function validateAulaInput(input: {
  turmaId?: string;
  titulo?: string;
  data?: string;
  horario?: string;
  duracaoMinutos?: number;
  meetingUrl?: string;
  status?: StatusAula;
}): FormValidationResult<Aula> {
  const errors: Partial<Record<keyof Aula, string>> = {};

  if (!input.turmaId) {
    errors.turmaId = "Selecione a turma vinculada à aula.";
  }

  const titulo = normalizeText(input.titulo || "");
  if (!titulo) {
    errors.titulo = "O título ou tema da aula é obrigatório.";
  } else if (titulo.length < 3) {
    errors.titulo = "O tema deve conter pelo menos 3 caracteres.";
  }

  if (!input.data) {
    errors.data = "A data da aula é obrigatória.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.data)) {
    errors.data = "A data deve estar no formato AAAA-MM-DD.";
  }

  if (!input.horario) {
    errors.horario = "O horário de início é obrigatório.";
  } else if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(input.horario)) {
    errors.horario = "Horário inválido. Use o formato HH:mm (ex.: 19:30).";
  }

  if (!input.duracaoMinutos || input.duracaoMinutos <= 0) {
    errors.duracaoMinutos = "A duração deve ser maior que zero minutos.";
  }

  if (input.meetingUrl && input.meetingUrl.trim()) {
    const url = input.meetingUrl.trim();
    if (!isValidHttpsUrl(url)) {
      errors.meetingUrl = "O link da aula deve ser uma URL externa HTTPS válida (ex.: https://zoom.us/j/123456789).";
    }
  }

  const validStatus: StatusAula[] = ["agendada", "concluida", "cancelada"];
  if (!input.status || !validStatus.includes(input.status)) {
    errors.status = "Status de aula inválido.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ==========================================
// DETECÇÃO DE CONFLITOS DE HORÁRIO
// ==========================================
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function checkConflitosHorario(
  candidateAula: {
    id?: string;
    turmaId: string;
    professorId: string;
    data: string; // YYYY-MM-DD
    horario: string; // HH:mm
    duracaoMinutos: number;
    status: StatusAula;
  },
  todasAulas: Aula[],
  todasTurmas: Turma[],
  todosProfessores: Professor[],
  todosAlunos: Aluno[]
): ConflitoHorario[] {
  // Aulas canceladas não geram conflito
  if (candidateAula.status === "cancelada") {
    return [];
  }

  const conflitos: ConflitoHorario[] = [];

  const candidateTurma = todasTurmas.find((t) => t.id === candidateAula.turmaId);
  const candidateAlunosIds = candidateTurma?.alunoIds || [];

  const startA = timeToMinutes(candidateAula.horario);
  const endA = startA + candidateAula.duracaoMinutos;

  // Compare with other non-cancelled classes on the exact same date
  const aulasNoMesmoDia = todasAulas.filter(
    (a) =>
      a.id !== candidateAula.id &&
      a.status !== "cancelada" &&
      a.data === candidateAula.data
  );

  for (const existingAula of aulasNoMesmoDia) {
    const startB = timeToMinutes(existingAula.horario);
    const endB = startB + existingAula.duracaoMinutos;

    // Overlap condition: startA < endB && startB < endA
    const isOverlapping = startA < endB && startB < endA;
    if (!isOverlapping) continue;

    const existingTurma = todasTurmas.find((t) => t.id === existingAula.turmaId);
    const turmaNome = existingTurma?.nome || "Turma desconhecida";

    // 1. Conflito de Professor
    if (existingAula.professorId === candidateAula.professorId) {
      const prof = todosProfessores.find((p) => p.id === candidateAula.professorId);
      const profNome = prof?.nomeCompleto || "Professor";
      conflitos.push({
        tipo: "professor",
        pessoaId: candidateAula.professorId,
        pessoaNome: profNome,
        nomeEnvolvido: profNome,
        aulaExistenteTitulo: existingAula.titulo,
        turmaNome,
        horarioExistente: existingAula.horario,
        horarioFimExistente: formatMinutesToTime(endB),
        aulaConflitante: {
          id: existingAula.id,
          titulo: existingAula.titulo,
          turmaNome,
          data: existingAula.data,
          horario: existingAula.horario,
          duracaoMinutos: existingAula.duracaoMinutos,
        },
        mensagem: `Conflito de agenda: O professor ${profNome} já possui a aula "${existingAula.titulo}" (${turmaNome}) das ${existingAula.horario} às ${formatMinutesToTime(endB)}.`,
      });
    }

    // 2. Conflito de Alunos matriculados
    const existingAlunosIds = existingTurma?.alunoIds || [];
    const sharedAlunos = candidateAlunosIds.filter((alunoId) =>
      existingAlunosIds.includes(alunoId)
    );

    for (const alunoId of sharedAlunos) {
      const aluno = todosAlunos.find((a) => a.id === alunoId);
      const alunoNome = aluno?.nomeCompleto || "Aluno";
      conflitos.push({
        tipo: "aluno",
        pessoaId: alunoId,
        pessoaNome: alunoNome,
        nomeEnvolvido: alunoNome,
        aulaExistenteTitulo: existingAula.titulo,
        turmaNome,
        horarioExistente: existingAula.horario,
        horarioFimExistente: formatMinutesToTime(endB),
        aulaConflitante: {
          id: existingAula.id,
          titulo: existingAula.titulo,
          turmaNome,
          data: existingAula.data,
          horario: existingAula.horario,
          duracaoMinutos: existingAula.duracaoMinutos,
        },
        mensagem: `Conflito de agenda: O discente ${alunoNome} já está matriculado na aula "${existingAula.titulo}" (${turmaNome}) agendada das ${existingAula.horario} às ${formatMinutesToTime(endB)}.`,
      });
    }
  }

  return conflitos;
}

export function formatMinutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ==========================================
// CÁLCULO DE FREQUÊNCIA
// ==========================================
export function calcularFrequencia(
  alunoId: string,
  aulas: Aula[]
): FrequenciaCalculada {
  // Only classes that are "concluida"
  const aulasConcluidas = aulas.filter((a) => a.status === "concluida");

  let presentes = 0;
  let ausentes = 0;
  let justificados = 0;
  let naoRegistrados = 0;

  for (const aula of aulasConcluidas) {
    const reg = aula.presencas?.[alunoId];
    if (!reg || reg.status === "nao_registrado") {
      naoRegistrados++;
    } else if (reg.status === "presente") {
      presentes++;
    } else if (reg.status === "ausente") {
      ausentes++;
    } else if (reg.status === "justificado") {
      justificados++;
    }
  }

  const baseCalculo = presentes + ausentes;
  const porcentagem =
    baseCalculo > 0 ? Math.round((presentes / baseCalculo) * 100) : null;

  return {
    totalAulasConcluidas: aulasConcluidas.length,
    presentes,
    ausentes,
    justificados,
    naoRegistrados,
    porcentagem,
    formulaExplicativa:
      "Fórmula de Frequência: (Presenças ÷ (Presenças + Ausências)) × 100. Faltas justificadas são registradas separadamente e não reduzem o índice percentual.",
  };
}

export function calcularFrequenciaTurma(
  turmaId: string,
  aulas: Aula[]
): FrequenciaCalculada {
  const aulasConcluidas = aulas.filter(
    (a) => a.turmaId === turmaId && a.status === "concluida"
  );

  let presentes = 0;
  let ausentes = 0;
  let justificados = 0;
  let naoRegistrados = 0;

  for (const aula of aulasConcluidas) {
    if (aula.presencas) {
      for (const reg of Object.values(aula.presencas)) {
        if (reg.status === "presente") presentes++;
        else if (reg.status === "ausente") ausentes++;
        else if (reg.status === "justificado") justificados++;
        else if (reg.status === "nao_registrado") naoRegistrados++;
      }
    }
  }

  const baseCalculo = presentes + ausentes;
  const porcentagem =
    baseCalculo > 0 ? Math.round((presentes / baseCalculo) * 100) : null;

  return {
    totalAulasConcluidas: aulasConcluidas.length,
    presentes,
    ausentes,
    justificados,
    naoRegistrados,
    porcentagem,
    formulaExplicativa:
      "Frequência Global da Turma: (Total de Presenças ÷ (Presenças + Faltas)) × 100.",
  };
}

// ==========================================
// ETAPA 4: VALIDAÇÕES DE MATERIAIS
// ==========================================
export function validateMaterialInput(dados: Partial<Material>): FormValidationResult {
  const errors: Record<string, string> = {};

  if (!dados.titulo || dados.titulo.trim().length < 3) {
    errors.titulo = "O título do material deve ter pelo menos 3 caracteres.";
  } else if (dados.titulo.trim().length > 150) {
    errors.titulo = "O título não pode ultrapassar 150 caracteres.";
  }

  if (!dados.descricao || dados.descricao.trim().length < 5) {
    errors.descricao = "A descrição deve ter pelo menos 5 caracteres.";
  } else if (dados.descricao.trim().length > 1000) {
    errors.descricao = "A descrição não pode ultrapassar 1000 caracteres.";
  }

  if (!dados.tipo) {
    errors.tipo = "Selecione o tipo do material.";
  }

  if (!dados.categoria || dados.categoria.trim().length === 0) {
    errors.categoria = "Informe a categoria pedagógica.";
  }

  if (!dados.nivelRecomendado) {
    errors.nivelRecomendado = "Selecione o nível recomendado.";
  }

  if (!dados.autorId || dados.autorId.trim().length === 0) {
    errors.autorId = "Informe o responsável pelo material.";
  }

  if (!dados.status) {
    errors.status = "Selecione o status do material.";
  }

  if (!dados.destinoTipo) {
    errors.destinoTipo = "Selecione o destino do material.";
  } else if (dados.destinoTipo !== "geral" && (!dados.destinoId || dados.destinoId.trim().length === 0)) {
    errors.destinoId = dados.destinoTipo === "turma" ? "Selecione a turma destinatária." : "Selecione o aluno destinatário.";
  }

  if (dados.linkExterno && dados.linkExterno.trim().length > 0) {
    if (!isValidHttpsUrl(dados.linkExterno.trim())) {
      errors.linkExterno = "O link deve ser uma URL externa válida com protocolo https://.";
    }
  }

  if (dados.status === "agendado" && !dados.dataPublicacao) {
    errors.dataPublicacao = "Informe a data programada para publicação do material.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ==========================================
// ETAPA 4: VALIDAÇÕES DE ATIVIDADES
// ==========================================
export function validateAtividadeInput(dados: Partial<Atividade>): FormValidationResult {
  const errors: Record<string, string> = {};

  if (!dados.titulo || dados.titulo.trim().length < 3) {
    errors.titulo = "O título da atividade deve ter pelo menos 3 caracteres.";
  } else if (dados.titulo.trim().length > 150) {
    errors.titulo = "O título não pode ultrapassar 150 caracteres.";
  }

  if (!dados.instrucoes || dados.instrucoes.trim().length < 10) {
    errors.instrucoes = "As instruções devem conter pelo menos 10 caracteres explicativos.";
  } else if (dados.instrucoes.trim().length > 3000) {
    errors.instrucoes = "As instruções não podem ultrapassar 3000 caracteres.";
  }

  if (!dados.tipo) {
    errors.tipo = "Selecione o tipo de resposta da atividade.";
  }

  if (!dados.professorId || dados.professorId.trim().length === 0) {
    errors.professorId = "Selecione o professor responsável.";
  }

  if (!dados.dataPublicacao || dados.dataPublicacao.trim().length === 0) {
    errors.dataPublicacao = "Informe a data de publicação.";
  }

  if (!dados.status) {
    errors.status = "Selecione o status da atividade.";
  }

  if (!dados.destinoTipo) {
    errors.destinoTipo = "Selecione o destino da atividade.";
  } else if (dados.destinoTipo !== "geral" && (!dados.destinoId || dados.destinoId.trim().length === 0)) {
    errors.destinoId = dados.destinoTipo === "turma" ? "Selecione a turma vinculada." : "Selecione o aluno vinculado.";
  }

  if (dados.pontuacaoMaxima !== undefined && dados.pontuacaoMaxima !== null) {
    if (isNaN(Number(dados.pontuacaoMaxima)) || Number(dados.pontuacaoMaxima) <= 0 || Number(dados.pontuacaoMaxima) > 100) {
      errors.pontuacaoMaxima = "A pontuação máxima deve ser um número entre 1 e 100.";
    }
  }

  if (dados.prazoEntrega && dados.dataPublicacao) {
    const dataPub = new Date(dados.dataPublicacao).getTime();
    const dataPrazo = new Date(dados.prazoEntrega).getTime();
    if (!isNaN(dataPub) && !isNaN(dataPrazo) && dataPrazo < dataPub) {
      errors.prazoEntrega = "O prazo de entrega deve ser posterior ou igual à data de publicação.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ==========================================
// ETAPA 4: VALIDAÇÕES DE ENTREGAS
// ==========================================
export function validateEntregaInput(
  dados: { respostaTexto?: string; respostaLink?: string },
  atividade: Atividade,
  isDraft = false
): FormValidationResult & { atrasada?: boolean } {
  const errors: Record<string, string> = {};

  const texto = dados.respostaTexto?.trim() || "";
  const link = dados.respostaLink?.trim() || "";

  if (!isDraft) {
    if (texto.length === 0 && link.length === 0) {
      errors.resposta = "Preencha sua resposta em texto ou informe um link HTTPS.";
    }

    if (link.length > 0 && !isValidHttpsUrl(link)) {
      errors.respostaLink = "O link de resposta deve ser uma URL externa válida com https://.";
    }

    if (atividade.tipo === "texto" && texto.length < 5) {
      errors.respostaTexto = "A resposta em texto deve conter pelo menos 5 caracteres.";
    }

    if (atividade.tipo === "link" && link.length === 0) {
      errors.respostaLink = "Informe o link HTTPS da sua atividade.";
    }
  }

  // Check deadline
  let atrasada = false;
  if (atividade.prazoEntrega) {
    const prazo = new Date(atividade.prazoEntrega).getTime();
    const agora = Date.now();
    if (!isNaN(prazo) && agora > prazo) {
      if (!atividade.permitirAtraso && !isDraft) {
        errors.prazo = "O prazo desta atividade foi encerrado e envios com atraso não são permitidos pelo professor.";
      } else {
        atrasada = true;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    atrasada,
  };
}

// ==========================================
// ETAPA 4: VALIDAÇÕES DE CORREÇÃO E FEEDBACK
// ==========================================
export function validateCorrecaoInput(
  dados: { feedback?: string; pontuacao?: number | null },
  atividade?: Atividade
): FormValidationResult {
  const errors: Record<string, string> = {};

  if (!dados.feedback || dados.feedback.trim().length < 5) {
    errors.feedback = "O feedback pedagógico deve conter pelo menos 5 caracteres orientativos.";
  }

  if (dados.pontuacao !== undefined && dados.pontuacao !== null) {
    const pts = Number(dados.pontuacao);
    if (isNaN(pts) || pts < 0) {
      errors.pontuacao = "A pontuação não pode ser negativa.";
    } else if (atividade?.pontuacaoMaxima && pts > atividade.pontuacaoMaxima) {
      errors.pontuacao = `A pontuação não pode ser maior que o valor máximo (${atividade.pontuacaoMaxima} pontos).`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ==========================================
// ETAPA 4: VALIDAÇÕES DE CONTEÚDO DIÁRIO
// ==========================================
export function validateConteudoDiarioInput(dados: Partial<ConteudoDiario>): FormValidationResult {
  const errors: Record<string, string> = {};

  if (!dados.titulo || dados.titulo.trim().length < 3) {
    errors.titulo = "O título deve ter pelo menos 3 caracteres.";
  } else if (dados.titulo.trim().length > 120) {
    errors.titulo = "O título não pode ultrapassar 120 caracteres.";
  }

  if (!dados.texto || dados.texto.trim().length < 5) {
    errors.texto = "O texto do conteúdo diário deve ter pelo menos 5 caracteres.";
  } else if (dados.texto.trim().length > 600) {
    errors.texto = "O texto diário deve ser conciso (máximo 600 caracteres).";
  }

  if (!dados.dataProgramada || dados.dataProgramada.trim().length === 0) {
    errors.dataProgramada = "Informe a data programada para o estímulo diário.";
  }

  if (!dados.nivelRecomendado) {
    errors.nivelRecomendado = "Selecione o nível recomendado.";
  }

  if (!dados.status) {
    errors.status = "Selecione o status do conteúdo.";
  }

  if (!dados.destinoTipo) {
    errors.destinoTipo = "Selecione o destino do conteúdo.";
  } else if (dados.destinoTipo !== "geral" && (!dados.destinoId || dados.destinoId.trim().length === 0)) {
    errors.destinoId = dados.destinoTipo === "turma" ? "Selecione a turma." : "Selecione o aluno.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ==========================================
// ETAPA 5: VALIDAÇÕES DE SELF PRESENTATION
// ==========================================

export const TEXTO_CONSENTIMENTO_OFICIAL =
  "Autorizo o uso deste vídeo pela equipe pedagógica exclusivamente para avaliação, acompanhamento da minha evolução e aplicação do Método Paulo.";

export const VERSAO_CONSENTIMENTO_ATUAL = "v1.0";

export function validateSelfPresentationInput(
  dados: Partial<SelfPresentation>,
  isDraft = false
): FormValidationResult<SelfPresentation> {
  const errors: Record<string, string> = {};

  if (!dados.titulo || dados.titulo.trim().length < 3) {
    errors.titulo = "O título da apresentação deve ter pelo menos 3 caracteres.";
  } else if (dados.titulo.trim().length > 150) {
    errors.titulo = "O título não pode ultrapassar 150 caracteres.";
  }

  if (!dados.alunoId || dados.alunoId.trim().length === 0) {
    errors.alunoId = "O aluno vinculado é obrigatório.";
  }

  if (!dados.dataGravacao || dados.dataGravacao.trim().length === 0) {
    errors.dataGravacao = "Informe a data da gravação do vídeo.";
  }

  if (!isDraft) {
    // Ao submeter para avaliação, a URL externa HTTPS é obrigatória e deve ser válida
    if (!dados.linkVideo || dados.linkVideo.trim().length === 0) {
      errors.linkVideo = "Informe o link externo HTTPS do seu vídeo.";
    } else if (!isValidHttpsUrl(dados.linkVideo.trim())) {
      errors.linkVideo =
        "O link do vídeo deve ser uma URL externa válida com protocolo https:// (ex.: YouTube, Google Drive, Loom, Vimeo).";
    }

    // Consentimento é estritamente obrigatório antes do envio
    if (!dados.consentimento || !dados.consentimento.aceito) {
      errors.consentimento =
        "É obrigatório ler e aceitar o termo de consentimento pedagógico antes de enviar sua gravação.";
    }
  } else if (dados.linkVideo && dados.linkVideo.trim().length > 0) {
    // No rascunho, se informado link, valida se está em formato HTTPS válido
    if (!isValidHttpsUrl(dados.linkVideo.trim())) {
      errors.linkVideo = "O link informado deve ser uma URL válida com https://.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateRubrica(
  rubrica?: Partial<RubricaPedagogica> | null
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!rubrica) {
    errors.rubrica = "A rubrica pedagógica é obrigatória.";
    return { isValid: false, errors };
  }

  const criterios: Array<keyof RubricaPedagogica> = [
    "fluencia",
    "vocabulario",
    "gramaticaAplicada",
    "pronunciaInteligibilidade",
    "coerenciaOrganizacao",
    "compreensaoGeral",
  ];

  for (const crit of criterios) {
    const item = rubrica[crit];
    if (!item || typeof item.pontuacao !== "number") {
      errors[crit] = `A pontuação de ${crit} é obrigatória.`;
    } else if (item.pontuacao < 1 || item.pontuacao > 5 || !Number.isInteger(item.pontuacao)) {
      errors[crit] = `A pontuação de ${crit} deve ser um número inteiro de 1 a 5.`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Calcula a média aritmética simples das notas (1 a 5) da rubrica.
 * ATENÇÃO (Regra Metodológica): Esta função NUNCA converte a média em nível CEFR
 * nem sugere automaticamente A1, A2, B1, B2, C1 ou C2.
 * A Self Presentation avalia primariamente a produção oral e não representa
 * uma avaliação CEFR completa. O nível operacional deve ser definido e justificado
 * exclusivamente de forma manual pelo professor.
 */
export function calcularMediaCriteriosOrais(
  rubrica: RubricaPedagogica
): { media: number; explicacao: string } {
  const scores = [
    rubrica.fluencia.pontuacao,
    rubrica.vocabulario.pontuacao,
    rubrica.gramaticaAplicada.pontuacao,
    rubrica.pronunciaInteligibilidade.pontuacao,
    rubrica.coerenciaOrganizacao.pontuacao,
    rubrica.compreensaoGeral.pontuacao,
  ];

  const soma = scores.reduce((acc, cur) => acc + cur, 0);
  const media = Math.round((soma / scores.length) * 10) / 10;

  return {
    media,
    explicacao: `Média dos critérios orais: ${media.toFixed(1)} / 5.0. A Self Presentation avalia prioritariamente a produção oral e não representa uma avaliação CEFR completa. O nível operacional deve ser atribuído e justificado manualmente pelo professor.`,
  };
}

export function validateAvaliacaoInput(
  dados: Partial<AvaliacaoPedagogica>,
  isPublishing = false
): FormValidationResult<AvaliacaoPedagogica> {
  const errors: Record<string, string> = {};

  if (!dados.professorId || dados.professorId.trim().length === 0) {
    errors.professorId = "O professor avaliador é obrigatório.";
  }

  // Validação da rubrica
  const rubricaVal = validateRubrica(dados.rubrica);
  if (!rubricaVal.isValid) {
    Object.assign(errors, rubricaVal.errors);
  }

  if (isPublishing) {
    if (!dados.pontosFortes || dados.pontosFortes.trim().length < 5) {
      errors.pontosFortes = "Descreva os pontos fortes observados na fala (mínimo 5 caracteres).";
    }

    if (!dados.pontosADesenvolver || dados.pontosADesenvolver.trim().length < 5) {
      errors.pontosADesenvolver =
        "Descreva os pontos a desenvolver com base no Método Paulo (mínimo 5 caracteres).";
    }

    if (!dados.orientacaoProximasAulas || dados.orientacaoProximasAulas.trim().length < 5) {
      errors.orientacaoProximasAulas =
        "Forneça orientações e próximos passos para as próximas aulas (mínimo 5 caracteres).";
    }

    if (!dados.nivelDefinido || dados.nivelDefinido === "nao_avaliado") {
      errors.nivelDefinido = "Defina o nível operacional final do aluno (A1 a C2).";
    }

    if (!dados.justificativaNivel || dados.justificativaNivel.trim().length < 10) {
      errors.justificativaNivel =
        "A justificativa pedagógica para o nível definido é obrigatória (mínimo 10 caracteres).";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateSolicitacaoReenvioInput(
  dados: Partial<SolicitacaoReenvio>
): FormValidationResult<SolicitacaoReenvio> {
  const errors: Record<string, string> = {};

  if (!dados.motivo || dados.motivo.trim().length < 5) {
    errors.motivo = "Informe o motivo da solicitação de reenvio (mínimo 5 caracteres).";
  }

  if (!dados.orientacoes || dados.orientacoes.trim().length < 10) {
    errors.orientacoes =
      "Forneça instruções claras para o aluno regravar sua Self Presentation (mínimo 10 caracteres).";
  }

  if (!dados.professorId || dados.professorId.trim().length === 0) {
    errors.professorId = "O professor solicitante é obrigatório.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// VALIDAÇÕES DA ETAPA 6: FLASHCARDS E IMPORTAÇÃO CSV
// ============================================================================

export function validateBaralhoInput(
  dados: Partial<Baralho>
): FormValidationResult<Baralho> {
  const errors: Record<string, string> = {};

  if (!dados.nome || dados.nome.trim().length < 3) {
    errors.nome = "O nome do baralho deve ter pelo menos 3 caracteres.";
  }

  if (!dados.descricao || dados.descricao.trim().length < 5) {
    errors.descricao = "A descrição do baralho deve ter pelo menos 5 caracteres.";
  }

  if (!dados.categoria || dados.categoria.trim().length === 0) {
    errors.categoria = "Selecione ou informe uma categoria pedagógica.";
  }

  if (!dados.nivelRecomendado) {
    errors.nivelRecomendado = "O nível recomendado é obrigatório.";
  }

  if (!dados.professorId || dados.professorId.trim().length === 0) {
    errors.professorId = "O professor responsável é obrigatório.";
  }

  if (!dados.destinoTipo) {
    errors.destinoTipo = "O destino do baralho (geral, turma ou aluno) é obrigatório.";
  } else if (dados.destinoTipo === "turma" && (!dados.destinoId || dados.destinoId.trim().length === 0)) {
    errors.destinoId = "Selecione a turma de destino para este baralho.";
  } else if (dados.destinoTipo === "aluno" && (!dados.destinoId || dados.destinoId.trim().length === 0)) {
    errors.destinoId = "Selecione o aluno de destino para este baralho individualizado.";
  }

  if (dados.limiteDiarioNovos !== undefined) {
    const lim = Number(dados.limiteDiarioNovos);
    if (isNaN(lim) || lim < 1 || lim > 100 || !Number.isInteger(lim)) {
      errors.limiteDiarioNovos = "O limite diário de novos cartões deve ser um número inteiro entre 1 e 100.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateCartaoInput(
  dados: Partial<Cartao>
): FormValidationResult<Cartao> {
  const errors: Record<string, string> = {};

  if (!dados.baralhoId || dados.baralhoId.trim().length === 0) {
    errors.baralhoId = "O baralho de vinculação é obrigatório.";
  }

  if (!dados.frente || dados.frente.trim().length === 0) {
    errors.frente = "O texto da frente do cartão é obrigatório.";
  }

  if (!dados.verso || dados.verso.trim().length === 0) {
    errors.verso = "O texto do verso (resposta/significado) é obrigatório.";
  }

  if (dados.linkAudio && dados.linkAudio.trim().length > 0) {
    if (!isValidHttpsUrl(dados.linkAudio.trim())) {
      errors.linkAudio = "O link de áudio deve ser uma URL externa válida com protocolo HTTPS.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Utilitário de parsing de linha CSV com suporte a campos entre aspas
 */
function parseCSVRow(text: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Processamento e validação de CSV no navegador (sem envio a servidores externos)
 * Formato esperado: frente,verso,exemplo,traducao,dica,pronuncia,tags
 */
export function parseAndValidateCSV(
  csvText: string,
  cartoesExistentesNoBaralho: Cartao[] = []
): {
  itens: ItemImportacaoCSV[];
  totalValidos: number;
  totalInvalidos: number;
  totalDuplicados: number;
} {
  const rawLines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const itens: ItemImportacaoCSV[] = [];

  const frentesExistentes = new Set(
    cartoesExistentesNoBaralho.map((c) => c.frente.trim().toLowerCase())
  );
  const frentesNoCSV = new Set<string>();

  let totalValidos = 0;
  let totalInvalidos = 0;
  let totalDuplicados = 0;

  // Detecta se a primeira linha é cabeçalho
  let startIndex = 0;
  if (rawLines.length > 0) {
    const firstCols = parseCSVRow(rawLines[0]).map((c) => c.toLowerCase());
    if (
      firstCols[0] === "frente" ||
      firstCols[0] === "front" ||
      firstCols[1] === "verso" ||
      firstCols[1] === "back"
    ) {
      startIndex = 1;
    }
  }

  for (let i = startIndex; i < rawLines.length; i++) {
    const lineNum = i + 1;
    const cols = parseCSVRow(rawLines[i]);

    const frente = cols[0] || "";
    const verso = cols[1] || "";
    const exemplo = cols[2] || undefined;
    const traducao = cols[3] || undefined;
    const dica = cols[4] || undefined;
    const pronuncia = cols[5] || undefined;
    const tagsRaw = cols[6] || "";

    const tags = tagsRaw
      ? tagsRaw
          .split(";")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const frenteKey = frente.trim().toLowerCase();

    // 1. Validação de obrigatoriedade
    if (!frente.trim() || !verso.trim()) {
      totalInvalidos++;
      itens.push({
        linha: lineNum,
        frente,
        verso,
        exemplo,
        traducao,
        dica,
        pronuncia,
        tags,
        status: "invalido",
        erro: !frente.trim()
          ? "Frente do cartão vazia."
          : "Verso do cartão vazio.",
      });
      continue;
    }

    // 2. Detecção de duplicidade exata
    if (frentesExistentes.has(frenteKey) || frentesNoCSV.has(frenteKey)) {
      totalDuplicados++;
      itens.push({
        linha: lineNum,
        frente,
        verso,
        exemplo,
        traducao,
        dica,
        pronuncia,
        tags,
        status: "duplicado",
        erro: frentesExistentes.has(frenteKey)
          ? "Cartão com frente idêntica já existe neste baralho."
          : "Frente repetida dentro do próprio arquivo CSV.",
      });
      continue;
    }

    // Válido
    frentesNoCSV.add(frenteKey);
    totalValidos++;
    itens.push({
      linha: lineNum,
      frente,
      verso,
      exemplo,
      traducao,
      dica,
      pronuncia,
      tags,
      status: "valido",
    });
  }

  return {
    itens,
    totalValidos,
    totalInvalidos,
    totalDuplicados,
  };
}
