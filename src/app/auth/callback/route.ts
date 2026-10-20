import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  sanitizeNextPath,
  getDefaultDashboardForRole,
  type UserRole,
} from "@/lib/auth/permissions";

/**
 * Route Handler para troca de código de autorização PKCE por sessão SSR.
 * Utilizado nos fluxos de confirmação de e-mail e recuperação de senha.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    // Sem código de autorização válido
    return NextResponse.redirect(
      `${origin}/login?error=codigo_ausente`
    );
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=sessao_expirada`
    );
  }

  // Se houver um parâmetro `next` sanitizado, prioriza-o
  const safeNext = sanitizeNextPath(next);
  if (safeNext) {
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  // Se não houver next explícito, descobre o papel do usuário no banco
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("perfis")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (profile?.role as UserRole) || "aluno";
    return NextResponse.redirect(
      `${origin}${getDefaultDashboardForRole(role)}`
    );
  }

  return NextResponse.redirect(`${origin}/login`);
}
