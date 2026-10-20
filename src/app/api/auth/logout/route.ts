import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Route Handler para encerramento de sessão (Logout) seguro no servidor.
 */
export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = createServerSupabaseClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  const response = NextResponse.redirect(`${origin}/login`, {
    status: 303, // 303 See Other garante redirecionamento GET após requisição POST
  });

  // Cabeçalhos rigorosos para invalidar o cache e impedir navegação de volta para páginas privadas
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}
