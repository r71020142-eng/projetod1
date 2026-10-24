/**
 * Configuração central e validação estrita de variáveis de ambiente do DEMOSTRATIVO MTD.
 *
 * Regras da Etapa 10.2A:
 * - APP_MODE: 'demo' | 'production' (padrão: 'demo')
 * - AUTH_MODE: 'demo' | 'supabase' (padrão: 'demo')
 * - DATA_SOURCE: 'local' | 'supabase' (padrão: 'local')
 * - A combinação AUTH_MODE=supabase + DATA_SOURCE=local é permitida somente em Development ou Preview.
 * - Em Produção (VERCEL_ENV=production ou APP_MODE=production), AUTH_MODE=supabase exige DATA_SOURCE=supabase.
 * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY é pública e acessível no navegador.
 * - SUPABASE_SECRET_KEY é estritamente server-only e NUNCA é exposta ao cliente ou registrada em logs.
 * - Sem fallback para chaves legadas descontinuadas.
 */

export type AppMode = "demo" | "production";
export type AuthMode = "demo" | "supabase";
export type DataSource = "local" | "supabase";

export interface ClientEnv {
  supabaseUrl: string;
  supabasePublishableKey: string;
  isDemoClient: boolean;
  isAuthTestBannerVisible: boolean;
  dataSource: DataSource;
  coreUsersDataSource: DataSource;
  academicCoreDataSource: DataSource;
  academicAgendaDataSource: DataSource;
  academicContentDataSource: DataSource;
  academicEvaluationsDataSource: DataSource;
  academicFlashcardsDataSource: DataSource;
  academicSelfPresentationDataSource: DataSource;
  communityDataSource: DataSource;
  gamificationDataSource: DataSource;
}

export interface ServerEnv extends ClientEnv {
  appMode: AppMode;
  authMode: AuthMode;
  dataSource: DataSource;
  coreUsersDataSource: DataSource;
  academicCoreDataSource: DataSource;
  academicAgendaDataSource: DataSource;
  academicContentDataSource: DataSource;
  academicEvaluationsDataSource: DataSource;
  academicFlashcardsDataSource: DataSource;
  academicSelfPresentationDataSource: DataSource;
  communityDataSource: DataSource;
  gamificationDataSource: DataSource;
  isAuthTestWithLocalData: boolean;
  supabaseSecretKey: string;
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

  const rawAuthMode =
    process.env.AUTH_MODE || (appMode === "production" ? "supabase" : "demo");
  if (rawAuthMode !== "demo" && rawAuthMode !== "supabase") {
    throw new Error(
      `[Configuração MTD] AUTH_MODE inválido: "${rawAuthMode}". Esperado: "demo" ou "supabase".`
    );
  }
  const authMode: AuthMode = rawAuthMode;

  const rawDataSource =
    process.env.DATA_SOURCE || (appMode === "production" ? "supabase" : "local");
  if (rawDataSource !== "local" && rawDataSource !== "supabase") {
    throw new Error(
      `[Configuração MTD] DATA_SOURCE inválido: "${rawDataSource}". Esperado: "local" ou "supabase".`
    );
  }
  const dataSource: DataSource = rawDataSource;

  const serverCoreUsers = process.env.CORE_USERS_DATA_SOURCE;
  const clientCoreUsers = process.env.NEXT_PUBLIC_CORE_USERS_DATA_SOURCE;

  // Validação estrita de divergência entre CORE_USERS_DATA_SOURCE e NEXT_PUBLIC_CORE_USERS_DATA_SOURCE
  if (
    serverCoreUsers &&
    clientCoreUsers &&
    serverCoreUsers !== clientCoreUsers
  ) {
    throw new Error(
      `[Configuração MTD] Divergência crítica detectada entre CORE_USERS_DATA_SOURCE ("${serverCoreUsers}") e NEXT_PUBLIC_CORE_USERS_DATA_SOURCE ("${clientCoreUsers}"). Ambas as variáveis devem ser estritamente idênticas ('supabase' ou 'local') para garantir consistência entre o servidor e o navegador.`
    );
  }

  if (serverCoreUsers === "supabase" && clientCoreUsers !== "supabase") {
    throw new Error(
      `[Configuração MTD] CORE_USERS_DATA_SOURCE está configurada como 'supabase', mas NEXT_PUBLIC_CORE_USERS_DATA_SOURCE não é 'supabase' (atual: "${clientCoreUsers || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  if (clientCoreUsers === "supabase" && serverCoreUsers !== "supabase") {
    throw new Error(
      `[Configuração MTD] NEXT_PUBLIC_CORE_USERS_DATA_SOURCE está configurada como 'supabase', mas CORE_USERS_DATA_SOURCE não é 'supabase' (atual: "${serverCoreUsers || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  const rawCoreUsers = serverCoreUsers || clientCoreUsers || dataSource;
  if (rawCoreUsers !== "local" && rawCoreUsers !== "supabase") {
    throw new Error(
      `[Configuração MTD] CORE_USERS_DATA_SOURCE inválido: "${rawCoreUsers}". Esperado: "local" ou "supabase".`
    );
  }
  const coreUsersDataSource: DataSource = rawCoreUsers;

  const serverAcademicCore = process.env.ACADEMIC_CORE_DATA_SOURCE;
  const clientAcademicCore = process.env.NEXT_PUBLIC_ACADEMIC_CORE_DATA_SOURCE;

  // Validação estrita de divergência entre ACADEMIC_CORE_DATA_SOURCE e NEXT_PUBLIC_ACADEMIC_CORE_DATA_SOURCE
  if (
    serverAcademicCore &&
    clientAcademicCore &&
    serverAcademicCore !== clientAcademicCore
  ) {
    throw new Error(
      `[Configuração MTD] Divergência crítica detectada entre ACADEMIC_CORE_DATA_SOURCE ("${serverAcademicCore}") e NEXT_PUBLIC_ACADEMIC_CORE_DATA_SOURCE ("${clientAcademicCore}"). Ambas as variáveis devem ser estritamente idênticas ('supabase' ou 'local') para garantir consistência entre o servidor e o navegador.`
    );
  }

  if (serverAcademicCore === "supabase" && clientAcademicCore !== "supabase") {
    throw new Error(
      `[Configuração MTD] ACADEMIC_CORE_DATA_SOURCE está configurada como 'supabase', mas NEXT_PUBLIC_ACADEMIC_CORE_DATA_SOURCE não é 'supabase' (atual: "${clientAcademicCore || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  if (clientAcademicCore === "supabase" && serverAcademicCore !== "supabase") {
    throw new Error(
      `[Configuração MTD] NEXT_PUBLIC_ACADEMIC_CORE_DATA_SOURCE está configurada como 'supabase', mas ACADEMIC_CORE_DATA_SOURCE não é 'supabase' (atual: "${serverAcademicCore || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  const rawAcademicCore = serverAcademicCore || clientAcademicCore || dataSource;
  if (rawAcademicCore !== "local" && rawAcademicCore !== "supabase") {
    throw new Error(
      `[Configuração MTD] ACADEMIC_CORE_DATA_SOURCE inválido: "${rawAcademicCore}". Esperado: "local" ou "supabase".`
    );
  }
  const academicCoreDataSource: DataSource = rawAcademicCore;

  const serverAcademicAgenda = process.env.ACADEMIC_AGENDA_DATA_SOURCE;
  const clientAcademicAgenda = process.env.NEXT_PUBLIC_ACADEMIC_AGENDA_DATA_SOURCE;

  if (
    serverAcademicAgenda &&
    clientAcademicAgenda &&
    serverAcademicAgenda !== clientAcademicAgenda
  ) {
    throw new Error(
      `[Configuração MTD] Divergência crítica detectada entre ACADEMIC_AGENDA_DATA_SOURCE ("${serverAcademicAgenda}") e NEXT_PUBLIC_ACADEMIC_AGENDA_DATA_SOURCE ("${clientAcademicAgenda}"). Ambas as variáveis devem ser estritamente idênticas ('supabase' ou 'local') para garantir consistência entre o servidor e o navegador.`
    );
  }

  if (serverAcademicAgenda === "supabase" && clientAcademicAgenda !== "supabase") {
    throw new Error(
      `[Configuração MTD] ACADEMIC_AGENDA_DATA_SOURCE está configurada como 'supabase', mas NEXT_PUBLIC_ACADEMIC_AGENDA_DATA_SOURCE não é 'supabase' (atual: "${clientAcademicAgenda || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  if (clientAcademicAgenda === "supabase" && serverAcademicAgenda !== "supabase") {
    throw new Error(
      `[Configuração MTD] NEXT_PUBLIC_ACADEMIC_AGENDA_DATA_SOURCE está configurada como 'supabase', mas ACADEMIC_AGENDA_DATA_SOURCE não é 'supabase' (atual: "${serverAcademicAgenda || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  const rawAcademicAgenda = serverAcademicAgenda || clientAcademicAgenda || dataSource;
  if (rawAcademicAgenda !== "local" && rawAcademicAgenda !== "supabase") {
    throw new Error(
      `[Configuração MTD] ACADEMIC_AGENDA_DATA_SOURCE inválido: "${rawAcademicAgenda}". Esperado: "local" ou "supabase".`
    );
  }
  const academicAgendaDataSource: DataSource = rawAcademicAgenda;

  const serverAcademicContent = process.env.ACADEMIC_CONTENT_DATA_SOURCE;
  const clientAcademicContent = process.env.NEXT_PUBLIC_ACADEMIC_CONTENT_DATA_SOURCE;

  if (
    serverAcademicContent &&
    clientAcademicContent &&
    serverAcademicContent !== clientAcademicContent
  ) {
    throw new Error(
      `[Configuração MTD] Divergência crítica detectada entre ACADEMIC_CONTENT_DATA_SOURCE ("${serverAcademicContent}") e NEXT_PUBLIC_ACADEMIC_CONTENT_DATA_SOURCE ("${clientAcademicContent}"). Ambas as variáveis devem ser estritamente idênticas ('supabase' ou 'local') para garantir consistência entre o servidor e o navegador.`
    );
  }

  if (serverAcademicContent === "supabase" && clientAcademicContent !== "supabase") {
    throw new Error(
      `[Configuração MTD] ACADEMIC_CONTENT_DATA_SOURCE está configurada como 'supabase', mas NEXT_PUBLIC_ACADEMIC_CONTENT_DATA_SOURCE não é 'supabase' (atual: "${clientAcademicContent || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  if (clientAcademicContent === "supabase" && serverAcademicContent !== "supabase") {
    throw new Error(
      `[Configuração MTD] NEXT_PUBLIC_ACADEMIC_CONTENT_DATA_SOURCE está configurada como 'supabase', mas ACADEMIC_CONTENT_DATA_SOURCE não é 'supabase' (atual: "${serverAcademicContent || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  const rawAcademicContent = serverAcademicContent || clientAcademicContent || dataSource;
  if (rawAcademicContent !== "local" && rawAcademicContent !== "supabase") {
    throw new Error(
      `[Configuração MTD] ACADEMIC_CONTENT_DATA_SOURCE inválido: "${rawAcademicContent}". Esperado: "local" ou "supabase".`
    );
  }
  const academicContentDataSource: DataSource = rawAcademicContent;

  const serverAcademicEvaluations = process.env.ACADEMIC_EVALUATIONS_DATA_SOURCE;
  const clientAcademicEvaluations = process.env.NEXT_PUBLIC_ACADEMIC_EVALUATIONS_DATA_SOURCE;

  if (
    serverAcademicEvaluations &&
    clientAcademicEvaluations &&
    serverAcademicEvaluations !== clientAcademicEvaluations
  ) {
    throw new Error(
      `[Configuração MTD] Divergência crítica detectada entre ACADEMIC_EVALUATIONS_DATA_SOURCE ("${serverAcademicEvaluations}") e NEXT_PUBLIC_ACADEMIC_EVALUATIONS_DATA_SOURCE ("${clientAcademicEvaluations}"). Ambas as variáveis devem ser estritamente idênticas ('supabase' ou 'local') para garantir consistência entre o servidor e o navegador.`
    );
  }

  if (serverAcademicEvaluations === "supabase" && clientAcademicEvaluations !== "supabase") {
    throw new Error(
      `[Configuração MTD] ACADEMIC_EVALUATIONS_DATA_SOURCE está configurada como 'supabase', mas NEXT_PUBLIC_ACADEMIC_EVALUATIONS_DATA_SOURCE não é 'supabase' (atual: "${clientAcademicEvaluations || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  if (clientAcademicEvaluations === "supabase" && serverAcademicEvaluations !== "supabase") {
    throw new Error(
      `[Configuração MTD] NEXT_PUBLIC_ACADEMIC_EVALUATIONS_DATA_SOURCE está configurada como 'supabase', mas ACADEMIC_EVALUATIONS_DATA_SOURCE não é 'supabase' (atual: "${serverAcademicEvaluations || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  const rawAcademicEvaluations = serverAcademicEvaluations || clientAcademicEvaluations || dataSource;
  if (rawAcademicEvaluations !== "local" && rawAcademicEvaluations !== "supabase") {
    throw new Error(
      `[Configuração MTD] ACADEMIC_EVALUATIONS_DATA_SOURCE inválido: "${rawAcademicEvaluations}". Esperado: "local" ou "supabase".`
    );
  }
  const academicEvaluationsDataSource: DataSource = rawAcademicEvaluations;

  const serverAcademicFlashcards = process.env.ACADEMIC_FLASHCARDS_DATA_SOURCE;
  const clientAcademicFlashcards = process.env.NEXT_PUBLIC_ACADEMIC_FLASHCARDS_DATA_SOURCE;

  if (
    serverAcademicFlashcards &&
    clientAcademicFlashcards &&
    serverAcademicFlashcards !== clientAcademicFlashcards
  ) {
    throw new Error(
      `[Configuração MTD] Divergência crítica detectada entre ACADEMIC_FLASHCARDS_DATA_SOURCE ("${serverAcademicFlashcards}") e NEXT_PUBLIC_ACADEMIC_FLASHCARDS_DATA_SOURCE ("${clientAcademicFlashcards}"). Ambas as variáveis devem ser estritamente idênticas ('supabase' ou 'local') para garantir consistência entre o servidor e o navegador.`
    );
  }

  if (serverAcademicFlashcards === "supabase" && clientAcademicFlashcards !== "supabase") {
    throw new Error(
      `[Configuração MTD] ACADEMIC_FLASHCARDS_DATA_SOURCE está configurada como 'supabase', mas NEXT_PUBLIC_ACADEMIC_FLASHCARDS_DATA_SOURCE não é 'supabase' (atual: "${clientAcademicFlashcards || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  if (clientAcademicFlashcards === "supabase" && serverAcademicFlashcards !== "supabase") {
    throw new Error(
      `[Configuração MTD] NEXT_PUBLIC_ACADEMIC_FLASHCARDS_DATA_SOURCE está configurada como 'supabase', mas ACADEMIC_FLASHCARDS_DATA_SOURCE não é 'supabase' (atual: "${serverAcademicFlashcards || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  const rawAcademicFlashcards = serverAcademicFlashcards || clientAcademicFlashcards || dataSource;
  if (rawAcademicFlashcards !== "local" && rawAcademicFlashcards !== "supabase") {
    throw new Error(
      `[Configuração MTD] ACADEMIC_FLASHCARDS_DATA_SOURCE inválido: "${rawAcademicFlashcards}". Esperado: "local" ou "supabase".`
    );
  }
  const academicFlashcardsDataSource: DataSource = rawAcademicFlashcards;

  const serverAcademicSelfPresentation = process.env.ACADEMIC_SELF_PRESENTATION_DATA_SOURCE;
  const clientAcademicSelfPresentation = process.env.NEXT_PUBLIC_ACADEMIC_SELF_PRESENTATION_DATA_SOURCE;

  if (
    serverAcademicSelfPresentation &&
    clientAcademicSelfPresentation &&
    serverAcademicSelfPresentation !== clientAcademicSelfPresentation
  ) {
    throw new Error(
      `[Configuração MTD] Divergência crítica detectada entre ACADEMIC_SELF_PRESENTATION_DATA_SOURCE ("${serverAcademicSelfPresentation}") e NEXT_PUBLIC_ACADEMIC_SELF_PRESENTATION_DATA_SOURCE ("${clientAcademicSelfPresentation}"). Ambas as variáveis devem ser estritamente idênticas ('supabase' ou 'local') para garantir consistência entre o servidor e o navegador.`
    );
  }

  if (serverAcademicSelfPresentation === "supabase" && clientAcademicSelfPresentation !== "supabase") {
    throw new Error(
      `[Configuração MTD] ACADEMIC_SELF_PRESENTATION_DATA_SOURCE está configurada como 'supabase', mas NEXT_PUBLIC_ACADEMIC_SELF_PRESENTATION_DATA_SOURCE não é 'supabase' (atual: "${clientAcademicSelfPresentation || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  if (clientAcademicSelfPresentation === "supabase" && serverAcademicSelfPresentation !== "supabase") {
    throw new Error(
      `[Configuração MTD] NEXT_PUBLIC_ACADEMIC_SELF_PRESENTATION_DATA_SOURCE está configurada como 'supabase', mas ACADEMIC_SELF_PRESENTATION_DATA_SOURCE não é 'supabase' (atual: "${serverAcademicSelfPresentation || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  const rawAcademicSelfPresentation = serverAcademicSelfPresentation || clientAcademicSelfPresentation || dataSource;
  if (rawAcademicSelfPresentation !== "local" && rawAcademicSelfPresentation !== "supabase") {
    throw new Error(
      `[Configuração MTD] ACADEMIC_SELF_PRESENTATION_DATA_SOURCE inválido: "${rawAcademicSelfPresentation}". Esperado: "local" ou "supabase".`
    );
  }
  const academicSelfPresentationDataSource: DataSource = rawAcademicSelfPresentation;

  const serverCommunity = process.env.COMMUNITY_DATA_SOURCE;
  const clientCommunity = process.env.NEXT_PUBLIC_COMMUNITY_DATA_SOURCE;

  if (
    serverCommunity &&
    clientCommunity &&
    serverCommunity !== clientCommunity
  ) {
    throw new Error(
      `[Configuração MTD] Divergência crítica detectada entre COMMUNITY_DATA_SOURCE ("${serverCommunity}") e NEXT_PUBLIC_COMMUNITY_DATA_SOURCE ("${clientCommunity}"). Ambas as variáveis devem ser estritamente idênticas ('supabase' ou 'local') para garantir consistência entre o servidor e o navegador.`
    );
  }

  if (serverCommunity === "supabase" && clientCommunity !== "supabase") {
    throw new Error(
      `[Configuração MTD] COMMUNITY_DATA_SOURCE está configurada como 'supabase', mas NEXT_PUBLIC_COMMUNITY_DATA_SOURCE não é 'supabase' (atual: "${clientCommunity || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  if (clientCommunity === "supabase" && serverCommunity !== "supabase") {
    throw new Error(
      `[Configuração MTD] NEXT_PUBLIC_COMMUNITY_DATA_SOURCE está configurada como 'supabase', mas COMMUNITY_DATA_SOURCE não é 'supabase' (atual: "${serverCommunity || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  const rawCommunity = serverCommunity || clientCommunity || dataSource;
  if (rawCommunity !== "local" && rawCommunity !== "supabase") {
    throw new Error(
      `[Configuração MTD] COMMUNITY_DATA_SOURCE inválido: "${rawCommunity}". Esperado: "local" ou "supabase".`
    );
  }
  const communityDataSource: DataSource = rawCommunity;

  const serverGamification = process.env.GAMIFICATION_DATA_SOURCE;
  const clientGamification = process.env.NEXT_PUBLIC_GAMIFICATION_DATA_SOURCE;

  if (
    serverGamification &&
    clientGamification &&
    serverGamification !== clientGamification
  ) {
    throw new Error(
      `[Configuração MTD] Divergência crítica detectada entre GAMIFICATION_DATA_SOURCE ("${serverGamification}") e NEXT_PUBLIC_GAMIFICATION_DATA_SOURCE ("${clientGamification}"). Ambas as variáveis devem ser estritamente idênticas ('supabase' ou 'local') para garantir consistência entre o servidor e o navegador.`
    );
  }

  if (serverGamification === "supabase" && clientGamification !== "supabase") {
    throw new Error(
      `[Configuração MTD] GAMIFICATION_DATA_SOURCE está configurada como 'supabase', mas NEXT_PUBLIC_GAMIFICATION_DATA_SOURCE não é 'supabase' (atual: "${clientGamification || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  if (clientGamification === "supabase" && serverGamification !== "supabase") {
    throw new Error(
      `[Configuração MTD] NEXT_PUBLIC_GAMIFICATION_DATA_SOURCE está configurada como 'supabase', mas GAMIFICATION_DATA_SOURCE não é 'supabase' (atual: "${serverGamification || "indefinida"}"). Configure ambas com o mesmo valor.`
    );
  }

  const rawGamification = serverGamification || clientGamification || dataSource;
  if (rawGamification !== "local" && rawGamification !== "supabase") {
    throw new Error(
      `[Configuração MTD] GAMIFICATION_DATA_SOURCE inválido: "${rawGamification}". Esperado: "local" ou "supabase".`
    );
  }
  const gamificationDataSource: DataSource = rawGamification;

  const isVercelProduction = process.env.VERCEL_ENV === "production";
  const isAuthTestWithLocalData =
    authMode === "supabase" && dataSource === "local";

  // Validação estrita de segurança: AUTH_MODE=supabase com DATA_SOURCE=local NÃO pode rodar em Produção
  if (
    (isVercelProduction || appMode === "production") &&
    isAuthTestWithLocalData
  ) {
    throw new Error(
      "[Segurança MTD] A combinação AUTH_MODE=supabase com DATA_SOURCE=local é estritamente proibida no ambiente de Produção. Em produção utilize DATA_SOURCE=supabase ou retorne para AUTH_MODE=demo."
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || "";

  // Se AUTH_MODE=supabase ou APP_MODE=production, credenciais públicas do Supabase são obrigatórias
  if (authMode === "supabase" || appMode === "production") {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!supabasePublishableKey)
      missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

    if (missing.length > 0) {
      throw new Error(
        `[Configuração MTD] AUTH_MODE=supabase ativo, mas as seguintes variáveis obrigatórias estão ausentes: ${missing.join(
          ", "
        )}. Configure-as no ambiente ou retorne para AUTH_MODE=demo.`
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
    authMode,
    dataSource,
    coreUsersDataSource,
    academicCoreDataSource,
    academicAgendaDataSource,
    academicContentDataSource,
    academicEvaluationsDataSource,
    academicFlashcardsDataSource,
    academicSelfPresentationDataSource,
    communityDataSource,
    gamificationDataSource,
    isAuthTestWithLocalData,
    supabaseUrl,
    supabasePublishableKey,
    supabaseSecretKey,
    isDemoClient: appMode === "demo" && authMode === "demo",
    isAuthTestBannerVisible: false,
  };
}

/**
 * Lê configurações públicas seguras no cliente (Client Components).
 * Nunca expõe chaves secretas ou credenciais privilegiadas.
 */
export function getClientEnv(): ClientEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  const defaultClientDataSource: DataSource =
    (process.env.NEXT_PUBLIC_DATA_SOURCE as DataSource) || "local";
  const coreUsersDataSource: DataSource =
    (process.env.NEXT_PUBLIC_CORE_USERS_DATA_SOURCE as DataSource) || defaultClientDataSource;
  const academicCoreDataSource: DataSource =
    (process.env.NEXT_PUBLIC_ACADEMIC_CORE_DATA_SOURCE as DataSource) || defaultClientDataSource;
  const academicAgendaDataSource: DataSource =
    (process.env.NEXT_PUBLIC_ACADEMIC_AGENDA_DATA_SOURCE as DataSource) || defaultClientDataSource;
  const academicContentDataSource: DataSource =
    (process.env.NEXT_PUBLIC_ACADEMIC_CONTENT_DATA_SOURCE as DataSource) || defaultClientDataSource;
  const academicEvaluationsDataSource: DataSource =
    (process.env.NEXT_PUBLIC_ACADEMIC_EVALUATIONS_DATA_SOURCE as DataSource) || defaultClientDataSource;
  const academicFlashcardsDataSource: DataSource =
    (process.env.NEXT_PUBLIC_ACADEMIC_FLASHCARDS_DATA_SOURCE as DataSource) || defaultClientDataSource;
  const academicSelfPresentationDataSource: DataSource =
    (process.env.NEXT_PUBLIC_ACADEMIC_SELF_PRESENTATION_DATA_SOURCE as DataSource) || defaultClientDataSource;
  const communityDataSource: DataSource =
    (process.env.NEXT_PUBLIC_COMMUNITY_DATA_SOURCE as DataSource) || defaultClientDataSource;
  const gamificationDataSource: DataSource =
    (process.env.NEXT_PUBLIC_GAMIFICATION_DATA_SOURCE as DataSource) || defaultClientDataSource;

  return {
    supabaseUrl,
    supabasePublishableKey,
    isDemoClient: false,
    isAuthTestBannerVisible: false,
    dataSource: defaultClientDataSource,
    coreUsersDataSource,
    academicCoreDataSource,
    academicAgendaDataSource,
    academicContentDataSource,
    academicEvaluationsDataSource,
    academicFlashcardsDataSource,
    academicSelfPresentationDataSource,
    communityDataSource,
    gamificationDataSource,
  };
}
