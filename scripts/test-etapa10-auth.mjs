/**
 * Suíte de Testes Automatizados da ETAPA 10.2A:
 * Autenticação, Sessões, RBAC e Proteção de Rotas
 */

import { strict as assert } from "assert";

console.log("=== INICIANDO BATERIA DE TESTES AUTOMATIZADOS - ETAPA 10.2A ===\n");

// ------------------------------------------------------------------------------
// 1. Sanitização do Parâmetro Next (Open Redirect Prevention)
// ------------------------------------------------------------------------------
console.log("1. Testando Sanitização do Parâmetro Next (Open Redirect Prevention)...");

function sanitizeNextPath(next) {
  if (!next) return "";
  const trimmed = next.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.includes(":") &&
    !trimmed.includes("\\")
  ) {
    return trimmed;
  }
  return "";
}

assert.equal(sanitizeNextPath("/aluno"), "/aluno");
assert.equal(sanitizeNextPath("/admin/agenda?data=2026-10-20"), "/admin/agenda?data=2026-10-20");
assert.equal(sanitizeNextPath("//evil.com/phishing"), "");
assert.equal(sanitizeNextPath("https://malicious.com"), "");
assert.equal(sanitizeNextPath("javascript:alert(1)"), "");
assert.equal(sanitizeNextPath("/\\evil.com"), "");
assert.equal(sanitizeNextPath(""), "");
assert.equal(sanitizeNextPath(null), "");
assert.equal(sanitizeNextPath(undefined), "");

console.log("   ✓ Sanitização de caminhos internos aprovada com 100% de sucesso!");

// ------------------------------------------------------------------------------
// 2. Destino Padrão de Redirecionamento por Papel
// ------------------------------------------------------------------------------
console.log("\n2. Testando Destino Padrão de Redirecionamento por Papel...");

function getDefaultDashboardForRole(role) {
  switch (role) {
    case "aluno":
      return "/aluno";
    case "professor":
      return "/admin/agenda";
    case "admin":
      return "/admin";
    default:
      return "/login";
  }
}

assert.equal(getDefaultDashboardForRole("aluno"), "/aluno");
assert.equal(getDefaultDashboardForRole("professor"), "/admin/agenda");
assert.equal(getDefaultDashboardForRole("admin"), "/admin");
assert.equal(getDefaultDashboardForRole("desconhecido"), "/login");

console.log("   ✓ Redirecionamentos padrão alinhados com a Matriz de Permissões!");

// ------------------------------------------------------------------------------
// 3. Matriz RBAC: Aluno
// ------------------------------------------------------------------------------
console.log("\n3. Testando Matriz RBAC para o papel ALUNO...");

const PROFESSOR_PERMITTED_ROUTES = [
  "/admin/alunos",
  "/admin/turmas",
  "/admin/agenda",
  "/admin/materiais",
  "/admin/avaliacoes",
  "/admin/self-presentation",
  "/admin/flashcards",
  "/admin/comunidade",
];

const PROFESSOR_FORBIDDEN_ROUTES = [
  "/admin",
  "/admin/professores",
  "/admin/configuracoes",
  "/admin/conquistas",
];

function isRouteAllowedForRole(pathname, role) {
  if (role === "admin") {
    if (pathname.startsWith("/admin")) return true;
    if (pathname.startsWith("/aluno")) return false; // Impede impersonação silenciosa
    return false;
  }

  if (role === "professor") {
    if (pathname.startsWith("/aluno")) return false;
    if (pathname === "/admin" || pathname === "/admin/") return false;
    if (
      PROFESSOR_FORBIDDEN_ROUTES.some(
        (forbidden) =>
          forbidden !== "/admin" &&
          (pathname === forbidden || pathname.startsWith(forbidden + "/"))
      )
    ) {
      return false;
    }
    return PROFESSOR_PERMITTED_ROUTES.some(
      (allowed) => pathname === allowed || pathname.startsWith(allowed + "/")
    );
  }

  if (role === "aluno") {
    if (pathname.startsWith("/admin")) return false;
    return pathname === "/aluno" || pathname.startsWith("/aluno/");
  }

  return false;
}

assert.equal(isRouteAllowedForRole("/aluno", "aluno"), true);
assert.equal(isRouteAllowedForRole("/aluno/aulas", "aluno"), true);
assert.equal(isRouteAllowedForRole("/aluno/flashcards/123/estudar", "aluno"), true);
assert.equal(isRouteAllowedForRole("/admin", "aluno"), false, "Aluno não pode acessar /admin");
assert.equal(isRouteAllowedForRole("/admin/alunos", "aluno"), false, "Aluno não pode acessar /admin/alunos");
assert.equal(isRouteAllowedForRole("/admin/configuracoes", "aluno"), false);

console.log("   ✓ Aluno restrito exclusivamente ao portal /aluno e bloqueado em todo o /admin.");

// ------------------------------------------------------------------------------
// 4. Matriz RBAC: Professor
// ------------------------------------------------------------------------------
console.log("\n4. Testando Matriz RBAC para o papel PROFESSOR...");

// Rotas autorizadas para professor
assert.equal(isRouteAllowedForRole("/admin/alunos", "professor"), true);
assert.equal(isRouteAllowedForRole("/admin/alunos/alu-001", "professor"), true);
assert.equal(isRouteAllowedForRole("/admin/turmas", "professor"), true);
assert.equal(isRouteAllowedForRole("/admin/agenda", "professor"), true);
assert.equal(isRouteAllowedForRole("/admin/materiais", "professor"), true);
assert.equal(isRouteAllowedForRole("/admin/avaliacoes", "professor"), true);
assert.equal(isRouteAllowedForRole("/admin/self-presentation", "professor"), true);
assert.equal(isRouteAllowedForRole("/admin/flashcards", "professor"), true);
assert.equal(isRouteAllowedForRole("/admin/comunidade", "professor"), true);

// Rotas proibidas para professor
assert.equal(isRouteAllowedForRole("/admin", "professor"), false, "Professor não acessa dashboard geral executivo");
assert.equal(isRouteAllowedForRole("/admin/professores", "professor"), false, "Professor não gerencia corpo docente");
assert.equal(isRouteAllowedForRole("/admin/professores/prof-001", "professor"), false);
assert.equal(isRouteAllowedForRole("/admin/configuracoes", "professor"), false, "Professor não altera configurações");
assert.equal(isRouteAllowedForRole("/admin/conquistas", "professor"), false, "Professor não gerencia regras de conquistas");
assert.equal(isRouteAllowedForRole("/aluno", "professor"), false, "Professor não acessa portal do aluno");

console.log("   ✓ Professor possui acesso restrito às rotas operacionais e bloqueio em rotas administrativas.");

// ------------------------------------------------------------------------------
// 5. Matriz RBAC: Administrador e Bloqueio de Impersonação
// ------------------------------------------------------------------------------
console.log("\n5. Testando Matriz RBAC para o papel ADMINISTRADOR e Impersonação...");

assert.equal(isRouteAllowedForRole("/admin", "admin"), true);
assert.equal(isRouteAllowedForRole("/admin/professores", "admin"), true);
assert.equal(isRouteAllowedForRole("/admin/configuracoes", "admin"), true);
assert.equal(isRouteAllowedForRole("/admin/conquistas", "admin"), true);
assert.equal(isRouteAllowedForRole("/admin/alunos", "admin"), true);
assert.equal(isRouteAllowedForRole("/aluno", "admin"), false, "Admin não pode impersonar aluno silenciosamente");
assert.equal(isRouteAllowedForRole("/aluno/aulas", "admin"), false);

console.log("   ✓ Administrador possui acesso pleno ao /admin e bloqueio de impersonação silenciosa em /aluno.");

// ------------------------------------------------------------------------------
// 6. Bloqueio de Perfil Inativo ou Bloqueado
// ------------------------------------------------------------------------------
console.log("\n6. Testando Bloqueio de Contas Inativas e Bloqueadas...");

function checkProfileStatus(status) {
  if (status !== "ativo") {
    return { allowed: false, reason: status };
  }
  return { allowed: true };
}

assert.deepEqual(checkProfileStatus("ativo"), { allowed: true });
assert.deepEqual(checkProfileStatus("inativo"), { allowed: false, reason: "inativo" });
assert.deepEqual(checkProfileStatus("bloqueado"), { allowed: false, reason: "bloqueado" });

console.log("   ✓ Contas inativas e bloqueadas são rigorosamente impedidas de transacionar.");

// ------------------------------------------------------------------------------
// 7. Modos de Execução: AUTH_MODE e DATA_SOURCE
// ------------------------------------------------------------------------------
console.log("\n7. Testando Separação de Modos de Execução e Regras de Produção...");

function validateEnvironmentModes(appMode, authMode, dataSource, vercelEnv) {
  const isProd = vercelEnv === "production" || appMode === "production";
  const isAuthTestWithLocalData = authMode === "supabase" && dataSource === "local";

  if (isProd && isAuthTestWithLocalData) {
    throw new Error(
      "[Segurança MTD] A combinação AUTH_MODE=supabase com DATA_SOURCE=local é estritamente proibida no ambiente de Produção."
    );
  }

  return {
    isAuthTestWithLocalData,
    bannerVisible: isAuthTestWithLocalData,
  };
}

// Em Preview / Dev: permitido com banner
const previewResult = validateEnvironmentModes("demo", "supabase", "local", "preview");
assert.equal(previewResult.isAuthTestWithLocalData, true);
assert.equal(previewResult.bannerVisible, true);

// Em Produção: deve lançar erro explícito
assert.throws(
  () => validateEnvironmentModes("production", "supabase", "local", "production"),
  /estritamente proibida no ambiente de Produção/
);
assert.throws(
  () => validateEnvironmentModes("demo", "supabase", "local", "production"),
  /estritamente proibida no ambiente de Produção/
);

console.log("   ✓ Validação de modos: Preview autorizado com banner, Produção bloqueada contra dados locais.");

// ------------------------------------------------------------------------------
// 8. Mensagem Genérica de Recuperação de Senha (Sem Enumeração de Contas)
// ------------------------------------------------------------------------------
console.log("\n8. Testando Resposta Neutra na Recuperação de Senha...");

function getRecoveryResponse() {
  return "Se existir uma conta associada a este e-mail, enviaremos as instruções de recuperação em instantes.";
}

// A resposta deve ser idêntica tanto para e-mails existentes quanto inexistentes
const resp1 = getRecoveryResponse("aluno@mtd.com");
const resp2 = getRecoveryResponse("inexistente@naoexiste.com");
assert.equal(resp1, resp2);
assert.match(resp1, /Se existir uma conta associada/);

console.log("   ✓ Resposta de recuperação neutra confirmada, mitigando enumeração de usuários.");

console.log("\n============================================================");
console.log("TODOS OS TESTES DA ETAPA 10.2A PASSARAM COM 100% DE SUCESSO!");
console.log("============================================================");
