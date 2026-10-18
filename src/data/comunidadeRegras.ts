import {
  EspacoComunidade,
  Aluno,
  PublicacaoComunidade,
  ComentarioPublicacao,
} from "../types";

/**
 * Validação segura de link externo utilizando parser nativo de URL.
 * Exige HTTPS e protocolo válido.
 */
export function validarLinkExternoHttps(urlStr?: string): {
  isValid: boolean;
  url?: string;
  error?: string;
} {
  if (!urlStr || !urlStr.trim()) {
    return { isValid: true };
  }

  const trimmed = urlStr.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return {
        isValid: false,
        error: "O link externo deve utilizar o protocolo seguro HTTPS (https://).",
      };
    }
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      return {
        isValid: false,
        error: "O link informado possui um domínio inválido.",
      };
    }
    return { isValid: true, url: parsed.toString() };
  } catch {
    return {
      isValid: false,
      error: "Formato de URL inválido. Certifique-se de digitar um endereço web completo iniciando com https://",
    };
  }
}

/**
 * Determina se o aluno tem permissão de visualização para um espaço da comunidade.
 * Regras:
 * - Geral: todo aluno ativo tem acesso.
 * - Turma: apenas se matriculado na turma vinculada.
 * - Nível: apenas se possuir o nível operacional correspondente.
 * - Objetivo: apenas se possuir o objetivo correspondente.
 * - Oportunidades: aberto a todos os alunos ativos.
 */
export function alunoTemAcessoAoEspaco(
  espaco: EspacoComunidade,
  aluno: Aluno,
  turmaIdsMatriculado: string[] = []
): boolean {
  if (aluno.status !== "ativo") return false;
  if (espaco.status === "rascunho") return false;

  switch (espaco.tipo) {
    case "geral":
    case "oportunidades":
      return true;

    case "turma":
      return Boolean(espaco.turmaId && turmaIdsMatriculado.includes(espaco.turmaId));

    case "nivel":
      if (!espaco.nivelRecomendado || espaco.nivelRecomendado === "nao_avaliado") {
        return true;
      }
      return aluno.nivel === espaco.nivelRecomendado;

    case "objetivo":
      if (!espaco.objetivoAlvo) return true;
      return (
        aluno.objetivoIngles.toLowerCase().includes(espaco.objetivoAlvo.toLowerCase()) ||
        espaco.objetivoAlvo.toLowerCase().includes(aluno.objetivoIngles.toLowerCase())
      );

    default:
      return true;
  }
}

/**
 * Determina se o aluno pode criar publicações em um determinado espaço.
 * Regras:
 * - Deve ter acesso de visualização.
 * - Espaço não pode estar arquivado nem em rascunho.
 * - Espaço deve ter permitirPublicacaoAluno === true.
 */
export function alunoPodePublicarNoEspaco(
  espaco: EspacoComunidade,
  aluno: Aluno,
  turmaIdsMatriculado: string[] = []
): boolean {
  if (!alunoTemAcessoAoEspaco(espaco, aluno, turmaIdsMatriculado)) {
    return false;
  }
  if (espaco.status !== "ativo") {
    return false;
  }
  return Boolean(espaco.permitirPublicacaoAluno);
}

/**
 * Determina se o aluno pode comentar em um determinado espaço.
 */
export function alunoPodeComentarNoEspaco(
  espaco: EspacoComunidade,
  aluno: Aluno,
  turmaIdsMatriculado: string[] = []
): boolean {
  if (!alunoTemAcessoAoEspaco(espaco, aluno, turmaIdsMatriculado)) {
    return false;
  }
  if (espaco.status !== "ativo") {
    return false;
  }
  return Boolean(espaco.permitirComentarios);
}

/**
 * Remove registros de moderação interna antes de enviar a publicação para a interface do aluno.
 */
export function sanitizarPublicacaoParaAluno(
  pub: PublicacaoComunidade
): PublicacaoComunidade {
  const copia = { ...pub };
  if (copia.registroModeracao) {
    copia.registroModeracao = {
      ...copia.registroModeracao,
      motivo: "Conteúdo moderado pela equipe da escola.",
    };
  }
  return copia;
}

/**
 * Sanitiza comentário para a interface do aluno.
 */
export function sanitizarComentarioParaAluno(
  com: ComentarioPublicacao
): ComentarioPublicacao {
  const copia = { ...com };
  if (copia.registroModeracao) {
    copia.registroModeracao = {
      ...copia.registroModeracao,
      motivo: "Comentário moderado pela equipe da escola.",
    };
  }
  return copia;
}
