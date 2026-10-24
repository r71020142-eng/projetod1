import {
  EspacoComunidade,
  PublicacaoComunidade,
  ComentarioPublicacao,
  DenunciaConteudo,
  OportunidadeIntercambio,
  InteresseOportunidade,
  MetricasComunidadeAdmin,
  OperationResult,
  Aluno,
  AcaoModeracao,
  MotivoDenuncia,
  TipoAutorComunidade,
  TipoPublicacaoComunidade,
  StatusPublicacaoComunidade,
  StatusEspacoComunidade,
} from "@/types";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  alunoTemAcessoAoEspaco,
  alunoPodePublicarNoEspaco,
  alunoPodeComentarNoEspaco,
  validarLinkExternoHttps,
  sanitizarPublicacaoParaAluno,
  sanitizarComentarioParaAluno,
} from "./comunidadeRegras";

interface EspacoDbRow {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  icone: string;
  cor_tema: string;
  visibilidade: string;
  turma_id: string | null;
  turma_nome: string | null;
  nivel_minimo: string | null;
  nivel_alvo: string | null;
  objetivo_alvo: string | null;
  imagem_url: string | null;
  regras: string | null;
  ordem: number;
  apenas_leitura_alunos: boolean;
  permitir_publicacao_aluno: boolean;
  permitir_comentarios: boolean;
  criado_por_id: string | null;
  criado_por_nome: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface PublicacaoDbRow {
  id: string;
  espaco_id: string;
  espaco_nome: string | null;
  autor_id: string;
  autor_nome: string;
  autor_papel: string;
  autor_avatar: string | null;
  tipo: string;
  titulo: string | null;
  conteudo: string;
  link_externo: string | null;
  fixada: boolean;
  fechada_para_respostas: boolean;
  comentarios_permitidos: boolean;
  status: string;
  total_curtidas: number;
  total_comentarios: number;
  tags: string[];
  reacoes: Record<string, unknown> | null;
  reacoes_usuarios: string[];
  moderado_por_id: string | null;
  observacoes_internas: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface ComentarioDbRow {
  id: string;
  publicacao_id: string;
  espaco_id: string | null;
  autor_id: string;
  autor_nome: string;
  autor_papel: string;
  autor_avatar: string | null;
  conteudo: string;
  resposta_a_comentario_id: string | null;
  status: string;
  total_curtidas: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface DenunciaDbRow {
  id: string;
  tipo_conteudo: string;
  conteudo_id: string;
  publicacao_id: string | null;
  motivo: string;
  descricao: string | null;
  denunciante_id: string;
  denunciante_nome: string;
  status: string;
  resolvido_por_id: string | null;
  resolvido_em: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface OportunidadeDbRow {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  pais: string | null;
  instituicao: string | null;
  link_externo: string | null;
  nivel_minimo: string | null;
  status: string;
  total_interessados: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface InteresseDbRow {
  id: string;
  oportunidade_id: string;
  aluno_id: string;
  aluno_nome: string;
  email: string;
  telefone: string | null;
  nivel_atual: string | null;
  mensagem: string | null;
  created_at: string;
}

function getSupabase(clientOverride?: SupabaseClient): SupabaseClient {
  if (clientOverride) return clientOverride;
  const client = createBrowserSupabaseClient();
  if (!client) {
    throw new Error(
      "[Supabase Comunidade] Cliente Supabase não pôde ser inicializado. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }
  return client as unknown as SupabaseClient;
}

function mapRowToEspaco(row: EspacoDbRow): EspacoComunidade {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    tipo: (row.tipo || row.visibilidade || "geral") as EspacoComunidade["tipo"],
    turmaId: row.turma_id || undefined,
    turmaNome: row.turma_nome || undefined,
    nivel: row.nivel_alvo || row.nivel_minimo || undefined,
    nivelRecomendado: row.nivel_alvo || row.nivel_minimo || undefined,
    objetivo: row.objetivo_alvo || undefined,
    objetivoAlvo: row.objetivo_alvo || undefined,
    imagemUrl: row.imagem_url || undefined,
    regras: row.regras || undefined,
    status: (row.status || "ativo") as StatusEspacoComunidade,
    permitirPublicacaoAluno: row.permitir_publicacao_aluno ?? true,
    permitirPublicacaoAlunos: row.permitir_publicacao_aluno ?? true,
    permitirComentarios: row.permitir_comentarios ?? true,
    criadoPorId: row.criado_por_id || undefined,
    criadoPorNome: row.criado_por_nome || undefined,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

function mapRowToPublicacao(row: PublicacaoDbRow): PublicacaoComunidade {
  return {
    id: row.id,
    espacoId: row.espaco_id,
    espacoNome: row.espaco_nome || undefined,
    autorId: row.autor_id,
    autorNome: row.autor_nome,
    autorPapel: row.autor_papel as TipoAutorComunidade,
    autorTipo: row.autor_papel as TipoAutorComunidade,
    autorAvatar: row.autor_avatar || undefined,
    tipo: (row.tipo || "discussao") as TipoPublicacaoComunidade,
    titulo: row.titulo || undefined,
    texto: row.conteudo,
    conteudo: row.conteudo,
    linkExterno: row.link_externo || undefined,
    fixada: Boolean(row.fixada),
    comentariosPermitidos: row.comentarios_permitidos ?? true,
    status: (row.status === "publicado" ? "publicada" : row.status === "oculto_moderacao" || row.status === "oculto" ? "oculta" : row.status) as StatusPublicacaoComunidade,
    reacoes: row.reacoes || {},
    reacoesUsuarios: Array.isArray(row.reacoes_usuarios) ? row.reacoes_usuarios : [],
    reacoesCount: row.total_curtidas || 0,
    comentariosCount: row.total_comentarios || 0,
    moderada: Boolean(row.moderado_por_id),
    moderadoPorId: row.moderado_por_id || undefined,
    observacoesInternas: row.observacoes_internas || undefined,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

function mapRowToComentario(row: ComentarioDbRow): ComentarioPublicacao {
  return {
    id: row.id,
    publicacaoId: row.publicacao_id,
    espacoId: row.espaco_id || undefined,
    autorId: row.autor_id,
    autorNome: row.autor_nome,
    autorPapel: row.autor_papel as TipoAutorComunidade,
    autorTipo: row.autor_papel as TipoAutorComunidade,
    autorAvatar: row.autor_avatar || undefined,
    texto: row.conteudo,
    conteudo: row.conteudo,
    status: (row.status === "oculto_moderacao" ? "oculto" : row.status || "publicado") as "publicado" | "oculto" | "removido",
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

export const comunidadeSupabaseRepository = {
  // ==========================================
  // ESPAÇOS DA COMUNIDADE
  // ==========================================

  async listarEspacos(
    paraAdmin = false,
    aluno?: Aluno,
    turmasMatriculado: string[] = [],
    clientOverride?: SupabaseClient
  ): Promise<EspacoComunidade[]> {
    const supabase = getSupabase(clientOverride);
    let query = supabase.from("espacos_comunidade").select("*");

    if (!paraAdmin) {
      query = query.neq("status", "rascunho");
    }

    const { data, error } = await query
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`[Supabase Comunidade] Falha ao listar espaços: ${error.message}`);
    }

    const espacos = ((data || []) as EspacoDbRow[]).map(mapRowToEspaco);

    if (paraAdmin) {
      return espacos;
    }

    if (!aluno) {
      return espacos.filter((e) => e.tipo === "geral" && e.status === "ativo");
    }

    return espacos.filter((e) => alunoTemAcessoAoEspaco(e, aluno, turmasMatriculado));
  },

  async obterEspacoPorId(id: string, clientOverride?: SupabaseClient): Promise<EspacoComunidade | null> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("espacos_comunidade")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`[Supabase Comunidade] Falha ao obter espaço ${id}: ${error.message}`);
    }
    if (!data) return null;

    return mapRowToEspaco(data as EspacoDbRow);
  },

  async salvarEspaco(
    dados: Partial<EspacoComunidade> & { nome: string; descricao: string },
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<EspacoComunidade>> {
    if (!dados.nome || dados.nome.trim().length < 3) {
      return { success: false, error: "O nome do espaço deve ter pelo menos 3 caracteres." };
    }

    try {
      const supabase = getSupabase(clientOverride);
      const espacoId = dados.id || `esp-${Date.now()}`;

      const payload = {
        id: espacoId,
        nome: dados.nome.trim(),
        descricao: dados.descricao.trim(),
        tipo: dados.tipo || "geral",
        visibilidade: dados.tipo || "geral",
        turma_id: dados.turmaId || null,
        turma_nome: dados.turmaNome || null,
        nivel_alvo: dados.nivelRecomendado || dados.nivel || null,
        nivel_minimo: dados.nivelRecomendado || dados.nivel || null,
        objetivo_alvo: dados.objetivoAlvo || dados.objetivo || null,
        imagem_url: dados.imagemUrl ? dados.imagemUrl.trim() : null,
        regras: dados.regras ? dados.regras.trim() : null,
        status: dados.status || "ativo",
        permitir_publicacao_aluno: dados.permitirPublicacaoAluno ?? dados.permitirPublicacaoAlunos ?? true,
        permitir_comentarios: dados.permitirComentarios ?? true,
        criado_por_id: dados.criadoPorId || null,
        criado_por_nome: dados.criadoPorNome || null,
        metadata: {},
      };

      const { data, error } = await supabase
        .from("espacos_comunidade")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao salvar espaço no Supabase: ${error.message}`,
        };
      }

      return { success: true, data: mapRowToEspaco(data as EspacoDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao salvar espaço: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  // ==========================================
  // PUBLICAÇÕES DA COMUNIDADE
  // ==========================================

  async listarPublicacoes(
    espacoId?: string,
    paraAluno = false,
    clientOverride?: SupabaseClient
  ): Promise<PublicacaoComunidade[]> {
    const supabase = getSupabase(clientOverride);
    let query = supabase.from("publicacoes_comunidade").select("*");

    if (espacoId) {
      query = query.eq("espaco_id", espacoId);
    }

    if (paraAluno) {
      query = query.in("status", ["publicado", "publicada"]);
    }

    const { data, error } = await query
      .order("fixada", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`[Supabase Comunidade] Falha ao listar publicações: ${error.message}`);
    }

    let result = ((data || []) as PublicacaoDbRow[]).map(mapRowToPublicacao);

    if (paraAluno) {
      result = result.map(sanitizarPublicacaoParaAluno);
    }

    return result;
  },

  async obterPublicacaoPorId(
    id: string,
    paraAluno = false,
    clientOverride?: SupabaseClient
  ): Promise<PublicacaoComunidade | null> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("publicacoes_comunidade")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`[Supabase Comunidade] Falha ao obter publicação ${id}: ${error.message}`);
    }
    if (!data) return null;

    const pub = mapRowToPublicacao(data as PublicacaoDbRow);
    return paraAluno ? sanitizarPublicacaoParaAluno(pub) : pub;
  },

  async criarPublicacao(
    dados: {
      espacoId: string;
      autorId: string;
      autorNome: string;
      autorAvatar?: string;
      autorPapel: "aluno" | "professor" | "admin" | "administrador";
      tipo: TipoPublicacaoComunidade;
      titulo?: string;
      conteudo: string;
      linkExternoUrl?: string;
      linkExternoTitulo?: string;
      oportunidadeId?: string;
    },
    alunoValidador?: Aluno,
    turmasMatriculado: string[] = [],
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<PublicacaoComunidade>> {
    const conteudoTexto = (dados.conteudo || "").trim();
    if (!conteudoTexto || conteudoTexto.length < 5) {
      return { success: false, error: "A publicação deve conter pelo menos 5 caracteres." };
    }

    if (dados.linkExternoUrl && dados.linkExternoUrl.trim()) {
      const validLink = validarLinkExternoHttps(dados.linkExternoUrl);
      if (!validLink.isValid) {
        return { success: false, error: validLink.error || "Link externo inválido." };
      }
    }

    try {
      const supabase = getSupabase(clientOverride);
      const papel = dados.autorPapel || "aluno";
      const espaco = await this.obterEspacoPorId(dados.espacoId, clientOverride);

      if (alunoValidador && espaco && papel === "aluno") {
        if (!alunoPodePublicarNoEspaco(espaco, alunoValidador, turmasMatriculado)) {
          return {
            success: false,
            error: "Você não possui permissão para publicar neste espaço da comunidade.",
          };
        }
      }

      const pubId = `pub-${Date.now()}`;
      const payload = {
        id: pubId,
        espaco_id: dados.espacoId,
        espaco_nome: espaco?.nome || null,
        autor_id: dados.autorId,
        autor_nome: dados.autorNome,
        autor_papel: papel === "administrador" ? "admin" : papel,
        autor_avatar: dados.autorAvatar || null,
        tipo: dados.tipo || "discussao",
        titulo: dados.titulo ? dados.titulo.trim() : null,
        conteudo: conteudoTexto,
        link_externo: dados.linkExternoUrl ? dados.linkExternoUrl.trim() : null,
        fixada: false,
        comentarios_permitidos: true,
        status: "publicado",
        total_curtidas: 0,
        total_comentarios: 0,
        tags: [],
        reacoes: {},
        reacoes_usuarios: [],
        metadata: {},
      };

      const { data, error } = await supabase
        .from("publicacoes_comunidade")
        .insert(payload)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao criar publicação no Supabase: ${error.message}`,
        };
      }

      return { success: true, data: mapRowToPublicacao(data as PublicacaoDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao criar publicação: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async alternarReacaoPublicacao(
    publicacaoId: string,
    tipo: string,
    usuarioId: string,
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<PublicacaoComunidade>> {
    try {
      const supabase = getSupabase(clientOverride);
      const pubAtual = await this.obterPublicacaoPorId(publicacaoId, false, clientOverride);
      if (!pubAtual) {
        return { success: false, error: "Publicação não encontrada." };
      }

      const reacoesObj = (pubAtual.reacoes || {}) as Record<string, number>;
      const usuariosArr = [...(pubAtual.reacoesUsuarios || [])];
      const jaReagiu = usuariosArr.includes(usuarioId);

      let novosUsuarios: string[];
      let novoTotal = pubAtual.reacoesCount || 0;
      const countAtual = reacoesObj[tipo] || 0;

      if (jaReagiu) {
        novosUsuarios = usuariosArr.filter((u) => u !== usuarioId);
        reacoesObj[tipo] = Math.max(0, countAtual - 1);
        novoTotal = Math.max(0, novoTotal - 1);
      } else {
        novosUsuarios = [...usuariosArr, usuarioId];
        reacoesObj[tipo] = countAtual + 1;
        novoTotal += 1;
      }

      const { data, error } = await supabase
        .from("publicacoes_comunidade")
        .update({
          reacoes: reacoesObj,
          reacoes_usuarios: novosUsuarios,
          total_curtidas: novoTotal,
        })
        .eq("id", publicacaoId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao atualizar reação no Supabase: ${error.message}`,
        };
      }

      return { success: true, data: mapRowToPublicacao(data as PublicacaoDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao atualizar reação: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  // ==========================================
  // COMENTÁRIOS DE PUBLICAÇÕES
  // ==========================================

  async listarComentarios(
    publicacaoId: string,
    paraAluno = false,
    clientOverride?: SupabaseClient
  ): Promise<ComentarioPublicacao[]> {
    const supabase = getSupabase(clientOverride);
    let query = supabase
      .from("comentarios_comunidade")
      .select("*")
      .eq("publicacao_id", publicacaoId);

    if (paraAluno) {
      query = query.in("status", ["publicado", "publicada"]);
    }

    const { data, error } = await query.order("created_at", { ascending: true });

    if (error) {
      throw new Error(`[Supabase Comunidade] Falha ao listar comentários: ${error.message}`);
    }

    let result = ((data || []) as ComentarioDbRow[]).map(mapRowToComentario);

    if (paraAluno) {
      result = result.map(sanitizarComentarioParaAluno);
    }

    return result;
  },

  async criarComentario(
    dados: {
      publicacaoId: string;
      autorId: string;
      autorNome: string;
      autorAvatar?: string;
      autorPapel: "aluno" | "professor" | "admin" | "administrador";
      conteudo: string;
    },
    alunoValidador?: Aluno,
    turmasMatriculado: string[] = [],
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<ComentarioPublicacao>> {
    const textoComentario = (dados.conteudo || "").trim();
    if (!textoComentario || textoComentario.length < 2) {
      return { success: false, error: "O comentário deve conter pelo menos 2 caracteres." };
    }

    try {
      const supabase = getSupabase(clientOverride);
      const pub = await this.obterPublicacaoPorId(dados.publicacaoId, false, clientOverride);
      if (!pub) {
        return { success: false, error: "Publicação não encontrada." };
      }

      const espaco = await this.obterEspacoPorId(pub.espacoId, clientOverride);
      if (alunoValidador && espaco && dados.autorPapel === "aluno") {
        if (!alunoPodeComentarNoEspaco(espaco, alunoValidador, turmasMatriculado)) {
          return {
            success: false,
            error: "Você não possui permissão para comentar nesta publicação.",
          };
        }
      }

      const papel = dados.autorPapel || "aluno";
      const comId = `com-${Date.now()}`;
      const payload = {
        id: comId,
        publicacao_id: dados.publicacaoId,
        espaco_id: pub.espacoId,
        autor_id: dados.autorId,
        autor_nome: dados.autorNome,
        autor_papel: papel === "administrador" ? "admin" : papel,
        autor_avatar: dados.autorAvatar || null,
        conteudo: textoComentario,
        status: "publicado",
        total_curtidas: 0,
        metadata: {},
      };

      const { data, error } = await supabase
        .from("comentarios_comunidade")
        .insert(payload)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao criar comentário no Supabase: ${error.message}`,
        };
      }

      try {
        await supabase
          .from("publicacoes_comunidade")
          .update({ total_comentarios: (pub.comentariosCount || 0) + 1 })
          .eq("id", dados.publicacaoId);
      } catch {
        // Tolerante
      }

      return { success: true, data: mapRowToComentario(data as ComentarioDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao criar comentário: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  // ==========================================
  // MODERAÇÃO E DENÚNCIAS
  // ==========================================

  async denunciarConteudo(
    dados: {
      alvoTipo: "publicacao" | "comentario";
      alvoId: string;
      publicacaoId: string;
      denuncianteId: string;
      denuncianteNome: string;
      motivo: MotivoDenuncia;
      descricao?: string;
    },
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<DenunciaConteudo>> {
    try {
      const supabase = getSupabase(clientOverride);
      const denId = `den-${Date.now()}`;
      const payload = {
        id: denId,
        tipo_conteudo: dados.alvoTipo,
        conteudo_id: dados.alvoId,
        publicacao_id: dados.publicacaoId,
        motivo: dados.motivo,
        descricao: dados.descricao ? dados.descricao.trim() : null,
        denunciante_id: dados.denuncianteId,
        denunciante_nome: dados.denuncianteNome,
        status: "pendente",
        metadata: {},
      };

      const { data, error } = await supabase
        .from("denuncias_comunidade")
        .insert(payload)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao registrar denúncia no Supabase: ${error.message}`,
        };
      }

      const r = data as DenunciaDbRow;
      return {
        success: true,
        data: {
          id: r.id,
          tipoConteudo: r.tipo_conteudo as "publicacao" | "comentario",
          alvoTipo: r.tipo_conteudo as "publicacao" | "comentario",
          conteudoId: r.conteudo_id,
          alvoId: r.conteudo_id,
          publicacaoId: r.publicacao_id || dados.publicacaoId,
          motivo: r.motivo as MotivoDenuncia,
          descricao: r.descricao || undefined,
          denuncianteId: r.denunciante_id,
          denuncianteNome: r.denunciante_nome,
          status: r.status as DenunciaConteudo["status"],
          criadoEm: r.created_at,
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao registrar denúncia: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async listarDenuncias(clientOverride?: SupabaseClient): Promise<DenunciaConteudo[]> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("denuncias_comunidade")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`[Supabase Comunidade] Falha ao listar denúncias: ${error.message}`);
    }

    return ((data || []) as DenunciaDbRow[]).map((r) => ({
      id: r.id,
      tipoConteudo: r.tipo_conteudo as "publicacao" | "comentario",
      alvoTipo: r.tipo_conteudo as "publicacao" | "comentario",
      conteudoId: r.conteudo_id,
      alvoId: r.conteudo_id,
      publicacaoId: r.publicacao_id || r.conteudo_id,
      motivo: r.motivo as MotivoDenuncia,
      descricao: r.descricao || undefined,
      denuncianteId: r.denunciante_id,
      denuncianteNome: r.denunciante_nome,
      status: r.status as DenunciaConteudo["status"],
      criadoEm: r.created_at,
    }));
  },

  async moderarPublicacao(
    publicacaoId: string,
    acao: AcaoModeracao,
    motivo: string,
    moderadorId: string,
    moderadorNome: string,
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<PublicacaoComunidade>> {
    try {
      const supabase = getSupabase(clientOverride);
      const updates: Record<string, unknown> = {
        moderado_por_id: moderadorId,
        observacoes_internas: `[${acao.toUpperCase()}] por ${moderadorNome}: ${motivo}`,
      };

      if (acao === "ocultar") updates.status = "oculto_moderacao";
      else if (acao === "restaurar") updates.status = "publicado";
      else if (acao === "remover") updates.status = "removido";
      else if (acao === "arquivar") updates.status = "arquivada";
      else if (acao === "fixar") updates.fixada = true;
      else if (acao === "desafixar") updates.fixada = false;

      const { data, error } = await supabase
        .from("publicacoes_comunidade")
        .update(updates)
        .eq("id", publicacaoId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao moderar publicação no Supabase: ${error.message}`,
        };
      }

      return { success: true, data: mapRowToPublicacao(data as PublicacaoDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao moderar publicação: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async moderarComentario(
    comentarioId: string,
    acao: AcaoModeracao,
    motivo: string,
    moderadorId: string,
    moderadorNome: string,
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<ComentarioPublicacao>> {
    try {
      const supabase = getSupabase(clientOverride);
      const updates: Record<string, unknown> = {
        metadata: {
          acao,
          motivo,
          moderadorId,
          moderadorNome,
          moderadoEm: new Date().toISOString(),
        },
      };

      if (acao === "ocultar") updates.status = "oculto_moderacao";
      else if (acao === "restaurar") updates.status = "publicado";
      else if (acao === "remover") updates.status = "removido";

      const { data, error } = await supabase
        .from("comentarios_comunidade")
        .update(updates)
        .eq("id", comentarioId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao moderar comentário no Supabase: ${error.message}`,
        };
      }

      return { success: true, data: mapRowToComentario(data as ComentarioDbRow) };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao moderar comentário: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  // ==========================================
  // OPORTUNIDADES E INTERCÂMBIOS
  // ==========================================

  async listarOportunidades(clientOverride?: SupabaseClient): Promise<OportunidadeIntercambio[]> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("oportunidades_comunidade")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`[Supabase Comunidade] Falha ao listar oportunidades: ${error.message}`);
    }

    return ((data || []) as OportunidadeDbRow[]).map((r) => ({
      id: r.id,
      titulo: r.titulo,
      descricao: r.descricao,
      categoria: (r.categoria || "intercambio") as OportunidadeIntercambio["categoria"],
      paisDestino: r.pais || undefined,
      instituicaoParceira: r.instituicao || undefined,
      linkExterno: r.link_externo || undefined,
      nivelRecomendado: r.nivel_minimo || undefined,
      periodo: "Sob Demanda",
      status: (r.status || "ativa") as OportunidadeIntercambio["status"],
      candidatosCount: r.total_interessados || 0,
      criadoEm: r.created_at,
      atualizadoEm: r.updated_at,
    }));
  },

  async obterOportunidadePorId(id: string, clientOverride?: SupabaseClient): Promise<OportunidadeIntercambio | null> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("oportunidades_comunidade")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`[Supabase Comunidade] Falha ao obter oportunidade ${id}: ${error.message}`);
    }
    if (!data) return null;

    const r = data as OportunidadeDbRow;
    return {
      id: r.id,
      titulo: r.titulo,
      descricao: r.descricao,
      categoria: (r.categoria || "intercambio") as OportunidadeIntercambio["categoria"],
      paisDestino: r.pais || undefined,
      instituicaoParceira: r.instituicao || undefined,
      linkExterno: r.link_externo || undefined,
      nivelRecomendado: r.nivel_minimo || undefined,
      periodo: "Sob Demanda",
      status: (r.status || "ativa") as OportunidadeIntercambio["status"],
      candidatosCount: r.total_interessados || 0,
      criadoEm: r.created_at,
      atualizadoEm: r.updated_at,
    };
  },

  async registrarInteresseOportunidade(
    dados: {
      oportunidadeId: string;
      alunoId: string;
      alunoNome: string;
      alunoEmail: string;
      alunoNivelAtual?: string;
      observacoesAluno?: string;
    },
    clientOverride?: SupabaseClient
  ): Promise<OperationResult<InteresseOportunidade>> {
    try {
      const supabase = getSupabase(clientOverride);
      const intId = `int-${Date.now()}`;
      const payload = {
        id: intId,
        oportunidade_id: dados.oportunidadeId,
        aluno_id: dados.alunoId,
        aluno_nome: dados.alunoNome,
        email: dados.alunoEmail,
        nivel_atual: dados.alunoNivelAtual || null,
        mensagem: dados.observacoesAluno ? dados.observacoesAluno.trim() : null,
      };

      const { data, error } = await supabase
        .from("interesses_oportunidades")
        .insert(payload)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Erro ao manifestar interesse no Supabase: ${error.message}`,
        };
      }

      // Incrementa total_interessados de forma defensiva
      try {
        const op = await this.obterOportunidadePorId(dados.oportunidadeId, clientOverride);
        if (op) {
          await supabase
            .from("oportunidades_comunidade")
            .update({ total_interessados: (op.candidatosCount || 0) + 1 })
            .eq("id", dados.oportunidadeId);
        }
      } catch {
        // Tolerante
      }

      const row = data as InteresseDbRow;
      return {
        success: true,
        data: {
          id: row.id,
          oportunidadeId: row.oportunidade_id,
          alunoId: row.aluno_id,
          alunoNome: row.aluno_nome,
          alunoEmail: row.email,
          alunoNivelAtual: row.nivel_atual || undefined,
          observacoesAluno: row.mensagem || undefined,
          dataRegistro: row.created_at,
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: `Falha de conexão com o Supabase ao manifestar interesse: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },

  async listarInteressesPorOportunidade(
    oportunidadeId: string,
    clientOverride?: SupabaseClient
  ): Promise<InteresseOportunidade[]> {
    const supabase = getSupabase(clientOverride);
    const { data, error } = await supabase
      .from("interesses_oportunidades")
      .select("*")
      .eq("oportunidade_id", oportunidadeId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`[Supabase Comunidade] Falha ao listar interesses da oportunidade ${oportunidadeId}: ${error.message}`);
    }

    return ((data || []) as InteresseDbRow[]).map((row) => ({
      id: row.id,
      oportunidadeId: row.oportunidade_id,
      alunoId: row.aluno_id,
      alunoNome: row.aluno_nome,
      alunoEmail: row.email,
      alunoNivelAtual: row.nivel_atual || undefined,
      mensagem: row.mensagem || undefined,
      dataRegistro: row.created_at,
    }));
  },

  // ==========================================
  // MÉTRICAS ADMINISTRATIVAS
  // ==========================================

  async obterMetricasAdmin(clientOverride?: SupabaseClient): Promise<MetricasComunidadeAdmin> {
    const [espacos, pubs, denuncias, oportunidades] = await Promise.all([
      this.listarEspacos(true, undefined, [], clientOverride),
      this.listarPublicacoes(undefined, false, clientOverride),
      this.listarDenuncias(clientOverride),
      this.listarOportunidades(clientOverride),
    ]);

    const totalPublicacoes = pubs.length;
    const totalComentarios = pubs.reduce((acc, p) => acc + (p.comentariosCount || 0), 0);
    const denunciasPendentes = denuncias.filter((d) => d.status === "pendente").length;

    return {
      totalEspacosAtivos: espacos.filter((e) => e.status === "ativo").length,
      totalPublicacoes,
      totalComentarios,
      totalReacoes: pubs.reduce((acc, p) => acc + (p.reacoesCount || 0), 0),
      publicacoesFixadas: pubs.filter((p) => p.fixada).length,
      denunciasPendentes,
      oportunidadesAbertas: oportunidades.filter((o) => o.status === "aberta" || o.status === "ativa").length,
      interessesPendentes: 0,
    };
  },
};
