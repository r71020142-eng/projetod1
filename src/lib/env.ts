/**
 * Configuração central e validação estrita de variáveis de ambiente do DEMOSTRATIVO MTD.
 *
 * Regras da Etapa 10.1:
 * - APP_MODE aceita exclusivamente 'demo' ou 'production' (padrão: 'demo').
 * - APP_MODE é estritamente server-side.
 * - Em modo production, a ausência de variáveis do Supabase dispara erro explícito.
 * - Nenhuma chave secreta (service_role) é exposta ao cliente ou registrada em logs.
 */

export type AppMode = "demo" | "production";

export interface ClientEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isDemoClient: boolean;
}

export interface ServerEnv extends ClientEnv {
  appMode: AppMode;
  supabaseServiceRoleKey: string;
}

/**
 * Lê e valida as configurações de ambiente no servidor.
 * Deve ser invocado exclusivamente em Server Components, Server Actions, Route Handlers e middleware.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "[Segurança MTD] getServerEnv() foi chamado no navegador. Variáveis server-side não podem vazar para o cliente."
    );
  }

  const rawMode = process.env.APP_MODE || "demo";
  if (rawMode !== "demo" && rawMode !== "production") {
    throw new Error(
      `[Configuração MTD] APP_MODE inválido: "${rawMode}". Esperado: "demo" ou "production".`
    );
  }
  const appMode: AppMode = rawMode;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (appMode === "production") {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    if (!supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

    if (missing.length > 0) {
      throw new Error(
        `[Configuração MTD] APP_MODE=production ativo, mas as seguintes variáveis obrigatórias estão ausentes: ${missing.join(
          ", "
        )}. Configure-as no ambiente ou retorne para APP_MODE=demo.`
      );
    }

    try {
      new URL(supabaseUrl);
    } catch {
      throw new Error(
        `[Configuração MTD] NEXT_PUBLIC_SUPABASE_URL não é uma URL válida.`
      );
    }
  }

  return {
    appMode,
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    isDemoClient: appMode === "demo",
  };
}

/**
 * Lê configurações públicas seguras no cliente (Client Components).
 * Nunca expõe chaves secretas ou credenciais de serviço.
 */
export function getClientEnv(): ClientEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

  return {
    supabaseUrl,
    supabaseAnonKey,
    isDemoClient: isDemo,
  };
}
