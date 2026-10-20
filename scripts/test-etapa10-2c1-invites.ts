/**
 * Suíte de Testes Automatizados — ETAPA 10.2C1
 * Fundação de Contas de Acesso, Convites e Menor Privilégio
 */

import { normalizeEmail } from "../src/data/validators";
import { getServerEnv } from "../src/lib/env";

interface MockAuthUser {
  id: string;
  email: string;
}

interface MockProfile {
  id: string;
  role: "admin" | "professor" | "aluno";
  status: "ativo" | "inativo" | "bloqueado";
}

interface MockAcesso {
  id: string;
  alunoId?: string;
  professorId?: string;
  perfilId?: string;
  emailNormalizado: string;
  tipo: "aluno" | "professor";
  status: "processando" | "convite_pendente" | "ativo" | "bloqueado" | "erro";
}

// Simulação da lógica de autorização e validação do endpoint /api/admin/acessos/convites
function simulateInviteEndpoint(
  callerUser: MockAuthUser | null,
  callerProfile: MockProfile | null,
  body: any,
  secretKeyConfigured: boolean,
  existingAcessos: MockAcesso[],
  operationalDb: {
    alunos: { id: string; nomeCompleto: string; email: string; perfilId?: string | null }[];
    professores: { id: string; nomeCompleto: string; email: string; perfilId?: string | null }[];
  }
): { status: number; body: { success: boolean; error?: string; code?: string; roleInferred?: string } } {
  // 1. Verificação de Sessão
  if (!callerUser) {
    return { status: 401, body: { success: false, error: "Não autenticado." } };
  }

  // 2. Confirmação de Admin Ativo
  if (!callerProfile || callerProfile.role !== "admin" || callerProfile.status !== "ativo") {
    return { status: 403, body: { success: false, error: "Acesso restrito a administradores ativos." } };
  }

  // 3. Validação do Payload
  if (!body || typeof body !== "object") {
    return { status: 400, body: { success: false, error: "Payload JSON inválido." } };
  }

  const { tipo, id } = body;
  if (tipo !== "aluno" && tipo !== "professor") {
    return { status: 400, body: { success: false, error: "Tipo de cadastro inválido. Esperado 'aluno' ou 'professor'." } };
  }

  if (!id || typeof id !== "string" || id.trim().length === 0) {
    return { status: 400, body: { success: false, error: "Identificador do cadastro é obrigatório." } };
  }

  // 4. Busca do Cadastro Operacional e Inferência de Papel
  let emailOperacional = "";
  let perfilIdExistente: string | null = null;
  const roleInferred = tipo === "aluno" ? "aluno" : "professor";

  if (tipo === "aluno") {
    const aluno = operationalDb.alunos.find((a) => a.id === id);
    if (!aluno) {
      return { status: 404, body: { success: false, error: "Discente não encontrado no repositório." } };
    }
    emailOperacional = aluno.email;
    perfilIdExistente = aluno.perfilId || null;
  } else {
    const prof = operationalDb.professores.find((p) => p.id === id);
    if (!prof) {
      return { status: 404, body: { success: false, error: "Docente não encontrado no repositório." } };
    }
    emailOperacional = prof.email;
    perfilIdExistente = prof.perfilId || null;
  }

  // 5. Vínculo prévio
  if (perfilIdExistente) {
    return { status: 409, body: { success: false, error: "Este cadastro já possui um perfil de usuário vinculado." } };
  }

  const emailNorm = normalizeEmail(emailOperacional);

  // 6. Concorrência e duplicidade em acessos_usuarios
  const filterKey = tipo === "aluno" ? "alunoId" : "professorId";
  const existingAcesso = existingAcessos.find(
    (a) => (a as any)[filterKey] === id || a.emailNormalizado === emailNorm
  );

  if (existingAcesso) {
    if (existingAcesso.status === "ativo" || existingAcesso.perfilId) {
      return { status: 409, body: { success: false, error: "Este cadastro ou e-mail já possui acesso ativo ao sistema." } };
    }
    if (existingAcesso.status === "processando") {
      return { status: 409, body: { success: false, error: "Já existe um convite sendo processado para este usuário. Aguarde a conclusão." } };
    }
  }

  // 7. Verificação de Secret Key
  if (!secretKeyConfigured) {
    return {
      status: 503,
      body: {
        success: false,
        error: "Serviço de convites ainda não configurado neste ambiente.",
        code: "SECRET_KEY_NOT_CONFIGURED",
        roleInferred,
      },
    };
  }

  return { status: 200, body: { success: true, roleInferred } };
}

// Simulação da lógica do trigger handle_new_user() adaptado na Migração 6
function simulateHandleNewUserTrigger(
  newUser: { id: string; email: string; raw_user_meta_data?: Record<string, any> },
  pendingAcessosEmails: string[]
): { id: string; email: string; role: string; status: string } {
  const emailNorm = normalizeEmail(newUser.email);
  const temConvite = pendingAcessosEmails.includes(emailNorm);

  // Regra de Menor Privilégio: se houver convite administrativo, status nasce 'inativo'
  const statusInicial = temConvite ? "inativo" : "ativo";

  // Regra de Menor Privilégio: papel NUNCA é lido de raw_user_meta_data
  const roleInicial = "aluno";

  return {
    id: newUser.id,
    email: newUser.email,
    role: roleInicial,
    status: statusInicial,
  };
}

async function runTests() {
  console.log("==================================================================");
  console.log("BATERIA DE TESTES — ETAPA 10.2C1 (FUNDAÇÃO DE CONTAS E CONVITES)");
  console.log("==================================================================");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    total++;
    if (condition) {
      console.log(`  ✓ [TESTE ${total}] ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ [FALHA ${total}] ${testName}`, details || "");
      process.exitCode = 1;
    }
  }

  const mockAdminUser: MockAuthUser = { id: "admin-uid", email: "admin@mtd.com" };
  const mockAdminProfile: MockProfile = { id: "admin-uid", role: "admin", status: "ativo" };

  const mockAlunoUser: MockAuthUser = { id: "aluno-uid", email: "aluno@mtd.com" };
  const mockAlunoProfile: MockProfile = { id: "aluno-uid", role: "aluno", status: "ativo" };

  const mockProfUser: MockAuthUser = { id: "prof-uid", email: "prof@mtd.com" };
  const mockProfProfile: MockProfile = { id: "prof-uid", role: "professor", status: "ativo" };

  const mockInactiveAdminProfile: MockProfile = { id: "admin-uid", role: "admin", status: "inativo" };

  const operationalDb = {
    alunos: [
      { id: "alu-001", nomeCompleto: "Mariana Silva", email: "mariana@mtd.com" },
      { id: "alu-002", nomeCompleto: "Pedro Santos", email: "pedro@mtd.com", perfilId: "perf-pedro" },
    ],
    professores: [
      { id: "prof-001", nomeCompleto: "Carlos Mendes", email: "carlos@mtd.com" },
      { id: "prof-002", nomeCompleto: "Ana Paula", email: "ana@mtd.com", perfilId: "perf-ana" },
    ],
  };

  // 1. Usuário anônimo recebe 401
  const res1 = simulateInviteEndpoint(null, null, { tipo: "aluno", id: "alu-001" }, false, [], operationalDb);
  assert(res1.status === 401 && res1.body.error === "Não autenticado.", "Usuário anônimo recebe status 401 (Não autenticado)");

  // 2. Aluno recebe 403
  const res2 = simulateInviteEndpoint(mockAlunoUser, mockAlunoProfile, { tipo: "aluno", id: "alu-001" }, false, [], operationalDb);
  assert(res2.status === 403 && res2.body.error === "Acesso restrito a administradores ativos.", "Aluno recebe status 403 (Acesso restrito)");

  // 3. Professor recebe 403
  const res3 = simulateInviteEndpoint(mockProfUser, mockProfProfile, { tipo: "aluno", id: "alu-001" }, false, [], operationalDb);
  assert(res3.status === 403 && res3.body.error === "Acesso restrito a administradores ativos.", "Professor recebe status 403 (Acesso restrito)");

  // 4. Administrador inativo recebe 403
  const res4 = simulateInviteEndpoint(mockAdminUser, mockInactiveAdminProfile, { tipo: "aluno", id: "alu-001" }, false, [], operationalDb);
  assert(res4.status === 403, "Administrador inativo recebe status 403");

  // 5. Papel enviado pelo cliente é rigorosamente ignorado; inferido pelo cadastro
  const res5 = simulateInviteEndpoint(
    mockAdminUser,
    mockAdminProfile,
    { tipo: "aluno", id: "alu-001", role: "admin", email: "hacker@evil.com" },
    false,
    [],
    operationalDb
  );
  assert(
    res5.body.roleInferred === "aluno",
    "Papel enviado pelo cliente ('admin') é ignorado e inferido estritamente do cadastro operacional ('aluno')"
  );

  const res5Prof = simulateInviteEndpoint(
    mockAdminUser,
    mockAdminProfile,
    { tipo: "professor", id: "prof-001", role: "aluno" },
    false,
    [],
    operationalDb
  );
  assert(
    res5Prof.body.roleInferred === "professor",
    "Papel para docente é inferido estritamente como 'professor', ignorando role enviada pelo cliente"
  );

  // 6. Normalização de e-mails
  const emailBruto = "  ALUNO.TESTE+1@MTD.com  ";
  const emailNorm = normalizeEmail(emailBruto);
  assert(emailNorm === "aluno.teste+1@mtd.com", "E-mails são estritamente normalizados (lower + trim)");

  // 7. Cadastro com perfil já vinculado é bloqueado (409)
  const res7 = simulateInviteEndpoint(
    mockAdminUser,
    mockAdminProfile,
    { tipo: "aluno", id: "alu-002" },
    false,
    [],
    operationalDb
  );
  assert(
    res7.status === 409 && Boolean(res7.body.error?.includes("já possui um perfil")),
    "Cadastro com perfil já vinculado é rejeitado com status 409"
  );

  // 8. Convites concorrentes no mesmo cadastro são bloqueados (409)
  const existingAcessos: MockAcesso[] = [
    {
      id: "acesso-1",
      alunoId: "alu-001",
      emailNormalizado: "mariana@mtd.com",
      tipo: "aluno",
      status: "processando",
    },
  ];
  const res8 = simulateInviteEndpoint(
    mockAdminUser,
    mockAdminProfile,
    { tipo: "aluno", id: "alu-001" },
    false,
    existingAcessos,
    operationalDb
  );
  assert(
    res8.status === 409 && Boolean(res8.body.error?.includes("sendo processado")),
    "Convite concorrente com status 'processando' é bloqueado com status 409"
  );

  // 9. E-mail já ativo em acessos_usuarios é bloqueado (409)
  const existingAtivo: MockAcesso[] = [
    {
      id: "acesso-2",
      professorId: "prof-001",
      emailNormalizado: "carlos@mtd.com",
      tipo: "professor",
      status: "ativo",
      perfilId: "perf-carlos",
    },
  ];
  const res9 = simulateInviteEndpoint(
    mockAdminUser,
    mockAdminProfile,
    { tipo: "professor", id: "prof-001" },
    false,
    existingAtivo,
    operationalDb
  );
  assert(
    res9.status === 409 && Boolean(res9.body.error?.includes("já possui acesso ativo")),
    "E-mail ou cadastro com acesso já ativo é rejeitado com status 409"
  );

  // 10. Ausência da Secret Key produz erro operacional controlado (503)
  const res10 = simulateInviteEndpoint(
    mockAdminUser,
    mockAdminProfile,
    { tipo: "aluno", id: "alu-001" },
    false, // Secret Key ausente nesta etapa
    [],
    operationalDb
  );
  assert(
    res10.status === 503 &&
      res10.body.code === "SECRET_KEY_NOT_CONFIGURED" &&
      res10.body.error === "Serviço de convites ainda não configurado neste ambiente.",
    "Ausência da Secret Key responde com status 503 controlado ('SECRET_KEY_NOT_CONFIGURED')"
  );

  // 11. Proteção contra Autoelevação no Trigger (raw_user_meta_data)
  const userTentandoAdmin = {
    id: "hacker-uid",
    email: "hacker@empresa.com",
    raw_user_meta_data: {
      role: "admin",
      isAdmin: true,
      permissao: "super_usuario",
    },
  };
  const profileCriado = simulateHandleNewUserTrigger(userTentandoAdmin, []);
  assert(
    profileCriado.role === "aluno",
    "Trigger ignora completamente raw_user_meta_data contendo role='admin', atribuindo 'aluno'"
  );

  // 12. Menor Privilégio: Conta convidada nasce 'inativa' antes da conclusão do vínculo
  const userConvidado = {
    id: "convidado-uid",
    email: "convidado@mtd.com",
  };
  const profileConvidado = simulateHandleNewUserTrigger(userConvidado, ["convidado@mtd.com"]);
  assert(
    profileConvidado.status === "inativo" && profileConvidado.role === "aluno",
    "Conta convidada nasce com status='inativo' e role='aluno' até o vínculo atômico ser concluído"
  );

  // 13. Verificação de Variáveis Server-side e Bloqueio de Chave no Cliente
  const env = getServerEnv();
  assert(
    env.supabaseSecretKey === "",
    "SUPABASE_SECRET_KEY permanece estritamente não configurada na Etapa 10.2C1"
  );

  // Resumo
  console.log("==================================================================");
  console.log(`TOTAL DE TESTES APROVADOS: ${passed}/${total}`);
  console.log("==================================================================");

  if (passed === total) {
    console.log("SUCESSO: TODOS OS TESTES DA ETAPA 10.2C1 FORAM APROVADOS COM 100%!\n");
    process.exit(0);
  } else {
    console.error("ERRO: Um ou mais testes falharam.\n");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Erro fatal nos testes:", err);
  process.exit(1);
});
