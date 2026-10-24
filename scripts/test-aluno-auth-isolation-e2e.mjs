import ws from "ws";
if (!globalThis.WebSocket) {
  globalThis.WebSocket = ws;
}
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Carrega variáveis de ambiente de .env.local
if (fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey || !anonKey) {
  console.error("❌ Faltam credenciais do Supabase em .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function createAuthenticatedClient(accessToken) {
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

async function runE2EIsolationTest() {
  console.log("================================================================================");
  console.log("  TESTE E2E: AUTENTICAÇÃO COM EMAIL/SENHA & ISOLAMENTO TOTAL DE DADOS (A vs B) ");
  console.log("================================================================================");

  const timestamp = Date.now();
  const alunoA_email = `aluno.a.test.${timestamp}@mtd-test.com`;
  const alunoA_pass = "SenhaAlunoA123!";
  const alunoA_nome = `Aluno A Teste ${timestamp}`;

  const alunoB_email = `aluno.b.test.${timestamp}@mtd-test.com`;
  const alunoB_pass = "SenhaAlunoB456!";
  const alunoB_nome = `Aluno B Teste ${timestamp}`;

  let authUserIdA = null;
  let alunoIdA = null;
  let authUserIdB = null;
  let alunoIdB = null;
  let tokenA = null;
  let tokenB = null;
  let testConquistaId = null;
  let testSpId = null;

  try {
    // --------------------------------------------------------------------------
    // ETAPA 1: Cadastro do Aluno A com Email e Senha
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 1] Criando Aluno A no Supabase Auth + public.alunos...");
    const { data: authCreatedA, error: authErrA } = await adminClient.auth.admin.createUser({
      email: alunoA_email,
      password: alunoA_pass,
      email_confirm: true,
      user_metadata: { nome_completo: alunoA_nome, role: "aluno" },
    });
    if (authErrA || !authCreatedA?.user) {
      throw new Error(`Falha ao criar Auth User Aluno A: ${authErrA?.message}`);
    }
    authUserIdA = authCreatedA.user.id;
    alunoIdA = crypto.randomUUID();

    const { error: insAluErrA } = await adminClient.from("alunos").insert({
      id: alunoIdA,
      perfil_id: authUserIdA,
      nome_completo: alunoA_nome,
      email: alunoA_email,
      objetivo: "Fluência Executiva",
      nivel_operacional: "B1",
      status: "ativo",
    });
    if (insAluErrA) throw new Error(`Falha ao inserir alunos A: ${insAluErrA.message}`);

    await adminClient.from("perfis").upsert({
      id: authUserIdA,
      email: alunoA_email,
      nome_completo: alunoA_nome,
      role: "aluno",
      status: "ativo",
      aluno_id: alunoIdA,
    });

    console.log(`  ✅ Aluno A criado com sucesso: Auth UID = ${authUserIdA}, Aluno ID = ${alunoIdA}`);

    // --------------------------------------------------------------------------
    // ETAPA 2: Cadastro do Aluno B com Email e Senha
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 2] Criando Aluno B no Supabase Auth + public.alunos...");
    const { data: authCreatedB, error: authErrB } = await adminClient.auth.admin.createUser({
      email: alunoB_email,
      password: alunoB_pass,
      email_confirm: true,
      user_metadata: { nome_completo: alunoB_nome, role: "aluno" },
    });
    if (authErrB || !authCreatedB?.user) {
      throw new Error(`Falha ao criar Auth User Aluno B: ${authErrB?.message}`);
    }
    authUserIdB = authCreatedB.user.id;
    alunoIdB = crypto.randomUUID();

    const { error: insAluErrB } = await adminClient.from("alunos").insert({
      id: alunoIdB,
      perfil_id: authUserIdB,
      nome_completo: alunoB_nome,
      email: alunoB_email,
      objetivo: "Inglês para Viagens",
      nivel_operacional: "A2",
      status: "ativo",
    });
    if (insAluErrB) throw new Error(`Falha ao inserir alunos B: ${insAluErrB.message}`);

    await adminClient.from("perfis").upsert({
      id: authUserIdB,
      email: alunoB_email,
      nome_completo: alunoB_nome,
      role: "aluno",
      status: "ativo",
      aluno_id: alunoIdB,
    });

    console.log(`  ✅ Aluno B criado com sucesso: Auth UID = ${authUserIdB}, Aluno ID = ${alunoIdB}`);

    // --------------------------------------------------------------------------
    // ETAPA 3: Login Real do Aluno A (signInWithPassword)
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 3] Testando Login do Aluno A com as credenciais definidas...");
    const { data: loginA, error: loginErrA } = await anonClient.auth.signInWithPassword({
      email: alunoA_email,
      password: alunoA_pass,
    });
    if (loginErrA || !loginA?.session) {
      throw new Error(`Erro ao logar com Aluno A: ${loginErrA?.message}`);
    }
    tokenA = loginA.session.access_token;
    if (loginA.user.id !== authUserIdA) {
      throw new Error(`Auth UID retornado no login do Aluno A difere do esperado!`);
    }
    console.log(`  ✅ Login do Aluno A efetuado com sucesso! Token JWT emitido. User UID: ${loginA.user.id}`);

    // --------------------------------------------------------------------------
    // ETAPA 4: Login Real do Aluno B (signInWithPassword)
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 4] Testando Login do Aluno B com as credenciais definidas...");
    const { data: loginB, error: loginErrB } = await anonClient.auth.signInWithPassword({
      email: alunoB_email,
      password: alunoB_pass,
    });
    if (loginErrB || !loginB?.session) {
      throw new Error(`Erro ao logar com Aluno B: ${loginErrB?.message}`);
    }
    tokenB = loginB.session.access_token;
    if (loginB.user.id !== authUserIdB) {
      throw new Error(`Auth UID retornado no login do Aluno B difere do esperado!`);
    }
    console.log(`  ✅ Login do Aluno B efetuado com sucesso! Token JWT emitido. User UID: ${loginB.user.id}`);

    // --------------------------------------------------------------------------
    // ETAPA 5: Teste de Isolamento de Dados: Conquistas (Gamificação)
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 5] Testando Isolamento de Conquistas (Aluno A recebe conquista; Aluno B não vê)...");
    // Busca um modelo de conquista existente
    const { data: modelos } = await adminClient.from("modelos_conquistas").select("id").limit(1);
    const modeloId = modelos && modelos.length > 0 ? modelos[0].id : "modelo_primeira_aula";

    testConquistaId = crypto.randomUUID();
    const { error: insConqErr } = await adminClient.from("conquistas_concedidas").insert({
      id: testConquistaId,
      modelo_id: modeloId,
      aluno_id: alunoIdA,
      aluno_nome: alunoA_nome,
      pontos_atribuidos: 50,
      status: "concedida",
      concedida_em: new Date().toISOString(),
    });
    if (insConqErr) throw new Error(`Falha ao conceder conquista teste para Aluno A: ${insConqErr.message}`);

    // Cliente autenticado do Aluno A consulta suas conquistas
    const clientA = createAuthenticatedClient(tokenA);
    const { data: conqsA, error: errConqsA } = await clientA
      .from("conquistas_concedidas")
      .select("*")
      .eq("aluno_id", alunoIdA);

    if (errConqsA) throw new Error(`Aluno A falhou ao consultar suas conquistas: ${errConqsA.message}`);
    if (!conqsA || conqsA.length !== 1 || conqsA[0].id !== testConquistaId) {
      throw new Error(`Aluno A não encontrou sua conquista concedida! Encontrados: ${conqsA?.length}`);
    }
    console.log(`  ✅ Aluno A consulta suas próprias conquistas e recebe exatamente 1 conquista.`);

    // Cliente autenticado do Aluno B consulta conquistas
    const clientB = createAuthenticatedClient(tokenB);
    const { data: conqsB_proprias } = await clientB
      .from("conquistas_concedidas")
      .select("*")
      .eq("aluno_id", alunoIdB);

    if (conqsB_proprias && conqsB_proprias.length !== 0) {
      throw new Error(`Aluno B possui conquistas indevidas! Quantidade: ${conqsB_proprias.length}`);
    }
    console.log(`  ✅ Aluno B consulta suas próprias conquistas e recebe 0 conquistas (estado limpo).`);

    // TENTATIVA ADVERSARIAL: Aluno B tenta consultar as conquistas do Aluno A
    const { data: conqsB_adversarial } = await clientB
      .from("conquistas_concedidas")
      .select("*")
      .eq("aluno_id", alunoIdA);

    if (conqsB_adversarial && conqsB_adversarial.length > 0) {
      throw new Error(`🚨 FALHA CRÍTICA DE ISOLAMENTO: Aluno B conseguiu ver as conquistas do Aluno A!`);
    }
    console.log(`  🛡️ BLINDAGEM CONFIRMADA: Aluno B consultou o aluno_id do Aluno A e recebeu 0 resultados (RLS bloqueou).`);

    // --------------------------------------------------------------------------
    // ETAPA 6: Teste de Isolamento de Dados: Self Presentation
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 6] Testando Isolamento de Self Presentation (Submissão Privada)...");
    testSpId = crypto.randomUUID();
    const { error: insSpErr } = await clientA.from("self_presentations").insert({
      id: testSpId,
      aluno_id: alunoIdA,
      aluno_nome: alunoA_nome,
      titulo: "Minha Primeira Apresentação Oral",
      tipo: "nivelamento_inicial",
      status: "enviada",
      link_video: "https://youtube.com/watch?v=teste-isolamento-a",
      consentimento_aceito: true,
      data_gravacao: new Date().toISOString(),
    });
    if (insSpErr) throw new Error(`Falha ao submeter Self Presentation pelo Aluno A: ${insSpErr.message}`);

    // Aluno A consulta sua apresentação
    const { data: spA } = await clientA.from("self_presentations").select("*").eq("id", testSpId);
    if (!spA || spA.length !== 1) {
      throw new Error(`Aluno A não encontrou sua própria Self Presentation!`);
    }
    console.log(`  ✅ Aluno A submeteu e consulta com sucesso sua Self Presentation.`);

    // Aluno B tenta consultar a apresentação do Aluno A
    const { data: spB_adversarial } = await clientB
      .from("self_presentations")
      .select("*")
      .eq("id", testSpId);

    if (spB_adversarial && spB_adversarial.length > 0) {
      throw new Error(`🚨 FALHA CRÍTICA DE ISOLAMENTO: Aluno B conseguiu ver a Self Presentation do Aluno A!`);
    }
    console.log(`  🛡️ BLINDAGEM CONFIRMADA: Aluno B não consegue ver a Self Presentation do Aluno A (RLS bloqueou).`);

    // --------------------------------------------------------------------------
    // ETAPA 7: Teste de Atualização / Redefinição de Senha
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 7] Testando Redefinição de Senha do Aluno...");
    const novaSenhaA = "NovaSenhaAlunoA789!";
    const { error: updatePassErr } = await adminClient.auth.admin.updateUserById(authUserIdA, {
      password: novaSenhaA,
    });
    if (updatePassErr) throw new Error(`Falha ao redefinir senha do Aluno A: ${updatePassErr.message}`);

    // Tentativa com a senha antiga deve falhar
    const { error: oldPassErr } = await anonClient.auth.signInWithPassword({
      email: alunoA_email,
      password: alunoA_pass,
    });
    if (!oldPassErr) {
      throw new Error(`A senha antiga do Aluno A ainda funcionou após redefinição!`);
    }
    console.log(`  ✅ Senha antiga rejeitada com sucesso (${oldPassErr.message}).`);

    // Tentativa com a nova senha deve ter sucesso
    const { data: newLoginA, error: newPassErr } = await anonClient.auth.signInWithPassword({
      email: alunoA_email,
      password: novaSenhaA,
    });
    if (newPassErr || !newLoginA?.session) {
      throw new Error(`Falha ao logar com a nova senha do Aluno A: ${newPassErr?.message}`);
    }
    console.log(`  ✅ Login com a nova senha redefinida efetuado com sucesso!`);

    console.log("\n================================================================================");
    console.log("  TODOS OS 7 TESTES E2E FORAM APROVADOS COM 100% DE SUCESSO!                     ");
    console.log("  - Cadastro com Email e Senha: OK                                              ");
    console.log("  - Login com Senha Definida: OK                                                ");
    console.log("  - Redefinição de Senha: OK                                                    ");
    console.log("  - Isolamento Estrito Aluno A vs Aluno B: OK (RLS 100% ativo e comprovado)    ");
    console.log("================================================================================");
  } finally {
    // --------------------------------------------------------------------------
    // ETAPA 8: Limpeza Segura dos Dados de Teste
    // --------------------------------------------------------------------------
    console.log("\n[LIMPEZA] Removendo registros temporários de teste...");
    if (testSpId) {
      await adminClient.from("self_presentations").delete().eq("id", testSpId);
    }
    if (testConquistaId) {
      await adminClient.from("conquistas_concedidas").delete().eq("id", testConquistaId);
    }
    if (alunoIdA) {
      await adminClient.from("alunos_dados_pedagogicos").delete().eq("aluno_id", alunoIdA);
      await adminClient.from("acessos_usuarios").delete().eq("aluno_id", alunoIdA);
      await adminClient.from("perfis").delete().eq("aluno_id", alunoIdA);
      await adminClient.from("alunos").delete().eq("id", alunoIdA);
    }
    if (authUserIdA) {
      await adminClient.auth.admin.deleteUser(authUserIdA);
    }
    if (alunoIdB) {
      await adminClient.from("alunos_dados_pedagogicos").delete().eq("aluno_id", alunoIdB);
      await adminClient.from("acessos_usuarios").delete().eq("aluno_id", alunoIdB);
      await adminClient.from("perfis").delete().eq("aluno_id", alunoIdB);
      await adminClient.from("alunos").delete().eq("id", alunoIdB);
    }
    if (authUserIdB) {
      await adminClient.auth.admin.deleteUser(authUserIdB);
    }
    console.log("  ✅ Limpeza concluída com sucesso. Banco de dados em estado íntegro.");
  }
}

runE2EIsolationTest().catch((err) => {
  console.error("\n❌ ERRO NA EXECUÇÃO DO TESTE E2E:", err);
  process.exit(1);
});
