/**
 * scripts/provision-homologacao-aluno.ts
 *
 * PROVISIONAMENTO CONTROLADO DO ALUNO DE HOMOLOGAÇÃO (ETAPA 10.3C - P0-3)
 * Projeto: DEMOSTRATIVO MTD — Método Paulo
 *
 * AVISO DE SEGURANÇA:
 * Este script NÃO deve ser executado de forma autônoma sem autorização humana formal.
 * Por padrão, o script encerra no modo de validação estática/pre-flight sem executar escritas.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as assert from "assert";
import { execSync } from "child_process";

if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as any).WebSocket = class DummyWebSocket {};
}

/**
 * Executa RPC administrativa via conexão PostgreSQL direta vinculada com contexto de Ray Pires.
 * Parte 2 da Estratégia Dual de Autenticação.
 */
export function executeRpcWithAdminContext(
  fnName: string,
  params: Record<string, any>,
  adminUid: string
): { data: any; error: any } {
  const tmpFile = path.join("/tmp", `rpc_${fnName}_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`);

  let sql = `
    SELECT set_config('role', 'authenticated', true);
    SELECT set_config('request.jwt.claims', json_build_object('sub', '${adminUid}', 'role', 'authenticated')::text, true);
  `;

  if (fnName === "agendar_aula") {
    sql += `
      SELECT public.agendar_aula(
        p_turma_id := '${params.p_turma_id}'::uuid,
        p_professor_id := '${params.p_professor_id}'::uuid,
        p_titulo := '${params.p_titulo.replace(/'/g, "''")}',
        p_inicio_em := '${params.p_inicio_em}'::timestamptz,
        p_fim_em := '${params.p_fim_em}'::timestamptz,
        p_meeting_url := ${params.p_meeting_url ? `'${params.p_meeting_url}'` : "NULL"},
        p_observacoes := ${params.p_observacoes ? `'${params.p_observacoes.replace(/'/g, "''")}'` : "NULL"}
      ) as id;
    `;
  } else if (fnName === "salvar_chamada_aula") {
    const chamadaJson = JSON.stringify(params.p_chamada || params.p_presencas).replace(/'/g, "''");
    sql += `
      SELECT public.salvar_chamada_aula(
        p_aula_id := '${params.p_aula_id}'::uuid,
        p_chamada := '${chamadaJson}'::jsonb
      );
    `;
  } else if (fnName === "concluir_aula") {
    sql += `
      SELECT public.concluir_aula(
        p_aula_id := '${params.p_aula_id}'::uuid,
        p_confirmar_pendencias := ${params.p_confirmar_pendencias ? "true" : "false"}
      );
    `;
  } else if (fnName === "calcular_frequencia_aluno") {
    sql += `
      SELECT public.calcular_frequencia_aluno(
        p_aluno_id := '${params.p_aluno_id}'::uuid,
        p_turma_id := ${params.p_turma_id ? `'${params.p_turma_id}'::uuid` : "NULL"}
      ) as frequencia;
    `;
  } else {
    throw new Error(`RPC não mapeada na estratégia direta: ${fnName}`);
  }

  fs.writeFileSync(tmpFile, sql, "utf8");
  try {
    const stdout = execSync(`npx supabase db query --linked -f ${tmpFile}`, {
      cwd: "/Users/raypires/.gemini/antigravity/scratch/demonstrativo-mtd",
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30000,
    });
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);

    const firstBrace = stdout.indexOf("{");
    const lastBrace = stdout.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      const parsed = JSON.parse(stdout.substring(firstBrace, lastBrace + 1));
      if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
        const row = parsed.rows[0];
        if (row.id !== undefined) return { data: row.id, error: null };
        if (row.frequencia !== undefined) return { data: row.frequencia, error: null };
        return { data: true, error: null };
      }
    }
    return { data: true, error: null };
  } catch (err: any) {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    const combined = (err.stdout || "") + "\n" + (err.stderr || "") + "\n" + (err.message || "");
    return { data: null, error: { message: combined } };
  }
}

// ==============================================================================
// 1. CONSTANTES E CONFIGURAÇÃO
// ==============================================================================

export const STATE_FILE = path.join(process.cwd(), "scripts", ".provisioning-state.json");
export const SECRET_LINK_FILE = path.join(process.cwd(), "scripts", ".primeiro-acesso.secret");
export const EXPECTED_ENVIRONMENT = "homologacao_p0_3";
export const EXPECTED_VERSION = "1.0";
export const IANA_TIMEZONE = "America/Sao_Paulo";

// Entidades Sintéticas Alvo
export const TARGET_EMAIL = "homologacao.aluno@escolapaulo.com.br";
export const TARGET_NOME = "Aluno Homologação MTD";
export const TARGET_TURMA_NOME = "Turma Homologação A1";
export const TARGET_NIVEL = "A1";
export const TARGET_OBJETIVO = "Homologação do Portal do Aluno";

// Identificadores Fixos de Referência (Auditados no Banco)
export const PROFESSOR_EDER_ID = "efeb8576-aa79-483d-8c19-79d0ff6a9c8a";
export const RAY_PIRES_ID = "660640d2-99fc-46e7-8e12-9ef0d67b60ee";
export const ALUNO_TESTE_ID = "bad6c08f-c0c3-4115-8dbb-130e110691ad";

// URL de Redirecionamento da Branch etapa-10-backend (Vercel Preview)
// PENDÊNCIA OBRIGATÓRIA: Exige confirmação prévia no dashboard Supabase Auth -> URL Configuration -> Redirect URLs
export const PREVIEW_REDIRECT_URL =
  process.env.AUTH_REDIRECT_URL ||
  "https://demonstrativo-q69j9tdy2-r71020142-6352s-projects.vercel.app/auth/callback?next=/redefinir-senha";

// Linha de Base de Atributos Críticos de Identidade (Snapshot Congelado de Proteção)
export const EXPECTED_BASELINE = {
  ray_auth: {
    id: RAY_PIRES_ID,
    email: "r71020142@gmail.com",
    role: "authenticated",
    banned_until: null,
    user_metadata: { email_verified: true },
  },
  ray_perfil: {
    id: RAY_PIRES_ID,
    email: "r71020142@gmail.com",
    nome_completo: "Ray Pires",
    role: "admin",
    status: "ativo",
    aluno_id: null,
    professor_id: null,
    telefone: null,
    avatar_url: null,
  },
  aluno_teste: {
    id: ALUNO_TESTE_ID,
    email: "teste@gmail.com",
    nome_completo: "teste",
    perfil_id: null,
    status: "ativo",
    nivel_operacional: "A1",
    objetivo: "viagem trabalho",
    telefone: "1198767889",
    avatar_url: null,
  },
  prof_eder: {
    id: PROFESSOR_EDER_ID,
    email: "ederonex@gmail.com",
    nome_completo: "Teste Eder",
    perfil_id: null,
    status: "ativo",
    telefone: null,
    avatar_url: null,
  },
};

// ==============================================================================
// 2. INTERFACES DE DADOS E ESTADO
// ==============================================================================

export interface ProvisioningState {
  version: string;
  environment: string;
  targetEmail: string;
  completedSteps: string[];
  entities: {
    authUserId?: string;
    perfilId?: string;
    alunoId?: string;
    turmaId?: string;
    matriculaId?: string;
    aulaConcluidaId?: string;
    aulaFuturaId?: string;
  };
  secretFileCreated: boolean;
  secretDiscarded: boolean;
  lastUpdated: string;
}

export interface RPCFrequenciaRetorno {
  totalAulasConcluidas: number;
  presentes: number;
  totalPresentes: number;
  ausentes: number;
  totalAusentes: number;
  justificados: number;
  totalJustificados: number;
  naoRegistrados: number;
  porcentagem: number | null;
  formulaExplicativa: string;
}

export interface DescarteResultado {
  success: boolean;
  fileExisted: boolean;
  message: string;
}

// ==============================================================================
// 3. UTILITÁRIOS: TEMPO, CALENDÁRIO, ARQUIVOS E ESTADO ATÔMICO
// ==============================================================================

/**
 * Calcula a quantidade de dias de um determinado mês e ano (inclui bissextos).
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Converte data e hora civil no fuso IANA (America/Sao_Paulo) para string ISO UTC.
 * Rejeita formatos inválidos e datas inexistentes no calendário (ex: 2026-02-30).
 */
export function localToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string = IANA_TIMEZONE
): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(dateStr)) {
    throw new Error(`Formato de data inválido: "${dateStr}" (esperado YYYY-MM-DD)`);
  }
  if (!/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr)) {
    throw new Error(`Formato de horário inválido: "${timeStr}" (esperado HH:mm entre 00:00 e 23:59)`);
  }

  const [year, month, day] = dateStr.split("-").map(Number);
  const maxDays = daysInMonth(year, month);
  if (day > maxDays) {
    throw new Error(
      `Data inexistente no calendário: "${dateStr}" (mês ${month}/${year} possui no máximo ${maxDays} dias)`
    );
  }

  const [hour, minute] = timeStr.split(":").map(Number);
  const naiveUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(naiveUtc);
  const partMap: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      partMap[part.type] = parseInt(part.value, 10);
    }
  }

  let tzHour = partMap.hour;
  if (tzHour === 24) tzHour = 0;

  const targetDateInTz = new Date(
    Date.UTC(
      partMap.year,
      partMap.month - 1,
      partMap.day,
      tzHour,
      partMap.minute,
      partMap.second || 0
    )
  );

  const offsetMs = targetDateInTz.getTime() - naiveUtc.getTime();
  const realUtc = new Date(naiveUtc.getTime() - offsetMs);
  return realUtc.toISOString();
}

/**
 * Persiste o estado em disco de forma estritamente atômica via arquivo temporário
 * e renomeação unificada (fs.renameSync), com permissão POSIX 0o600.
 */
export function salvarEstadoAtomico(state: ProvisioningState, customPath: string = STATE_FILE): void {
  state.lastUpdated = new Date().toISOString();
  const tempPath = `${customPath}.tmp.${crypto.randomUUID()}`;
  const serialized = JSON.stringify(state, null, 2);

  const scriptsDir = path.dirname(customPath);
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true, mode: 0o700 });
  }

  fs.writeFileSync(tempPath, serialized, { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(tempPath, customPath);
}

/**
 * Carrega e valida o arquivo de estado. Se o arquivo estiver corrompido ou inconsistente,
 * interrompe a execução com erro fatal em vez de sobrescrever silenciosamente.
 */
export function carregarEstadoValido(customPath: string = STATE_FILE): ProvisioningState {
  if (!fs.existsSync(customPath)) {
    return {
      version: EXPECTED_VERSION,
      environment: EXPECTED_ENVIRONMENT,
      targetEmail: TARGET_EMAIL,
      completedSteps: [],
      entities: {},
      secretFileCreated: false,
      secretDiscarded: false,
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    const raw = fs.readFileSync(customPath, "utf-8");
    const parsed = JSON.parse(raw) as ProvisioningState;

    if (parsed.version !== EXPECTED_VERSION) {
      throw new Error(`Versão do arquivo de estado incompatível: ${parsed.version} (esperada: ${EXPECTED_VERSION})`);
    }
    if (parsed.environment !== EXPECTED_ENVIRONMENT) {
      throw new Error(`Ambiente divergente no estado: ${parsed.environment} (esperado: ${EXPECTED_ENVIRONMENT})`);
    }
    if (parsed.targetEmail !== TARGET_EMAIL) {
      throw new Error(`E-mail alvo divergente no estado: ${parsed.targetEmail} (esperado: ${TARGET_EMAIL})`);
    }
    if (!Array.isArray(parsed.completedSteps) || typeof parsed.entities !== "object") {
      throw new Error("Estrutura interna do arquivo de estado está corrompida.");
    }

    return parsed;
  } catch (err: any) {
    throw new Error(`[ERRO CRÍTICO] Falha ao carregar estado existente: ${err.message}. Abortando para segurança.`);
  }
}

/**
 * Sobrescreve o arquivo de segredo efêmero com bytes aleatórios, zera e remove do disco.
 * Retorna resultado explícito e propaga falhas de deleção.
 */
export function descartarSegredoPrimeiroAcesso(customSecretFile: string = SECRET_LINK_FILE): DescarteResultado {
  if (!fs.existsSync(customSecretFile)) {
    return {
      success: false,
      fileExisted: false,
      message: `Arquivo de segredo não encontrado em "${customSecretFile}". Nenhuma exclusão necessária.`,
    };
  }

  try {
    const stat = fs.statSync(customSecretFile);
    const size = stat.size;

    // 1. Sobrescrita com bytes pseudoaleatórios criptográficos
    if (size > 0) {
      const randomBytes = crypto.randomBytes(size);
      fs.writeFileSync(customSecretFile, randomBytes, { mode: 0o600 });

      // 2. Sobrescrita com zeros
      const zeroBytes = Buffer.alloc(size, 0);
      fs.writeFileSync(customSecretFile, zeroBytes, { mode: 0o600 });
    }

    // 3. Remoção do arquivo
    fs.unlinkSync(customSecretFile);

    // 4. Verificação estrita de ausência pós-unlink
    if (fs.existsSync(customSecretFile)) {
      throw new Error("Arquivo de segredo ainda persiste após tentativa de unlinkSync.");
    }

    return {
      success: true,
      fileExisted: true,
      message: "Arquivo de segredo sobrescrito criptograficamente e removido com sucesso.",
    };
  } catch (err: any) {
    throw new Error(`[FALHA DE EXCLUSÃO] Não foi possível descartar com segurança o segredo: ${err.message}`);
  }
}

// ==============================================================================
// 4. BUSCA PAGINADA E REVALIDAÇÃO COMPLETA DE ENTIDADES
// ==============================================================================

/**
 * Busca usuário Auth por e-mail com paginação completa (evita limite de 1 página).
 */
export async function findAuthUserByEmail(supabase: any, email: string): Promise<any | null> {
  const targetLower = email.toLowerCase().trim();
  let page = 1;
  const perPage = 100;
  const matches: any[] = [];

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`[ERRO AUTH] Falha ao consultar lista de usuários (página ${page}): ${error.message}`);
    }
    const users = data?.users || [];
    for (const u of users) {
      if (u.email && u.email.toLowerCase().trim() === targetLower) {
        matches.push(u);
      }
    }
    if (users.length < perPage) {
      break;
    }
    page++;
    if (page > 100) {
      throw new Error("[ERRO AUTH] Paginação de usuários excedeu o limite de segurança de 100 páginas (10.000 usuários).");
    }
  }

  if (matches.length > 1) {
    throw new Error(
      `[AMBIGUIDADE CRÍTICA] Foram encontrados ${matches.length} usuários Auth com o e-mail "${email}". Interrompendo.`
    );
  }

  return matches[0] || null;
}

/**
 * Revalida ou reconcilia usuário Auth do aluno de homologação.
 */
export async function revalidarUsuarioAuth(
  supabase: any,
  state: ProvisioningState,
  customStatePath?: string
): Promise<string | null> {
  if (state.entities.authUserId) {
    const { data, error } = await supabase.auth.admin.getUserById(state.entities.authUserId);
    if (error || !data?.user) {
      throw new Error(
        `[DIVERGÊNCIA] authUserId registrado no estado (${state.entities.authUserId}) não foi localizado no Supabase: ${error?.message}`
      );
    }
    if (data.user.email?.toLowerCase().trim() !== TARGET_EMAIL.toLowerCase().trim()) {
      throw new Error(
        `[DIVERGÊNCIA] E-mail do usuário auth (${data.user.email}) não corresponde ao alvo (${TARGET_EMAIL}).`
      );
    }
    return data.user.id;
  }

  // Se não há ID no estado, pesquisa paginação completa
  const match = await findAuthUserByEmail(supabase, TARGET_EMAIL);
  if (match) {
    console.log(`  ℹ Usuário Auth pré-existente reconciliado para o estado: ${match.id}`);
    state.entities.authUserId = match.id;
    salvarEstadoAtomico(state, customStatePath || STATE_FILE);
    return match.id;
  }

  return null;
}

/**
 * Revalida ou reconcilia Perfil e Aluno.
 */
export async function revalidarPerfilEAluno(
  supabase: any,
  authUserId: string,
  state: ProvisioningState,
  customStatePath?: string
): Promise<{ perfilId: string; alunoId: string } | null> {
  // 1. Consulta Perfil
  const { data: perfil, error: pErr } = await supabase
    .from("perfis")
    .select("id, email, nome_completo, role, status, aluno_id")
    .eq("id", authUserId)
    .maybeSingle();

  if (pErr) throw new Error(`[ERRO BD] Falha ao consultar perfil: ${pErr.message}`);
  if (!perfil) return null;

  assert.strictEqual(perfil.email, TARGET_EMAIL, "E-mail do perfil divergiu do alvo");
  assert.strictEqual(perfil.role, "aluno", "Role do perfil divergiu de 'aluno'");
  assert.strictEqual(perfil.status, "ativo", "Status do perfil não está ativo");

  // 2. Consulta Aluno vinculado por perfil_id
  let { data: aluno, error: aErr } = await supabase
    .from("alunos")
    .select("id, perfil_id, email, nome_completo, status, nivel_operacional, objetivo")
    .eq("perfil_id", authUserId)
    .maybeSingle();

  if (aErr) throw new Error(`[ERRO BD] Falha ao consultar aluno por perfil_id: ${aErr.message}`);

  // Se não achou por perfil_id, busca por e-mail para detectar registros criados antes da vinculação
  if (!aluno) {
    const { data: alunosPorEmail, error: aEmailErr } = await supabase
      .from("alunos")
      .select("id, perfil_id, email, nome_completo, status, nivel_operacional, objetivo")
      .eq("email", TARGET_EMAIL);

    if (aEmailErr) throw new Error(`[ERRO BD] Falha ao consultar aluno por email: ${aEmailErr.message}`);
    if (alunosPorEmail && alunosPorEmail.length > 1) {
      throw new Error(`[AMBIGUIDADE] Múltiplos registros de aluno encontrados para o e-mail ${TARGET_EMAIL}.`);
    }
    if (alunosPorEmail && alunosPorEmail.length === 1) {
      aluno = alunosPorEmail[0];
      // Reconcilia vinculação se estiver nula
      if (!aluno.perfil_id) {
        const { error: vincErr } = await supabase.from("alunos").update({ perfil_id: authUserId }).eq("id", aluno.id);
        if (vincErr) throw new Error(`[ERRO BD] Falha ao vincular perfil_id no aluno: ${vincErr.message}`);
        aluno.perfil_id = authUserId;
      }
    }
  }

  if (!aluno) {
    return null; // Perfil existe mas Aluno ainda precisa ser criado
  }

  assert.strictEqual(aluno.email, TARGET_EMAIL, "E-mail do aluno divergiu");
  assert.strictEqual(aluno.status, "ativo", "Status do aluno divergiu");
  assert.strictEqual(aluno.nivel_operacional, TARGET_NIVEL, "Nível operacional do aluno divergiu");

  // Garante vínculo recíproco em perfis.aluno_id
  if (perfil.aluno_id !== aluno.id) {
    const { error: pLinkErr } = await supabase.from("perfis").update({ aluno_id: aluno.id }).eq("id", authUserId);
    if (pLinkErr) throw new Error(`[ERRO BD] Falha ao atualizar perfis.aluno_id: ${pLinkErr.message}`);
    perfil.aluno_id = aluno.id;
  }

  // Reconcilia estado local
  state.entities.perfilId = perfil.id;
  state.entities.alunoId = aluno.id;
  salvarEstadoAtomico(state, customStatePath || STATE_FILE);

  return { perfilId: perfil.id, alunoId: aluno.id };
}

/**
 * Revalida ou reconcilia Turma Individual de Homologação.
 */
export async function revalidarTurma(
  supabase: any,
  state: ProvisioningState,
  customStatePath?: string
): Promise<string | null> {
  if (state.entities.turmaId) {
    const { data: turma, error } = await supabase
      .from("turmas")
      .select("id, nome, professor_id, modalidade, capacidade, status")
      .eq("id", state.entities.turmaId)
      .maybeSingle();

    if (error || !turma) {
      throw new Error(`[DIVERGÊNCIA] turmaId no estado (${state.entities.turmaId}) não existe no banco: ${error?.message}`);
    }
    assert.strictEqual(turma.nome, TARGET_TURMA_NOME, "Nome da turma divergiu");
    assert.strictEqual(turma.professor_id, PROFESSOR_EDER_ID, "Professor da turma divergiu de Eder");
    assert.strictEqual(turma.modalidade, "individual", "Modalidade da turma divergiu de 'individual'");
    assert.strictEqual(turma.capacidade, 1, "Capacidade da turma individual divergiu de 1");
    assert.strictEqual(turma.status, "ativa", "Status da turma divergiu de 'ativa'");
    return turma.id;
  }

  // Busca candidatos específicos por nome e professor
  const { data: turmas, error: tErr } = await supabase
    .from("turmas")
    .select("id, nome, professor_id, modalidade, capacidade, status")
    .eq("nome", TARGET_TURMA_NOME)
    .eq("professor_id", PROFESSOR_EDER_ID);

  if (tErr) throw new Error(`[ERRO BD] Falha ao consultar turmas candidatas: ${tErr.message}`);
  if (!turmas || turmas.length === 0) return null;

  if (turmas.length > 1) {
    throw new Error(`[AMBIGUIDADE] Múltiplas turmas com o nome "${TARGET_TURMA_NOME}" encontradas para o professor.`);
  }

  const candidate = turmas[0];
  assert.strictEqual(candidate.modalidade, "individual", "Turma candidata possui modalidade incompatível");
  assert.strictEqual(candidate.capacidade, 1, "Turma candidata possui capacidade incompatível");
  assert.strictEqual(candidate.status, "ativa", "Turma candidata não está ativa");

  console.log(`  ℹ Turma pré-existente reconciliada para o estado: ${candidate.id}`);
  state.entities.turmaId = candidate.id;
  salvarEstadoAtomico(state, customStatePath || STATE_FILE);
  return candidate.id;
}

/**
 * Revalida ou reconcilia Matrícula do aluno na turma.
 */
export async function revalidarMatricula(
  supabase: any,
  turmaId: string,
  alunoId: string,
  state: ProvisioningState,
  dataLimiteInicioAula: string,
  customStatePath?: string
): Promise<string | null> {
  if (state.entities.matriculaId) {
    const { data: mat, error } = await supabase
      .from("matriculas_turmas")
      .select("id, turma_id, aluno_id, status, matriculado_em")
      .eq("id", state.entities.matriculaId)
      .maybeSingle();

    if (error || !mat) {
      throw new Error(`[DIVERGÊNCIA] matriculaId (${state.entities.matriculaId}) não localizado no banco: ${error?.message}`);
    }
    assert.strictEqual(mat.turma_id, turmaId, "turma_id da matrícula divergiu");
    assert.strictEqual(mat.aluno_id, alunoId, "aluno_id da matrícula divergiu");
    assert.strictEqual(mat.status, "ativa", "Status da matrícula divergiu de 'ativa'");

    if (new Date(mat.matriculado_em) > new Date(dataLimiteInicioAula)) {
      throw new Error(
        `[INCOERÊNCIA TEMPORAL] matriculado_em (${mat.matriculado_em}) é posterior ao início da aula (${dataLimiteInicioAula}).`
      );
    }
    return mat.id;
  }

  // Busca candidatos por turma_id e aluno_id
  const { data: matriculas, error: mErr } = await supabase
    .from("matriculas_turmas")
    .select("id, turma_id, aluno_id, status, matriculado_em")
    .eq("turma_id", turmaId)
    .eq("aluno_id", alunoId);

  if (mErr) throw new Error(`[ERRO BD] Falha ao consultar matrículas candidatas: ${mErr.message}`);
  if (!matriculas || matriculas.length === 0) return null;

  if (matriculas.length > 1) {
    throw new Error(`[AMBIGUIDADE] Múltiplas matrículas encontradas para o mesmo aluno na turma.`);
  }

  const candidate = matriculas[0];
  assert.strictEqual(candidate.status, "ativa", "Matrícula candidata não está ativa");

  console.log(`  ℹ Matrícula pré-existente reconciliada para o estado: ${candidate.id}`);
  state.entities.matriculaId = candidate.id;
  salvarEstadoAtomico(state, customStatePath || STATE_FILE);
  return candidate.id;
}

/**
 * Revalida ou reconcilia Aula Concluída e Presença.
 */
export async function revalidarAulaConcluida(
  supabase: any,
  turmaId: string,
  alunoId: string,
  state: ProvisioningState,
  inicioEsperadoIso: string,
  customStatePath?: string
): Promise<string | null> {
  if (state.entities.aulaConcluidaId) {
    const { data: aula, error } = await supabase
      .from("aulas")
      .select("id, turma_id, professor_id, status, inicio_em, fim_em")
      .eq("id", state.entities.aulaConcluidaId)
      .maybeSingle();

    if (error || !aula) {
      throw new Error(`[DIVERGÊNCIA] aulaConcluidaId (${state.entities.aulaConcluidaId}) não localizada: ${error?.message}`);
    }
    assert.strictEqual(aula.turma_id, turmaId, "Turma da aula concluída divergiu");
    assert.strictEqual(aula.professor_id, PROFESSOR_EDER_ID, "Professor da aula concluída divergiu");
    assert.strictEqual(aula.status, "concluida", "Status da aula divergiu de 'concluida'");

    const { data: presenca, error: pErr } = await supabase
      .from("presencas_aulas")
      .select("status")
      .eq("aula_id", aula.id)
      .eq("aluno_id", alunoId)
      .single();

    if (pErr || !presenca) {
      throw new Error(`Presença do aluno na aula concluída não foi localizada: ${pErr?.message}`);
    }
    assert.strictEqual(presenca.status, "presente", "Status da presença na aula concluída divergiu de 'presente'");
    return aula.id;
  }

  // Busca candidatos por turma e horário de início
  const { data: aulas, error: aErr } = await supabase
    .from("aulas")
    .select("id, turma_id, professor_id, status, inicio_em, fim_em")
    .eq("turma_id", turmaId)
    .eq("inicio_em", inicioEsperadoIso);

  if (aErr) throw new Error(`[ERRO BD] Falha ao consultar aulas candidatas: ${aErr.message}`);
  if (!aulas || aulas.length === 0) return null;

  if (aulas.length > 1) {
    throw new Error(`[AMBIGUIDADE] Múltiplas aulas encontradas no mesmo horário de início para a turma.`);
  }

  const candidate = aulas[0];
  assert.strictEqual(candidate.professor_id, PROFESSOR_EDER_ID, "Professor da aula candidata divergiu");

  // Se a aula foi criada mas a conclusão ou presença caiu antes de salvar estado:
  if (candidate.status === "concluida") {
    const { data: presenca } = await supabase
      .from("presencas_aulas")
      .select("status")
      .eq("aula_id", candidate.id)
      .eq("aluno_id", alunoId)
      .maybeSingle();
    assert.strictEqual(presenca?.status, "presente", "Presença na aula concluída candidata deve ser 'presente'");
  }

  console.log(`  ℹ Aula concluída pré-existente reconciliada para o estado: ${candidate.id}`);
  state.entities.aulaConcluidaId = candidate.id;
  salvarEstadoAtomico(state, customStatePath || STATE_FILE);
  return candidate.id;
}

/**
 * Revalida ou reconcilia Aula Futura Agendada.
 */
export async function revalidarAulaFutura(
  supabase: any,
  turmaId: string,
  alunoId: string,
  state: ProvisioningState,
  inicioEsperadoIso: string,
  customStatePath?: string
): Promise<string | null> {
  if (state.entities.aulaFuturaId) {
    const { data: aula, error } = await supabase
      .from("aulas")
      .select("id, turma_id, professor_id, status, meeting_url")
      .eq("id", state.entities.aulaFuturaId)
      .maybeSingle();

    if (error || !aula) {
      throw new Error(`[DIVERGÊNCIA] aulaFuturaId (${state.entities.aulaFuturaId}) não localizada: ${error?.message}`);
    }
    assert.strictEqual(aula.turma_id, turmaId, "Turma da aula futura divergiu");
    assert.strictEqual(aula.professor_id, PROFESSOR_EDER_ID, "Professor da aula futura divergiu");
    assert.strictEqual(aula.status, "agendada", "Status da aula futura divergiu de 'agendada'");
    assert.strictEqual(aula.meeting_url, null, "meeting_url da aula futura deve ser estritamente null");

    const { data: presenca, error: pErr } = await supabase
      .from("presencas_aulas")
      .select("status")
      .eq("aula_id", aula.id)
      .eq("aluno_id", alunoId)
      .single();

    if (pErr || !presenca) {
      throw new Error(`Presença da aula futura não encontrada: ${pErr?.message}`);
    }
    assert.strictEqual(presenca.status, "nao_registrado", "Status da presença da aula futura deve ser 'nao_registrado'");
    return aula.id;
  }

  // Busca candidatos por turma e horário de início
  const { data: aulas, error: aErr } = await supabase
    .from("aulas")
    .select("id, turma_id, professor_id, status, meeting_url")
    .eq("turma_id", turmaId)
    .eq("inicio_em", inicioEsperadoIso);

  if (aErr) throw new Error(`[ERRO BD] Falha ao consultar aulas futuras candidatas: ${aErr.message}`);
  if (!aulas || aulas.length === 0) return null;

  if (aulas.length > 1) {
    throw new Error(`[AMBIGUIDADE] Múltiplas aulas futuras encontradas no mesmo horário.`);
  }

  const candidate = aulas[0];
  assert.strictEqual(candidate.professor_id, PROFESSOR_EDER_ID, "Professor da aula futura divergiu");
  assert.strictEqual(candidate.status, "agendada", "Status da aula futura divergiu de 'agendada'");
  assert.strictEqual(candidate.meeting_url, null, "meeting_url da aula futura deve ser null");

  console.log(`  ℹ Aula futura pré-existente reconciliada para o estado: ${candidate.id}`);
  state.entities.aulaFuturaId = candidate.id;
  salvarEstadoAtomico(state, customStatePath || STATE_FILE);
  return candidate.id;
}

// ==============================================================================
// 5. VALIDAÇÃO DEFENSIVA DE CONTRATO DA RPC DE FREQUÊNCIA
// ==============================================================================

/**
 * Valida o formato da resposta de calcular_frequencia_aluno antes de acessar propriedades.
 */
export function validarRespostaFrequencia(raw: unknown): RPCFrequenciaRetorno {
  if (!raw || typeof raw !== "object") {
    throw new Error(
      `[CONTRATO RPC] Retorno de calcular_frequencia_aluno não é um objeto JSON válido (tipo recebido: ${typeof raw})`
    );
  }
  const obj = raw as Record<string, unknown>;
  const requiredNumberFields = ["totalAulasConcluidas", "presentes", "ausentes", "justificados", "naoRegistrados"];
  for (const f of requiredNumberFields) {
    if (typeof obj[f] !== "number") {
      throw new Error(
        `[CONTRATO RPC] Campo obrigatório "${f}" ausente ou não numérico no retorno de calcular_frequencia_aluno: ${obj[f]}`
      );
    }
  }
  if (obj.porcentagem !== null && typeof obj.porcentagem !== "number") {
    throw new Error(`[CONTRATO RPC] Campo "porcentagem" inválido no retorno: ${obj.porcentagem}`);
  }
  if (typeof obj.formulaExplicativa !== "string") {
    throw new Error(`[CONTRATO RPC] Campo "formulaExplicativa" ausente ou inválido no retorno.`);
  }
  return obj as unknown as RPCFrequenciaRetorno;
}

// ==============================================================================
// 6. VERIFICAÇÃO DE BASELINE (FAIL-CLOSED)
// ==============================================================================

export async function verifyBaseline(supabase: any, label: "PRÉ" | "PÓS"): Promise<void> {
  console.log(`[${label}-VERIFICAÇÃO] Auditando integridade do baseline de identidade...`);

  // 1. Ray Pires Auth
  const { data: rayAuthUser, error: rayAuthErr } = await supabase.auth.admin.getUserById(RAY_PIRES_ID);
  if (rayAuthErr || !rayAuthUser?.user) {
    throw new Error(`[BASELINE FALHA] Usuário auth de Ray Pires não localizado: ${rayAuthErr?.message}`);
  }
  assert.strictEqual(rayAuthUser.user.id, EXPECTED_BASELINE.ray_auth.id, "ID auth de Ray Pires divergiu");
  assert.strictEqual(rayAuthUser.user.email, EXPECTED_BASELINE.ray_auth.email, "E-mail auth de Ray Pires divergiu");
  assert.strictEqual(rayAuthUser.user.role, EXPECTED_BASELINE.ray_auth.role, "Role auth de Ray Pires divergiu");
  assert.strictEqual(rayAuthUser.user.banned_until ?? null, EXPECTED_BASELINE.ray_auth.banned_until, "banned_until divergiu");
  assert.deepStrictEqual(
    rayAuthUser.user.user_metadata,
    EXPECTED_BASELINE.ray_auth.user_metadata,
    "user_metadata de Ray Pires divergiu"
  );

  // 2. Ray Pires Perfil
  const { data: rayPerfil, error: rayPerfilErr } = await supabase
    .from("perfis")
    .select("id, email, nome_completo, role, status, aluno_id, professor_id, telefone, avatar_url")
    .eq("id", RAY_PIRES_ID)
    .single();

  if (rayPerfilErr || !rayPerfil) {
    throw new Error(`[BASELINE FALHA] Perfil de Ray Pires não localizado: ${rayPerfilErr?.message}`);
  }
  assert.deepStrictEqual(rayPerfil, EXPECTED_BASELINE.ray_perfil, "Campos do perfil de Ray Pires divergiram");

  // 3. Aluno teste@gmail.com
  const { data: alunoTeste, error: aluErr } = await supabase
    .from("alunos")
    .select("id, email, nome_completo, perfil_id, status, nivel_operacional, objetivo, telefone, avatar_url")
    .eq("id", ALUNO_TESTE_ID)
    .single();

  if (aluErr || !alunoTeste) {
    throw new Error(`[BASELINE FALHA] Aluno teste@gmail.com não localizado: ${aluErr?.message}`);
  }
  assert.deepStrictEqual(alunoTeste, EXPECTED_BASELINE.aluno_teste, "Campos de teste@gmail.com divergiram");

  // 4. Professor ederonex@gmail.com
  const { data: profEder, error: profErr } = await supabase
    .from("professores")
    .select("id, email, nome_completo, perfil_id, status, telefone, avatar_url")
    .eq("id", PROFESSOR_EDER_ID)
    .single();

  if (profErr || !profEder) {
    throw new Error(`[BASELINE FALHA] Professor ederonex@gmail.com não localizado: ${profErr?.message}`);
  }
  assert.deepStrictEqual(profEder, EXPECTED_BASELINE.prof_eder, "Campos de ederonex@gmail.com divergiram");

  console.log(`  ✓ Baseline de atributos críticos validado com sucesso (${label}).`);
}

// ==============================================================================
// 7. FLUXO PRINCIPAL ORQUESTRADO
// ==============================================================================

export async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Invocação voluntária de descarte de segredo pelo operador
  if (args.includes("--discard-secret")) {
    console.log("[SEGURANÇA] Invocando descarte voluntário de segredo efêmero...");
    const resultado = descartarSegredoPrimeiroAcesso();
    console.log(`  → ${resultado.message}`);

    if (resultado.success) {
      const state = carregarEstadoValido();
      state.secretDiscarded = true;
      salvarEstadoAtomico(state);
      console.log("  ✓ Estado atualizado: secretDiscarded = true.");
    } else if (!resultado.fileExisted) {
      console.log("  ℹ O arquivo não existia; estado local preservado sem alegação falsa de exclusão.");
    }
    return;
  }

  console.log("==============================================================================");
  console.log("PROVISIONAMENTO CONTROLADO DO ALUNO DE HOMOLOGAÇÃO (P0-3 / ETAPA 10.3C)");
  console.log("==============================================================================");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no ambiente.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Carrega e valida estado local
  const state = carregarEstadoValido();

  // 2. Pré-verificação do Baseline
  await verifyBaseline(supabase, "PRÉ");

  // 3. Definição estática e validação rigorosa dos instantes temporais em America/Sao_Paulo (UTC-3)
  const dataMatriculaIso = localToUtc("2026-10-20", "09:00");       // 2026-10-20T12:00:00.000Z (Terça)
  const aulaConcluidaInicioIso = localToUtc("2026-10-21", "10:00"); // 2026-10-21T13:00:00.000Z (Quarta)
  const aulaConcluidaFimIso = localToUtc("2026-10-21", "10:50");    // 2026-10-21T13:50:00.000Z
  const aulaFuturaInicioIso = localToUtc("2026-10-23", "14:00");    // 2026-10-23T17:00:00.000Z (Sexta)
  const aulaFuturaFimIso = localToUtc("2026-10-23", "14:50");       // 2026-10-23T17:50:00.000Z

  console.log("\n[PLANEJAMENTO TEMPORAL AUDITADO]");
  console.log(`  • Matrícula Sintética: ${dataMatriculaIso}`);
  console.log(`  • Aula Concluída:      ${aulaConcluidaInicioIso} -> ${aulaConcluidaFimIso}`);
  console.log(`  • Aula Futura:         ${aulaFuturaInicioIso} -> ${aulaFuturaFimIso}`);

  // 4. Verificação de Pré-requisitos de Autenticação das RPCs (Estratégia Dual)
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL || EXPECTED_BASELINE.ray_auth.email;

  // 5. BARREIRA INEGOCIÁVEL DE SEGURANÇA: ENCERRAMENTO EM MODO PRÉ-EXECUÇÃO
  if (process.env.AUTORIZACAO_EXECUCAO_P0_3 !== "AUTORIZADO_PELO_USUARIO") {
    console.log("\n[EXECUÇÃO BLOQUEADA — MODO DE AUDITORIA ESTÁTICA]");
    console.log("A variável AUTORIZACAO_EXECUCAO_P0_3 não está definida como 'AUTORIZADO_PELO_USUARIO'.");
    console.log("O script foi verificado estaticamente com sucesso, mas nenhuma escrita remota será realizada.");
    process.exit(0);
  }

  // --- SEÇÃO DE ESCRITAS (SOMENTE ATIVADA COM AUTORIZAÇÃO HUMANA EXPRESSA) ---
  console.log("\n[INICIANDO PROVISIONAMENTO AUTORIZADO]");

  // Sessão administrativa autenticada para RPCs de agenda/chamada (Estratégia Dual)
  let adminClient: any = supabase;
  if (adminPassword) {
    const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || serviceRoleKey);
    const { data: authSession, error: signInErr } = await authClient.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });
    if (signInErr || !authSession?.session) {
      throw new Error(`[AUTORIZAÇÃO FALHOU] Falha ao autenticar sessão admin de ${adminEmail}: ${signInErr?.message}`);
    }
    adminClient = authClient;
    console.log(`  ✓ Sessão administrativa de ${adminEmail} autenticada com sucesso para RPCs.`);
  } else {
    console.log(`  ✓ Estratégia de conexão PostgreSQL direta ativa para RPCs com contexto de ${RAY_PIRES_ID}.`);
    adminClient = {
      ...supabase,
      rpc: async (fnName: string, params: Record<string, any>) => {
        return executeRpcWithAdminContext(fnName, params, RAY_PIRES_ID);
      },
    };
  }

  // Etapa 1: Auth User
  let authUserId = await revalidarUsuarioAuth(supabase, state);
  if (!authUserId) {
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: TARGET_EMAIL,
      email_confirm: true,
      user_metadata: { nome_completo: TARGET_NOME, papel_inicial: "aluno" },
    });
    if (createErr || !newUser?.user) {
      throw new Error(`Falha ao criar usuário no Supabase Auth: ${createErr?.message}`);
    }
    authUserId = newUser.user.id;
    state.entities.authUserId = authUserId;
    state.completedSteps.push("auth_user_created");
    salvarEstadoAtomico(state);
  }

  // Etapa 2: Perfil e Aluno
  let entidadesPerfil = await revalidarPerfilEAluno(supabase, authUserId, state);
  if (!entidadesPerfil) {
    const { error: pUpdErr } = await supabase
      .from("perfis")
      .update({ status: "ativo", role: "aluno" })
      .eq("id", authUserId);
    if (pUpdErr) throw new Error(`Falha ao ativar perfil: ${pUpdErr.message}`);

    const { data: novoAluno, error: aluInsErr } = await supabase
      .from("alunos")
      .insert({
        perfil_id: authUserId,
        nome_completo: TARGET_NOME,
        email: TARGET_EMAIL,
        nivel_operacional: TARGET_NIVEL,
        objetivo: TARGET_OBJETIVO,
        status: "ativo",
      })
      .select("id")
      .single();

    if (aluInsErr || !novoAluno) throw new Error(`Falha ao inserir aluno: ${aluInsErr?.message}`);

    const { error: pLinkErr } = await supabase
      .from("perfis")
      .update({ aluno_id: novoAluno.id })
      .eq("id", authUserId);
    if (pLinkErr) throw new Error(`Falha ao vincular aluno_id no perfil: ${pLinkErr.message}`);

    state.entities.perfilId = authUserId;
    state.entities.alunoId = novoAluno.id;
    state.completedSteps.push("perfil_e_aluno_vinculados");
    salvarEstadoAtomico(state);
    entidadesPerfil = { perfilId: authUserId, alunoId: novoAluno.id };
  }

  // Etapa 3: Turma Individual
  let turmaId = await revalidarTurma(supabase, state);
  if (!turmaId) {
    const { data: novaTurma, error: turmaErr } = await supabase
      .from("turmas")
      .insert({
        nome: TARGET_TURMA_NOME,
        professor_id: PROFESSOR_EDER_ID,
        nivel: TARGET_NIVEL,
        modalidade: "individual",
        objetivo_principal: TARGET_OBJETIVO,
        capacidade: 1,
        status: "ativa",
        data_inicio: "2026-10-20",
      })
      .select("id")
      .single();

    if (turmaErr || !novaTurma) throw new Error(`Falha ao criar turma: ${turmaErr?.message}`);
    turmaId = novaTurma.id as string;
    state.entities.turmaId = turmaId;
    state.completedSteps.push("turma_criada");
    salvarEstadoAtomico(state);
  }

  // Etapa 4: Matrícula
  let matriculaId = await revalidarMatricula(supabase, turmaId, entidadesPerfil.alunoId, state, aulaConcluidaInicioIso);
  if (!matriculaId) {
    const { data: matRpc, error: matErr } = await supabase.rpc("matricular_aluno_turma", {
      p_turma_id: turmaId,
      p_aluno_id: entidadesPerfil.alunoId,
      p_motivo: "Matrícula de homologação P0-3",
    });
    if (matErr || !matRpc?.matricula_id) throw new Error(`Falha ao matricular aluno: ${matErr?.message}`);
    matriculaId = matRpc.matricula_id as string;

    // Ajuste temporal sintético auditado
    const { error: matUpdErr } = await supabase
      .from("matriculas_turmas")
      .update({ matriculado_em: dataMatriculaIso })
      .eq("id", matriculaId);
    if (matUpdErr) throw new Error(`Falha ao ajustar data da matrícula: ${matUpdErr.message}`);

    state.entities.matriculaId = matriculaId;
    state.completedSteps.push("matricula_realizada");
    salvarEstadoAtomico(state);
  }

  // Etapa 5: Aula Concluída e Presença
  let aulaConcluidaId = await revalidarAulaConcluida(supabase, turmaId, entidadesPerfil.alunoId, state, aulaConcluidaInicioIso);
  if (!aulaConcluidaId) {
    const { data: idAula1, error: a1Err } = await adminClient.rpc("agendar_aula", {
      p_turma_id: turmaId,
      p_professor_id: PROFESSOR_EDER_ID,
      p_titulo: "Aula Inaugural de Homologação",
      p_inicio_em: aulaConcluidaInicioIso,
      p_fim_em: aulaConcluidaFimIso,
      p_meeting_url: null,
      p_observacoes: "Aula prática inaugural de homologação do aluno",
    });
    if (a1Err || !idAula1) throw new Error(`Falha ao agendar aula concluída: ${a1Err?.message}`);

    const { error: chamErr } = await adminClient.rpc("salvar_chamada_aula", {
      p_aula_id: idAula1,
      p_chamada: [
        {
          aluno_id: entidadesPerfil.alunoId,
          status: "presente",
          justificativa: null,
          observacao_pedagogica: "Participação integral",
        },
      ],
    });
    if (chamErr) throw new Error(`Falha ao salvar chamada da aula inaugural: ${chamErr.message}`);

    const { error: concErr } = await adminClient.rpc("concluir_aula", {
      p_aula_id: idAula1,
      p_confirmar_pendencias: false,
    });
    if (concErr) throw new Error(`Falha ao concluir aula inaugural: ${concErr.message}`);

    state.entities.aulaConcluidaId = idAula1;
    state.completedSteps.push("aula_concluida_e_presenca_registrada");
    salvarEstadoAtomico(state);
  }

  // Etapa 6: Aula Futura
  let aulaFuturaId = await revalidarAulaFutura(supabase, turmaId, entidadesPerfil.alunoId, state, aulaFuturaInicioIso);
  if (!aulaFuturaId) {
    const { data: idAula2, error: a2Err } = await adminClient.rpc("agendar_aula", {
      p_turma_id: turmaId,
      p_professor_id: PROFESSOR_EDER_ID,
      p_titulo: "Próxima Aula de Conversação A1",
      p_inicio_em: aulaFuturaInicioIso,
      p_fim_em: aulaFuturaFimIso,
      p_meeting_url: null,
      p_observacoes: "Encontro regular semanal",
    });
    if (a2Err || !idAula2) throw new Error(`Falha ao agendar aula futura: ${a2Err?.message}`);

    state.entities.aulaFuturaId = idAula2;
    state.completedSteps.push("aula_futura_agendada");
    salvarEstadoAtomico(state);
  }

  // Etapa 7: Link de Primeiro Acesso
  if (!state.completedSteps.includes("primeiro_acesso_gerado")) {
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: TARGET_EMAIL,
      options: { redirectTo: PREVIEW_REDIRECT_URL },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      throw new Error(`Falha ao gerar link de recuperação: ${linkErr?.message}`);
    }

    fs.writeFileSync(SECRET_LINK_FILE, linkData.properties.action_link, { encoding: "utf-8", mode: 0o600 });
    state.secretFileCreated = true;
    state.completedSteps.push("primeiro_acesso_gerado");
    salvarEstadoAtomico(state);
    console.log(`  ✓ Link de primeiro acesso gravado em ${SECRET_LINK_FILE} (0o600). Nunca impresso no stdout.`);
  }

  // Validação Pós-Operação
  console.log("\n[VERIFICAÇÃO PÓS-OPERAÇÃO]");
  const { data: freqRaw, error: freqErr } = await adminClient.rpc("calcular_frequencia_aluno", {
    p_aluno_id: entidadesPerfil.alunoId,
    p_turma_id: turmaId,
  });

  if (freqErr) {
    throw new Error(`[FALHA DE AUDITORIA] calcular_frequencia_aluno falhou: ${freqErr.message}`);
  }

  const freq = validarRespostaFrequencia(freqRaw);
  assert.strictEqual(freq.totalAulasConcluidas, 1, "totalAulasConcluidas deve ser 1");
  assert.strictEqual(freq.presentes, 1, "presentes deve ser 1");
  assert.strictEqual(freq.ausentes, 0, "ausentes deve ser 0");
  assert.strictEqual(freq.justificados, 0, "justificados deve ser 0");
  assert.strictEqual(freq.naoRegistrados, 0, "naoRegistrados em concluídas deve ser 0");
  assert.strictEqual(Number(freq.porcentagem), 100, "porcentagem deve ser 100%");

  await verifyBaseline(supabase, "PÓS");

  console.log("\n[PROVISIONAMENTO CONCLUÍDO COM SUCESSO INTEGRAL]");
  console.log("Execute `npm run script -- --discard-secret` após o teste do operador.");
}

// Invocação direta segura
if (require.main === module) {
  main().catch((err) => {
    console.error(`\n[FALHA FATAL DE PROVISIONAMENTO] ${err.message}`);
    process.exit(1);
  });
}
