import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import {
  isRouteAllowedForRole,
  getDefaultDashboardForRole,
  type UserRole,
} from "@/lib/auth/permissions";

/**
 * Atualiza cookies de sessão e gerencia autorização SSR.
 *
 * Regras da Etapa 10.2A:
 * - Em AUTH_MODE=demo: não bloqueia requisições e preserva navegação demonstrativa aberta.
 * - Em AUTH_MODE=supabase:
 *   - Rotas públicas (/login, /esqueci-senha, /redefinir-senha, /auth/callback, /acesso-negado).
 *   - Redireciona usuários já logados que tentam acessar /login.
 *   - Rotas protegidas (/aluno/** e /admin/**) exigem autenticação via Supabase Auth.
 *   - Consulta papel e status em public.perfis.
 *   - Bloqueia perfis inativos ou bloqueados.
 *   - Valida permissões estritas da matriz RBAC (professor não acessa /admin nem /admin/professores, aluno não acessa /admin).
 *   - Ignora rigorosamente assets estáticos, imagens e chunks do Next.js.
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
    // Se getServerEnv falhar em runtime sem variáveis mínimas, não crasha o middleware
    return response;
  }

  // Em modo de autenticação demonstrativa (AUTH_MODE=demo), preserva navegação aberta
  if (env.authMode === "demo" || !env.supabaseUrl || !env.supabasePublishableKey) {
    return response;
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
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

  // Validação segura do usuário no servidor através do Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Lista de rotas públicas
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/esqueci-senha" ||
    pathname === "/redefinir-senha" ||
    pathname.startsWith("/auth/") ||
    pathname === "/acesso-negado";

  // Se o usuário já estiver logado e tentar acessar a tela de login ou recuperação, redireciona para seu portal
  if (user && (pathname === "/login" || pathname === "/esqueci-senha")) {
    const { data: profile } = await supabase
      .from("perfis")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (profile?.status === "ativo") {
      const role = (profile.role as UserRole) || "aluno";
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = getDefaultDashboardForRole(role);
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Se a rota for pública, libera o acesso
  if (isPublicRoute) {
    return response;
  }

  // Checagem de rotas protegidas (/aluno/** e /admin/**)
  const isProtectedRoute =
    pathname.startsWith("/aluno") || pathname.startsWith("/admin");

  if (isProtectedRoute) {
    // Caso 1: Usuário não autenticado
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      // Guarda o caminho de destino no parâmetro `next`
      const target = pathname + request.nextUrl.search;
      loginUrl.searchParams.set("next", target);
      return NextResponse.redirect(loginUrl);
    }

    // Caso 2: Usuário autenticado -> consulta papel e status em public.perfis
    const { data: profile, error } = await supabase
      .from("perfis")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      // Se não houver perfil cadastrado, redireciona para acesso negado
      const deniedUrl = request.nextUrl.clone();
      deniedUrl.pathname = "/acesso-negado";
      deniedUrl.searchParams.set("motivo", "perfil_inexistente");
      return NextResponse.redirect(deniedUrl);
    }

    // Bloqueio de contas inativas ou bloqueadas
    if (profile.status !== "ativo") {
      const deniedUrl = request.nextUrl.clone();
      deniedUrl.pathname = "/acesso-negado";
      deniedUrl.searchParams.set("motivo", profile.status);
      return NextResponse.redirect(deniedUrl);
    }

    const role = profile.role as UserRole;

    // Verificação estrita de controle de acesso por papel (RBAC)
    if (!isRouteAllowedForRole(pathname, role)) {
      const deniedUrl = request.nextUrl.clone();
      deniedUrl.pathname = "/acesso-negado";
      deniedUrl.searchParams.set("motivo", "permissao_insuficiente");
      return NextResponse.redirect(deniedUrl);
    }

    // Anota cabeçalhos de contexto autorizados para consumo nos Server Components
    response.headers.set("x-mtd-user-id", user.id);
    response.headers.set("x-mtd-user-role", role);
    response.headers.set("x-mtd-auth-status", "authenticated");
  }

  return response;
}
