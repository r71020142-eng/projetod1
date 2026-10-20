import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";

/**
 * Cliente Supabase para Server Components, Route Handlers e Server Actions.
 *
 * Regras da Etapa 10.1:
 * - Execução estrita no servidor com controle seguro de cookies.
 * - Utiliza a chave anon com contexto da sessão do usuário autenticado (respeitando RLS).
 * - Protegido contra tentativas de escrita de cookies em Server Components (try/catch).
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();
  const env = getServerEnv();

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    if (env.appMode === "demo") {
      return null;
    }
    throw new Error(
      "[Supabase Server] NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios em production."
    );
  }

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll chamado em Server Component: o cookie não pode ser alterado durante render RSC.
          // Isso é esperado e deve ser gerenciado pelo middleware de sessão.
        }
      },
    },
  });
}

/**
 * Helper para leitura do usuário autenticado na requisição.
 */
export async function getAuthenticatedUser() {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Helper para leitura do papel (role) do usuário no perfil do banco.
 */
export async function getUserRole(): Promise<"admin" | "professor" | "aluno" | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  try {
    const { data: profile } = await supabase
      .from("perfis")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) {
      return profile.role as "admin" | "professor" | "aluno";
    }
  } catch {
    // Falha silenciosa com retorno seguro
  }

  return null;
}
