import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { getClientEnv } from "@/lib/env";

/**
 * Cliente Supabase para Client Components (navegador) e adaptadores unificados.
 *
 * Regras de Segurança:
 * - No navegador (typeof window !== "undefined"), utiliza estritamente a URL pública e a Publishable Key pública via @supabase/ssr.
 * - NUNCA expõe a SUPABASE_SECRET_KEY no cliente.
 * - No servidor (typeof window === "undefined"), se SUPABASE_SECRET_KEY estiver configurada,
 *   permite que chamadas Server-Side (RSC, agregações de dashboard) acessem os dados reais do banco.
 */

let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null;
let serverSecretClientInstance: ReturnType<typeof createSupabaseJsClient> | null = null;

export function createClient() {
  // Execução no servidor com chave administrativa para SSR / RSC
  if (typeof window === "undefined") {
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
    if (typeof (globalThis as any).WebSocket === "undefined") {
      try {
        // Polyfill para Node 20 caso nativo não esteja habilitado
        (globalThis as any).WebSocket = require("ws");
      } catch {}
    }
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (supabaseUrl && secretKey) {
      if (!serverSecretClientInstance) {
        serverSecretClientInstance = createSupabaseJsClient(supabaseUrl, secretKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      }
      return serverSecretClientInstance;
    }
  }

  const env = getClientEnv();

  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    if (env.isDemoClient) {
      // Em modo demonstrativo sem variáveis do Supabase, retorna instância segura de noop/aviso
      return null;
    }
    throw new Error(
      "[Supabase Client] NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY são obrigatórios."
    );
  }

  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient(
      env.supabaseUrl,
      env.supabasePublishableKey
    );
  }

  return browserClientInstance;
}
