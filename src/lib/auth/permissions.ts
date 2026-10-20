/**
 * Matriz de Permissões e Regras de Controle de Acesso (RBAC) do DEMOSTRATIVO MTD.
 * Baseado estritamente em MATRIZ_DE_PERMISSOES.md.
 */

export type UserRole = "admin" | "professor" | "aluno";
export type ProfileStatus = "ativo" | "inativo" | "bloqueado";

export const PROFESSOR_PERMITTED_ROUTES: string[] = [
  "/admin/alunos",
  "/admin/turmas",
  "/admin/agenda",
  "/admin/materiais",
  "/admin/avaliacoes",
  "/admin/self-presentation",
  "/admin/flashcards",
  "/admin/comunidade",
];

export const PROFESSOR_FORBIDDEN_ROUTES: string[] = [
  "/admin", // Dashboard executivo geral (restrito a administração)
  "/admin/professores", // Gestão do corpo docente / RH
  "/admin/configuracoes", // Configurações do sistema
  "/admin/conquistas", // Motor de regras de placas e gamificação
];

/**
 * Sanitiza o parâmetro `next` para garantir que seja um caminho interno seguro.
 * Previne ataques de Open Redirect para domínios maliciosos.
 */
export function sanitizeNextPath(next: string | null | undefined): string {
  if (!next) return "";
  const trimmed = next.trim();
  // Deve iniciar com '/' e não com '//' (protocol-relative URL) e não conter ':' ou '\'
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

/**
 * Retorna o destino padrão no login para cada papel.
 */
export function getDefaultDashboardForRole(role: UserRole): string {
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

/**
 * Avalia se o caminho requisitado é permitido para o papel do usuário autenticado.
 */
export function isRouteAllowedForRole(pathname: string, role: UserRole): boolean {
  if (role === "admin") {
    // Administrador acessa todas as rotas administrativas
    if (pathname.startsWith("/admin")) {
      return true;
    }
    // Administrador não deve impersonar discente silenciosamente
    if (pathname.startsWith("/aluno")) {
      return false;
    }
    return false;
  }

  if (role === "professor") {
    // Professor nunca acessa o portal discente
    if (pathname.startsWith("/aluno")) {
      return false;
    }

    // Dashboard executivo /admin é proibido para professores
    if (pathname === "/admin" || pathname === "/admin/") {
      return false;
    }

    // Rotas expressamente proibidas na matriz
    if (
      PROFESSOR_FORBIDDEN_ROUTES.some(
        (forbidden) =>
          forbidden !== "/admin" &&
          (pathname === forbidden || pathname.startsWith(forbidden + "/"))
      )
    ) {
      return false;
    }

    // Rotas permitidas da matriz
    return PROFESSOR_PERMITTED_ROUTES.some(
      (allowed) => pathname === allowed || pathname.startsWith(allowed + "/")
    );
  }

  if (role === "aluno") {
    // Aluno nunca acessa rotas administrativas
    if (pathname.startsWith("/admin")) {
      return false;
    }
    return pathname === "/aluno" || pathname.startsWith("/aluno/");
  }

  return false;
}
