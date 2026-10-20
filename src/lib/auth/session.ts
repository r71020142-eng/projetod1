import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerEnv } from "@/lib/env";
import { UserRole, ProfileStatus } from "@/lib/auth/permissions";

export interface UserIdentity {
  id: string;
  email: string;
  nomeCompleto: string;
  role: UserRole;
  roleLabel: string;
  status: ProfileStatus;
  avatarUrl: string | null;
  initials: string;
  isRealAuth: boolean;
}

/**
 * Extrai as iniciais do nome para renderização de avatar resiliente e elegante.
 * Ex: "Ray Pires" -> "RP", "Carla Mendes" -> "CM", "Mariana" -> "MA".
 */
export function extractInitials(name: string | null | undefined): string {
  if (!name || typeof name !== "string") return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) {
    const single = parts[0];
    return single.length >= 2 ? single.slice(0, 2).toUpperCase() : single.toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Converte o identificador interno de papel (role) no rótulo oficial da interface.
 */
export function formatRoleLabel(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Administrador";
    case "professor":
      return "Professor";
    case "aluno":
      return "Aluno";
    default:
      return "Usuário";
  }
}

/**
 * Obtém a identidade do usuário autenticado no servidor (SSR).
 *
 * Regras estritas da Etapa 10.2B1:
 * - Em AUTH_MODE=supabase: consulta estritamente auth.users e public.perfis no banco PostgreSQL.
 *   Nunca confia em localStorage, cookies manipuláveis pelo cliente ou parâmetros de URL.
 * - Em AUTH_MODE=demo: retorna os dados demonstrativos correspondentes ao contexto (admin ou aluno).
 * - Nunca mistura dados reais com identidades fictícias.
 */
export async function getServerIdentity(
  variant: "admin" | "aluno" = "admin"
): Promise<UserIdentity | null> {
  let env;
  try {
    env = getServerEnv();
  } catch {
    return null;
  }

  // 1. Modo Demonstrativo Puro (AUTH_MODE=demo)
  if (env.authMode === "demo") {
    if (variant === "admin") {
      return {
        id: "adm-001",
        email: "carla.mendes@escolapaulo.com.br",
        nomeCompleto: "Carla Mendes",
        role: "admin",
        roleLabel: "Administrador",
        status: "ativo",
        avatarUrl: "/carla-avatar.png",
        initials: "CM",
        isRealAuth: false,
      };
    } else {
      return {
        id: "alu-001",
        email: "mariana.silva@aluno.escolapaulo.com.br",
        nomeCompleto: "Mariana Silva",
        role: "aluno",
        roleLabel: "Aluno",
        status: "ativo",
        avatarUrl: "/mariana-avatar.png",
        initials: "MS",
        isRealAuth: false,
      };
    }
  }

  // 2. Modo Supabase (AUTH_MODE=supabase) - Resolução Estrita no Servidor
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return null;
  }

  try {
    // 2.1. Obtém o usuário autenticado na sessão segura de cookies HTTP-only
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // 2.2. Consulta o perfil correspondente na tabela public.perfis
    const { data: profile, error: profileError } = await supabase
      .from("perfis")
      .select("id, email, nome_completo, role, status, avatar_url, telefone")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    const email = profile.email || user.email || "";
    const nomeCompleto =
      profile.nome_completo ||
      (email ? email.split("@")[0] : "Usuário");
    const role = (profile.role as UserRole) || "aluno";
    const status = (profile.status as ProfileStatus) || "ativo";
    const avatarUrl = profile.avatar_url || null;
    const initials = extractInitials(nomeCompleto);

    return {
      id: profile.id,
      email,
      nomeCompleto,
      role,
      roleLabel: formatRoleLabel(role),
      status,
      avatarUrl,
      initials,
      isRealAuth: true,
    };
  } catch {
    return null;
  }
}
