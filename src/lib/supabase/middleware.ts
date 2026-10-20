import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";

/**
 * Atualiza cookies de sessão e gerencia autorização SSR.
 *
 * Regras da Etapa 10.1:
 * - Em APP_MODE=demo: não bloqueia requisições e preserva navegação demonstrativa intacta.
 * - Em APP_MODE=production: atualiza tokens de sessão e prepara checagem de permissão RBAC.
 * - Ignora arquivos estáticos, assets do Next.js e mídias.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  let env;
  try {
    env = getServerEnv();
  } catch {
    // Se getServerEnv falhar em runtime sem variáveis, retorna resposta padrão sem crash
    return response;
  }

  // Em modo demonstrativo, o middleware preserva navegação aberta e dados semente
  if (env.appMode === "demo" || !env.supabaseUrl || !env.supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Lê com segurança o usuário atual (validação com auth.users no Supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Lógica de produção (preparada para quando /login for criado na Etapa 10.2):
  // Se for rota protegida (/aluno/* ou /admin/*) e não houver usuário autenticado,
  // na Etapa 10.2 haverá redirecionamento para /login.
  // Na Etapa 10.1, não bloqueamos para não gerar 404 em rotas inexistentes.
  if (!user && (path.startsWith("/aluno") || path.startsWith("/admin"))) {
    // Flag de cabeçalho para auditoria e controle interno
    response.headers.set("x-mtd-auth-status", "unauthenticated");
  } else if (user) {
    response.headers.set("x-mtd-auth-status", "authenticated");
    response.headers.set("x-mtd-user-id", user.id);
  }

  return response;
}
