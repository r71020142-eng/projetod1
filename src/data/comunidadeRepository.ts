import {
  EspacoComunidade,
  PublicacaoComunidade,
  ComentarioPublicacao,
  DenunciaConteudo,
  InteresseOportunidade,
  OportunidadeIntercambio,
  AcaoModeracao,
  OperationResult,
  MetricasComunidadeAdmin,
  Aluno,
} from "../types";
import {
  SEED_ESPACOS_COMUNIDADE,
  SEED_PUBLICACOES_COMUNIDADE,
  SEED_COMENTARIOS_COMUNIDADE,
  SEED_DENUNCIAS_COMUNIDADE,
  SEED_OPORTUNIDADES_INTERCAMBIO,
  SEED_INTERESSES_OPORTUNIDADES,
} from "./mockData";
import {
  alunoTemAcessoAoEspaco,
  alunoPodePublicarNoEspaco,
  alunoPodeComentarNoEspaco,
  validarLinkExternoHttps,
  sanitizarPublicacaoParaAluno,
  sanitizarComentarioParaAluno,
} from "./comunidadeRegras";

const STORAGE_ESPACOS = "mtd_demonstrativo_espacos_v1";
const STORAGE_PUBLICACOES = "mtd_demonstrativo_publicacoes_v1";
const STORAGE_COMENTARIOS = "mtd_demonstrativo_comentarios_v1";
const STORAGE_DENUNCIAS = "mtd_demonstrativo_denuncias_v1";
const STORAGE_OPORTUNIDADES = "mtd_demonstrativo_oportunidades_v1";
const STORAGE_INTERESSES = "mtd_demonstrativo_interesses_oportunidades_v1";

function loadFromStorage<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T[];
  } catch (err) {
    console.error(`Erro ao carregar storage (${key}):`, err);
    return seed;
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: key } })
    );
  } catch (err) {
    console.error(`Erro ao salvar storage (${key}):`, err);
  }
}

export const comunidadeRepository = {
  // ==========================================
  // ESPAÇOS DA COMUNIDADE
  // ==========================================

  async listarEspacos(
    paraAdmin = false,
    aluno?: Aluno,
    turmasMatriculado: string[] = []
  ): Promise<EspacoComunidade[]> {
    const espacos = loadFromStorage<EspacoComunidade>(STORAGE_ESPACOS, SEED_ESPACOS_COMUNIDADE);

    if (paraAdmin) {
      return espacos.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
    }

    if (!aluno) {
      return espacos.filter((e) => e.tipo === "geral" && e.status === "ativo");
    }

    return espacos.filter((e) => alunoTemAcessoAoEspaco(e, aluno, turmasMatriculado));
  },

  async obterEspacoPorId(id: string): Promise<EspacoComunidade | null> {
    const espacos = loadFromStorage<EspacoComunidade>(STORAGE_ESPACOS, SEED_ESPACOS_COMUNIDADE);
    return espacos.find((e) => e.id === id) || null;
  },

  async salvarEspaco(
    dados: Partial<EspacoComunidade> & { nome: string; descricao: string }
  ): Promise<OperationResult<EspacoComunidade>> {
    if (!dados.nome || dados.nome.trim().length < 3) {
      return { success: false, error: "O nome do espaço deve ter pelo menos 3 caracteres." };
    }

    const espacos = loadFromStorage<EspacoComunidade>(STORAGE_ESPACOS, SEED_ESPACOS_COMUNIDADE);
    const agora = new Date().toISOString();

    if (dados.id) {
      const idx = espacos.findIndex((e) => e.id === dados.id);
      if (idx === -1) {
        return { success: false, error: "Espaço não encontrado para edição." };
      }
      const atualizado: EspacoComunidade = {
        ...espacos[idx],
        ...dados,
        atualizadoEm: agora,
      };
      espacos[idx] = atualizado;
      saveToStorage(STORAGE_ESPACOS, espacos);
      return { success: true, data: atualizado };
    }

    const novo: EspacoComunidade = {
      id: `esp-${String(espacos.length + 1).padStart(3, "0")}`,
      nome: dados.nome.trim(),
      descricao: dados.descricao.trim(),
      tipo: dados.tipo || "geral",
      turmaId: dados.turmaId,
      turmaNome: dados.turmaNome,
      nivelRecomendado: dados.nivelRecomendado,
      objetivoAlvo: dados.objetivoAlvo,
      imagemUrl: dados.imagemUrl,
      regras: dados.regras || "Respeito e incentivo mútuo.",
      status: dados.status || "ativo",
      permitirPublicacaoAluno: dados.permitirPublicacaoAluno ?? true,
      permitirComentarios: dados.permitirComentarios ?? true,
      responsavelNome: dados.responsavelNome || "Coordenação Pedagógica",
      totalPublicacoes: 0,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    espacos.push(novo);
    saveToStorage(STORAGE_ESPACOS, espacos);
    return { success: true, data: novo };
  },

  // ==========================================
  // PUBLICAÇÕES
  // ==========================================

  async listarPublicacoes(
    espacoId?: string,
    paraAluno = false
  ): Promise<PublicacaoComunidade[]> {
    const pubs = loadFromStorage<PublicacaoComunidade>(STORAGE_PUBLICACOES, SEED_PUBLICACOES_COMUNIDADE);

    let filtradas = pubs;
    if (espacoId) {
      filtradas = filtradas.filter((p) => p.espacoId === espacoId);
    }

    if (paraAluno) {
      // Aluno visualiza apenas publicações publicadas (oculta, em_revisao e removida são suprimidas)
      filtradas = filtradas
        .filter((p) => p.status === "publicada")
        .map(sanitizarPublicacaoParaAluno);
    }

    // Ordenação: fixadas no topo, depois as mais recentes
    return filtradas.sort((a, b) => {
      if (a.fixada && !b.fixada) return -1;
      if (!a.fixada && b.fixada) return 1;
      return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
    });
  },

  async obterPublicacaoPorId(
    id: string,
    paraAluno = false
  ): Promise<PublicacaoComunidade | null> {
    const pubs = loadFromStorage<PublicacaoComunidade>(STORAGE_PUBLICACOES, SEED_PUBLICACOES_COMUNIDADE);
    const pub = pubs.find((p) => p.id === id);
    if (!pub) return null;

    if (paraAluno) {
      if (pub.status !== "publicada") return null;
      return sanitizarPublicacaoParaAluno(pub);
    }
    return pub;
  },

  async criarPublicacao(
    dados: {
      espacoId: string;
      autorId: string;
      autorNome: string;
      autorAvatar?: string;
      autorPapel: "aluno" | "professor" | "admin";
      tipo: import("../types").TipoPublicacaoComunidade;
      titulo?: string;
      conteudo: string;
      linkExternoUrl?: string;
      linkExternoTitulo?: string;
      oportunidadeId?: string;
    },
    alunoValidador?: Aluno,
    turmasMatriculado: string[] = []
  ): Promise<OperationResult<PublicacaoComunidade>> {
    if (!dados.conteudo || dados.conteudo.trim().length < 5) {
      return { success: false, error: "O conteúdo da publicação deve ter pelo menos 5 caracteres." };
    }

    const espacos = loadFromStorage<EspacoComunidade>(STORAGE_ESPACOS, SEED_ESPACOS_COMUNIDADE);
    const espaco = espacos.find((e) => e.id === dados.espacoId);
    if (!espaco) {
      return { success: false, error: "Espaço da comunidade não encontrado." };
    }

    if (dados.autorPapel === "aluno" && alunoValidador) {
      if (!alunoPodePublicarNoEspaco(espaco, alunoValidador, turmasMatriculado)) {
        return {
          success: false,
          error: "Você não tem permissão para publicar neste espaço ou o espaço está bloqueado para novas publicações.",
        };
      }
    }

    // Validação de link externo via parser nativo
    if (dados.linkExternoUrl) {
      const valLink = validarLinkExternoHttps(dados.linkExternoUrl);
      if (!valLink.isValid) {
        return { success: false, error: valLink.error || "Link externo inválido." };
      }
    }

    const pubs = loadFromStorage<PublicacaoComunidade>(STORAGE_PUBLICACOES, SEED_PUBLICACOES_COMUNIDADE);
    const agora = new Date().toISOString();
    const novoId = `pub-${String(pubs.length + 1).padStart(3, "0")}`;

    const nova: PublicacaoComunidade = {
      id: novoId,
      espacoId: espaco.id,
      espacoNome: espaco.nome,
      autorId: dados.autorId,
      autorNome: dados.autorNome,
      autorAvatar: dados.autorAvatar,
      autorPapel: dados.autorPapel,
      tipo: dados.tipo,
      titulo: dados.titulo?.trim(),
      conteudo: dados.conteudo.trim(),
      linkExterno: dados.linkExternoUrl
        ? {
            url: dados.linkExternoUrl.trim(),
            titulo: dados.linkExternoTitulo?.trim() || "Link de Referência",
          }
        : undefined,
      oportunidadeId: dados.oportunidadeId,
      fixada: false,
      status: "publicada",
      reacoes: {},
      comentariosCount: 0,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    pubs.push(nova);
    saveToStorage(STORAGE_PUBLICACOES, pubs);

    // Atualiza contagem no espaço
    espaco.totalPublicacoes = (espaco.totalPublicacoes || 0) + 1;
    espaco.atualizadoEm = agora;
    saveToStorage(STORAGE_ESPACOS, espacos);

    return { success: true, data: nova };
  },

  async alternarReacaoPublicacao(
    publicacaoId: string,
    tipoReacao: "curtidas" | "apoio" | "parabens",
    usuarioId: string = "alu-001"
  ): Promise<OperationResult<PublicacaoComunidade>> {
    const pubs = loadFromStorage<PublicacaoComunidade>(STORAGE_PUBLICACOES, SEED_PUBLICACOES_COMUNIDADE);
    const idx = pubs.findIndex((p) => p.id === publicacaoId);
    if (idx === -1) {
      return { success: false, error: "Publicação não encontrada." };
    }

    const pub = pubs[idx];
    pub.reacoes = pub.reacoes || { curtidas: 0, apoio: 0, parabens: 0 };
    pub.reacoesPorUsuario = pub.reacoesPorUsuario || {};

    const reacaoAnterior = pub.reacoesPorUsuario[usuarioId];

    if (reacaoAnterior === tipoReacao) {
      // Desmarca a reação (toggle off)
      pub.reacoes[tipoReacao] = Math.max(0, (pub.reacoes[tipoReacao] || 0) - 1);
      delete pub.reacoesPorUsuario[usuarioId];
    } else {
      // Se já tinha outra reação antes, remove a anterior (substituição)
      if (reacaoAnterior) {
        pub.reacoes[reacaoAnterior] = Math.max(0, (pub.reacoes[reacaoAnterior] || 0) - 1);
      }
      // Adiciona a nova reação escolhida (apenas uma por usuário)
      pub.reacoes[tipoReacao] = (pub.reacoes[tipoReacao] || 0) + 1;
      pub.reacoesPorUsuario[usuarioId] = tipoReacao;
    }

    // Regra da Etapa 9: nenhuma reação na comunidade gera pontos
    pub.atualizadoEm = new Date().toISOString();

    saveToStorage(STORAGE_PUBLICACOES, pubs);
    return { success: true, data: pub };
  },

  // ==========================================
  // COMENTÁRIOS
  // ==========================================

  async listarComentarios(
    publicacaoId: string,
    paraAluno = false
  ): Promise<ComentarioPublicacao[]> {
    const coms = loadFromStorage<ComentarioPublicacao>(STORAGE_COMENTARIOS, SEED_COMENTARIOS_COMUNIDADE);
    let filtrados = coms.filter((c) => c.publicacaoId === publicacaoId);

    if (paraAluno) {
      filtrados = filtrados
        .filter((c) => c.status === "publicado")
        .map(sanitizarComentarioParaAluno);
    }

    return filtrados.sort(
      (a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()
    );
  },

  async criarComentario(
    dados: {
      publicacaoId: string;
      autorId: string;
      autorNome: string;
      autorAvatar?: string;
      autorPapel: "aluno" | "professor" | "admin";
      conteudo: string;
    },
    alunoValidador?: Aluno,
    turmasMatriculado: string[] = []
  ): Promise<OperationResult<ComentarioPublicacao>> {
    if (!dados.conteudo || dados.conteudo.trim().length < 2) {
      return { success: false, error: "O comentário não pode ficar em branco." };
    }

    const pubs = loadFromStorage<PublicacaoComunidade>(STORAGE_PUBLICACOES, SEED_PUBLICACOES_COMUNIDADE);
    const pub = pubs.find((p) => p.id === dados.publicacaoId);
    if (!pub) {
      return { success: false, error: "Publicação vinculada não encontrada." };
    }

    const espacos = loadFromStorage<EspacoComunidade>(STORAGE_ESPACOS, SEED_ESPACOS_COMUNIDADE);
    const espaco = espacos.find((e) => e.id === pub.espacoId);
    if (espaco && dados.autorPapel === "aluno" && alunoValidador) {
      if (!alunoPodeComentarNoEspaco(espaco, alunoValidador, turmasMatriculado)) {
        return {
          success: false,
          error: "Comentários estão desativados para este espaço ou seu acesso não permite comentar.",
        };
      }
    }

    const coms = loadFromStorage<ComentarioPublicacao>(STORAGE_COMENTARIOS, SEED_COMENTARIOS_COMUNIDADE);
    const agora = new Date().toISOString();
    const novoId = `com-${String(coms.length + 1).padStart(3, "0")}`;

    const novo: ComentarioPublicacao = {
      id: novoId,
      publicacaoId: dados.publicacaoId,
      autorId: dados.autorId,
      autorNome: dados.autorNome,
      autorAvatar: dados.autorAvatar,
      autorPapel: dados.autorPapel,
      conteudo: dados.conteudo.trim(),
      status: "publicado",
      reacoes: {},
      criadoEm: agora,
    };

    coms.push(novo);
    saveToStorage(STORAGE_COMENTARIOS, coms);

    // Incrementa contagem de comentários na publicação
    pub.comentariosCount = (pub.comentariosCount || 0) + 1;
    pub.atualizadoEm = agora;
    saveToStorage(STORAGE_PUBLICACOES, pubs);

    return { success: true, data: novo };
  },

  // ==========================================
  // MODERAÇÃO E DENÚNCIAS
  // ==========================================

  async denunciarConteudo(dados: {
    alvoTipo: "publicacao" | "comentario";
    alvoId: string;
    publicacaoId: string;
    denuncianteId: string;
    denuncianteNome: string;
    motivo: import("../types").MotivoDenuncia;
    descricao?: string;
  }): Promise<OperationResult<DenunciaConteudo>> {
    const denuncias = loadFromStorage<DenunciaConteudo>(STORAGE_DENUNCIAS, SEED_DENUNCIAS_COMUNIDADE);
    const agora = new Date().toISOString();
    const novoId = `den-${String(denuncias.length + 1).padStart(3, "0")}`;

    const nova: DenunciaConteudo = {
      id: novoId,
      alvoTipo: dados.alvoTipo,
      alvoId: dados.alvoId,
      publicacaoId: dados.publicacaoId,
      denuncianteId: dados.denuncianteId,
      denuncianteNome: dados.denuncianteNome,
      motivo: dados.motivo,
      descricao: dados.descricao?.trim(),
      status: "pendente",
      criadoEm: agora,
    };

    denuncias.push(nova);
    saveToStorage(STORAGE_DENUNCIAS, denuncias);

    // Marca publicação como denunciada caso seja alvo
    if (dados.alvoTipo === "publicacao") {
      const pubs = loadFromStorage<PublicacaoComunidade>(STORAGE_PUBLICACOES, SEED_PUBLICACOES_COMUNIDADE);
      const pub = pubs.find((p) => p.id === dados.alvoId);
      if (pub) {
        pub.denunciasCount = (pub.denunciasCount || 0) + 1;
        if (pub.status === "publicada") {
          pub.status = "denunciada";
        }
        pub.atualizadoEm = agora;
        saveToStorage(STORAGE_PUBLICACOES, pubs);
      }
    }

    return { success: true, data: nova };
  },

  async listarDenuncias(): Promise<DenunciaConteudo[]> {
    const denuncias = loadFromStorage<DenunciaConteudo>(STORAGE_DENUNCIAS, SEED_DENUNCIAS_COMUNIDADE);
    return denuncias.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  },

  async moderarPublicacao(
    publicacaoId: string,
    acao: AcaoModeracao,
    motivo: string,
    responsavelId: string,
    responsavelNome: string
  ): Promise<OperationResult<PublicacaoComunidade>> {
    const pubs = loadFromStorage<PublicacaoComunidade>(STORAGE_PUBLICACOES, SEED_PUBLICACOES_COMUNIDADE);
    const idx = pubs.findIndex((p) => p.id === publicacaoId);
    if (idx === -1) {
      return { success: false, error: "Publicação não encontrada." };
    }

    const agora = new Date().toISOString();
    const pub = pubs[idx];

    switch (acao) {
      case "ocultar":
        pub.status = "oculta";
        break;
      case "remover":
        pub.status = "removida";
        break;
      case "restaurar":
        pub.status = "publicada";
        break;
      case "fixar":
        pub.fixada = true;
        break;
      case "desafixar":
        pub.fixada = false;
        break;
    }

    pub.registroModeracao = {
      acao,
      motivo: motivo.trim() || "Ação de moderação pedagógica.",
      responsavelId,
      responsavelNome,
      dataHora: agora,
    };
    pub.atualizadoEm = agora;

    saveToStorage(STORAGE_PUBLICACOES, pubs);

    // Resolve eventuais denúncias pendentes desta publicação
    const denuncias = loadFromStorage<DenunciaConteudo>(STORAGE_DENUNCIAS, SEED_DENUNCIAS_COMUNIDADE);
    let alterouDenuncias = false;
    for (const d of denuncias) {
      if (d.alvoId === publicacaoId && d.status === "pendente") {
        d.status = acao === "restaurar" ? "rejeitada" : "procedente";
        d.analisadoPorId = responsavelId;
        d.analisadoEm = agora;
        alterouDenuncias = true;
      }
    }
    if (alterouDenuncias) {
      saveToStorage(STORAGE_DENUNCIAS, denuncias);
    }

    return { success: true, data: pub };
  },

  async moderarComentario(
    comentarioId: string,
    acao: "ocultar" | "remover" | "restaurar",
    motivo: string,
    responsavelId: string,
    responsavelNome: string
  ): Promise<OperationResult<ComentarioPublicacao>> {
    const coms = loadFromStorage<ComentarioPublicacao>(STORAGE_COMENTARIOS, SEED_COMENTARIOS_COMUNIDADE);
    const idx = coms.findIndex((c) => c.id === comentarioId);
    if (idx === -1) {
      return { success: false, error: "Comentário não encontrado." };
    }

    const agora = new Date().toISOString();
    const com = coms[idx];

    if (acao === "ocultar") com.status = "oculto";
    else if (acao === "remover") com.status = "removido";
    else if (acao === "restaurar") com.status = "publicado";

    com.registroModeracao = {
      acao,
      motivo: motivo.trim() || "Ação de moderação pedagógica.",
      responsavelId,
      responsavelNome,
      dataHora: agora,
    };

    saveToStorage(STORAGE_COMENTARIOS, coms);
    return { success: true, data: com };
  },

  // ==========================================
  // OPORTUNIDADES DE INTERCÂMBIO
  // ==========================================

  async listarOportunidades(): Promise<OportunidadeIntercambio[]> {
    const ops = loadFromStorage<OportunidadeIntercambio>(STORAGE_OPORTUNIDADES, SEED_OPORTUNIDADES_INTERCAMBIO);
    return ops.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  },

  async obterOportunidadePorId(id: string): Promise<OportunidadeIntercambio | null> {
    const ops = loadFromStorage<OportunidadeIntercambio>(STORAGE_OPORTUNIDADES, SEED_OPORTUNIDADES_INTERCAMBIO);
    return ops.find((o) => o.id === id) || null;
  },

  async registrarInteresseOportunidade(dados: {
    oportunidadeId: string;
    alunoId: string;
    alunoNome: string;
    alunoEmail: string;
    alunoNivelAtual?: string;
    observacoesAluno?: string;
  }): Promise<OperationResult<InteresseOportunidade>> {
    const interesses = loadFromStorage<InteresseOportunidade>(
      STORAGE_INTERESSES,
      SEED_INTERESSES_OPORTUNIDADES
    );

    // Evita duplicidade de registro para o mesmo aluno e oportunidade
    const jaRegistrou = interesses.some(
      (i) => i.oportunidadeId === dados.oportunidadeId && i.alunoId === dados.alunoId
    );
    if (jaRegistrou) {
      return { success: false, error: "Você já registrou seu interesse nesta oportunidade. Nossa equipe entrará em contato." };
    }

    const agora = new Date().toISOString();
    const novo: InteresseOportunidade = {
      id: `int-${String(interesses.length + 1).padStart(3, "0")}`,
      oportunidadeId: dados.oportunidadeId,
      alunoId: dados.alunoId,
      alunoNome: dados.alunoNome,
      alunoEmail: dados.alunoEmail,
      alunoNivelAtual: dados.alunoNivelAtual,
      dataRegistro: agora,
      status: "registrado",
      observacoesAluno: dados.observacoesAluno?.trim(),
    };

    interesses.push(novo);
    saveToStorage(STORAGE_INTERESSES, interesses);

    // Incrementa contagem de candidatos na oportunidade
    const ops = loadFromStorage<OportunidadeIntercambio>(STORAGE_OPORTUNIDADES, SEED_OPORTUNIDADES_INTERCAMBIO);
    const op = ops.find((o) => o.id === dados.oportunidadeId);
    if (op) {
      op.candidatosCount = (op.candidatosCount || 0) + 1;
      saveToStorage(STORAGE_OPORTUNIDADES, ops);
    }

    return { success: true, data: novo };
  },

  async listarInteressesPorOportunidade(
    oportunidadeId?: string
  ): Promise<InteresseOportunidade[]> {
    const interesses = loadFromStorage<InteresseOportunidade>(
      STORAGE_INTERESSES,
      SEED_INTERESSES_OPORTUNIDADES
    );
    if (oportunidadeId) {
      return interesses.filter((i) => i.oportunidadeId === oportunidadeId);
    }
    return interesses;
  },

  // ==========================================
  // MÉTRICAS ADMINISTRATIVAS
  // ==========================================

  async obterMetricasAdmin(): Promise<MetricasComunidadeAdmin> {
    const espacos = loadFromStorage<EspacoComunidade>(STORAGE_ESPACOS, SEED_ESPACOS_COMUNIDADE);
    const pubs = loadFromStorage<PublicacaoComunidade>(STORAGE_PUBLICACOES, SEED_PUBLICACOES_COMUNIDADE);
    const coms = loadFromStorage<ComentarioPublicacao>(STORAGE_COMENTARIOS, SEED_COMENTARIOS_COMUNIDADE);
    const dens = loadFromStorage<DenunciaConteudo>(STORAGE_DENUNCIAS, SEED_DENUNCIAS_COMUNIDADE);
    const ops = loadFromStorage<OportunidadeIntercambio>(STORAGE_OPORTUNIDADES, SEED_OPORTUNIDADES_INTERCAMBIO);
    const ints = loadFromStorage<InteresseOportunidade>(STORAGE_INTERESSES, SEED_INTERESSES_OPORTUNIDADES);

    const totalReacoes = pubs.reduce((acc, p) => {
      const c = p.reacoes?.curtidas || 0;
      const a = p.reacoes?.apoio || 0;
      const par = p.reacoes?.parabens || 0;
      return acc + c + a + par;
    }, 0);

    return {
      totalEspacosAtivos: espacos.filter((e) => e.status === "ativo").length,
      totalPublicacoes: pubs.length,
      totalComentarios: coms.length,
      totalReacoes,
      denunciasPendentes: dens.filter((d) => d.status === "pendente").length,
      publicacoesFixadas: pubs.filter((p) => p.fixada).length,
      oportunidadesAbertas: ops.filter((o) => o.status === "aberta" || o.status === "ativa").length,
      interessesPendentes: ints.filter((i) => (i.statusContato || i.status) === "pendente").length,
    };
  },
};
