import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Matcher otimizado da Etapa 10.1:
     * Ignora rigorosamente:
     * - _next/static (scripts e estilos compilados)
     * - _next/image (otimização de imagens)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public assets (/assets/*)
     * - arquivos estáticos por extensão (.svg, .png, .jpg, .webp, .woff, .woff2, .css)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|css|ico)$).*)",
  ],
};
