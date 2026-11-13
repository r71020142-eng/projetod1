import { createClient } from "@supabase/supabase-js";
import assert from "node:assert";
import fs from "node:fs";

if (typeof globalThis.WebSocket === "undefined") {
  try {
    globalThis.WebSocket = (await import("ws")).default;
  } catch {
    globalThis.WebSocket = class DummyWebSocket {};
  }
}

// Carrega .env.local
const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = env.SUPABASE_SECRET_KEY;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !secretKey || !publishableKey) {
  console.error("ERRO: Variáveis de ambiente do Supabase não encontradas.");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const publicClient = createClient(supabaseUrl, publishableKey);

async function runE2ETest() {
  console.log("================================================================================");
  console.log("  TESTE E2E: AUTENTICAÇÃO E RBAC DE PROFESSORES — DEMOSTRATIVO MTD             ");
  console.log("================================================================================");

  const testEmail = `prof.teste.rbac.${Date.now()}@mtd.com`;
  const initialPassword = "ProfPassword123!";
  const updatedPassword = "NovoProfPass2026!";
  const testNome = "Professor Teste E2E RBAC";

  let createdUserId = null;
  let createdProfId = null;

  try {
    // --------------------------------------------------------------------------
    // ETAPA 1: Criação de Professor com Credenciais de Acesso (Simulação API)
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 1] Criando conta de autenticação e ficha pedagógica do professor...");
    
    // 1. Cria auth user
    const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: initialPassword,
      email_confirm: true,
      user_metadata: {
        nome_completo: testNome,
        role: "professor",
      },
    });

    assert(!authErr, `Erro ao criar usuário Auth: ${authErr?.message}`);
    assert(authUser?.user?.id, "ID do usuário Auth não retornado");
    createdUserId = authUser.user.id;
    console.log(`  ✅ Usuário criado no Supabase Auth com sucesso (ID: ${createdUserId})`);

    // 2. Cria professor com perfil_id vinculado
    createdProfId = crypto.randomUUID();
    const { data: prof, error: profErr } = await adminClient
      .from("professores")
      .insert({
        id: createdProfId,
        perfil_id: createdUserId,
        nome_completo: testNome,
        email: testEmail,
        telefone: "(11) 98765-4321",
        biografia_pedagogica: "Docente especializado em Business English e metodologia MTD.",
        idiomas_falados: ["Inglês (Fluente)", "Português (Nativo)"],
        status: "ativo",
      })
      .select()
      .single();

    assert(!profErr, `Erro ao inserir na tabela professores: ${profErr?.message}`);
    assert.strictEqual(prof.id, createdProfId, "ID do professor deve coincidir");
    assert.strictEqual(prof.perfil_id, createdUserId, "perfil_id deve estar vinculado");
    console.log(`  ✅ Registro criado na tabela public.professores vinculado ao perfil_id`);

    // 3. Upsert no perfil com role: 'professor'
    const { data: perfil, error: perfilErr } = await adminClient
      .from("perfis")
      .upsert({
        id: createdUserId,
        email: testEmail,
        nome_completo: testNome,
        role: "professor",
        status: "ativo",
        professor_id: createdProfId,
        telefone: "(11) 98765-4321",
      })
      .select()
      .single();

    assert(!perfilErr, `Erro ao registrar em public.perfis: ${perfilErr?.message}`);
    assert.strictEqual(perfil.role, "professor", "Role deve ser professor");
    assert.strictEqual(perfil.status, "ativo", "Status deve ser ativo");
    assert.strictEqual(perfil.professor_id, createdProfId, "professor_id deve estar vinculado");
    console.log(`  ✅ Registro em public.perfis confirmado com role 'professor' e status 'ativo'`);

    // 4. Upsert em acessos_usuarios
    const { error: acessoErr } = await adminClient
      .from("acessos_usuarios")
      .upsert({
        professor_id: createdProfId,
        perfil_id: createdUserId,
        email_normalizado: testEmail,
        tipo: "professor",
        status: "ativo",
        acesso_ativado_em: new Date().toISOString(),
      }, { onConflict: "professor_id" });

    assert(!acessoErr, `Erro ao atualizar acessos_usuarios: ${acessoErr?.message}`);
    console.log(`  ✅ Controle de acesso registrado em public.acessos_usuarios`);

    // --------------------------------------------------------------------------
    // ETAPA 2: Teste de Login com as Credenciais do Professor
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 2] Testando login de professor com e-mail e senha cadastrados...");
    const { data: loginData, error: loginErr } = await publicClient.auth.signInWithPassword({
      email: testEmail,
      password: initialPassword,
    });

    assert(!loginErr, `Falha no login do professor: ${loginErr?.message}`);
    assert.strictEqual(loginData.user?.email, testEmail, "E-mail autenticado deve coincidir");
    assert.strictEqual(loginData.user?.id, createdUserId, "ID do usuário autenticado deve coincidir");
    console.log(`  ✅ Autenticação realizada com SUCESSO! Token JWT e sessão gerados.`);

    // --------------------------------------------------------------------------
    // ETAPA 3: Atualização de Senha do Professor
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 3] Testando atualização de senha do professor...");
    const { error: updatePassErr } = await adminClient.auth.admin.updateUserById(createdUserId, {
      password: updatedPassword,
    });
    assert(!updatePassErr, `Falha ao atualizar senha: ${updatePassErr?.message}`);
    console.log(`  ✅ Senha atualizada no Supabase Auth com sucesso`);

    // Verifica que a senha antiga é rejeitada
    const { error: oldPassErr } = await publicClient.auth.signInWithPassword({
      email: testEmail,
      password: initialPassword,
    });
    assert(oldPassErr, "A senha antiga deveria ter sido rejeitada");
    console.log(`  ✅ Senha anterior rejeitada com sucesso (Invalid login credentials)`);

    // Verifica que a nova senha é aceita
    const { data: newLoginData, error: newLoginErr } = await publicClient.auth.signInWithPassword({
      email: testEmail,
      password: updatedPassword,
    });
    assert(!newLoginErr, `Falha no login com a nova senha: ${newLoginErr?.message}`);
    assert.strictEqual(newLoginData.user?.id, createdUserId, "Login com nova senha aprovado");
    console.log(`  ✅ Login com nova senha aprovado com sucesso!`);

    // --------------------------------------------------------------------------
    // ETAPA 4: Validação da Matriz de Permissões RBAC para Docente
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 4] Validando regras de autorização RBAC para o papel 'professor'...");
    
    // Importa permissions dinamicamente
    const {
      getDefaultDashboardForRole,
      isRouteAllowedForRole,
      PROFESSOR_PERMITTED_ROUTES,
      PROFESSOR_FORBIDDEN_ROUTES,
    } = await import("../src/lib/auth/permissions.ts");

    // 1. Dashboard inicial
    const dashboardDocente = getDefaultDashboardForRole("professor");
    assert.strictEqual(dashboardDocente, "/admin/agenda", "Dashboard padrão do professor deve ser /admin/agenda");
    console.log(`  ✅ Redirecionamento de login para docentes: ${dashboardDocente}`);

    // 2. Rotas permitidas para o professor
    const rotasPermitidas = [
      "/admin/agenda",
      "/admin/alunos",
      "/admin/turmas",
      "/admin/materiais",
      "/admin/avaliacoes",
      "/admin/self-presentation",
      "/admin/flashcards",
      "/admin/comunidade",
    ];
    for (const rota of rotasPermitidas) {
      assert.strictEqual(
        isRouteAllowedForRole(rota, "professor"),
        true,
        `Rota pedagógica ${rota} deve ser permitida para professor`
      );
    }
    console.log(`  ✅ Acesso autorizado a todas as ${rotasPermitidas.length} rotas pedagógicas permitidas`);

    // 3. Rotas restritas que devem ser BLOQUEADAS para o professor
    const rotasBloqueadas = [
      "/admin",              // Dashboard executivo geral restrito a admin
      "/admin/professores",  // Gestão de contratação / RH
      "/admin/configuracoes",// Configurações do sistema
      "/admin/conquistas",   // Configurações do motor de gamificação
      "/aluno",              // Portal exclusivo discente
      "/aluno/jornada",      // Área discente
    ];
    for (const rota of rotasBloqueadas) {
      assert.strictEqual(
        isRouteAllowedForRole(rota, "professor"),
        false,
        `Rota ${rota} deve ser estritamente bloqueada para professor`
      );
    }
    console.log(`  ✅ Bloqueio estrito confirmado para todas as ${rotasBloqueadas.length} rotas executivas e discentes`);

    console.log("\n================================================================================");
    console.log("  TODAS AS 4 ETAPAS DE AUTENTICAÇÃO E RBAC DE PROFESSORES FORAM APROVADAS!      ");
    console.log("================================================================================");
  } finally {
    // --------------------------------------------------------------------------
    // LIMPEZA: Remoção dos dados de teste
    // --------------------------------------------------------------------------
    console.log("\n[LIMPEZA] Removendo dados do teste E2E...");
    if (createdProfId) {
      await adminClient.from("acessos_usuarios").delete().eq("professor_id", createdProfId);
      await adminClient.from("professores").delete().eq("id", createdProfId);
    }
    if (createdUserId) {
      await adminClient.from("perfis").delete().eq("id", createdUserId);
      await adminClient.auth.admin.deleteUser(createdUserId);
    }
    console.log("  ✅ Limpeza concluída sem deixar resíduos no banco.");
  }
}

runE2ETest().catch((err) => {
  console.error("\n❌ FALHA NO TESTE E2E:", err);
  process.exit(1);
});
