import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import { TipoAcessoUsuario } from "@/types";

/**
 * Endpoint Administrativo para Envio de Convites de Acesso (Etapa 10.2C1).
 *
 * REGRAS DE SEGURANÇA MANDATÓRIAS:
 * 1. Opera exclusivamente no servidor (Route Handler);
 * 2. Exige sessão válida com papel 'admin' e status 'ativo' verificado no banco;
 * 3. Nunca confia em e-mail ou role enviados pelo cliente; o papel é estritamente
 *    inferido do tipo de cadastro operacional ('aluno' ou 'professor');
 * 4. Bloqueia concorrência e não vincula silenciosamente contas preexistentes;
 * 5. Se SUPABASE_SECRET_KEY não estiver configurada, responde com erro controlado (503);
 * 6. Headers: Cache-Control: no-store para mitigar cache de respostas sensíveis.
 */

const ALLOWED_HOST_SUFFIXES = [
  "localhost:3000",
  "127.0.0.1:3000",
  "vercel.app",
];

function resolveSafeBaseUrl(request: Request): string {
  const envUrl = process.env.APP_BASE_URL;
  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      return parsed.origin;
    } catch {
      // Ignora e usa fallback
    }
  }

  const vercelBranch = process.env.VERCEL_BRANCH_URL;
  if (vercelBranch) {
    return `https://${vercelBranch}`;
  }

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) {
    return `https://${vercelProd}`;
  }

  const origin = request.headers.get("origin") || "";
  try {
    const parsed = new URL(origin);
    const host = parsed.host.toLowerCase();
    const isAllowed = ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    );
    if (isAllowed) {
      return parsed.origin;
    }
  } catch {
    // Fallback padrão
  }

  return "http://localhost:3000";
}

export async function POST(request: Request) {
  const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  };

  // 1. Verificação de Sessão do Administrador
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Serviço de autenticação indisponível." },
      { status: 503, headers: noStoreHeaders }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Não autenticado." },
      { status: 401, headers: noStoreHeaders }
    );
  }

  // 2. Confirmação do papel de Administrador Ativo no banco de dados
  const { data: profile, error: profileError } = await supabase
    .from("perfis")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin" ||
    profile.status !== "ativo"
  ) {
    return NextResponse.json(
      { success: false, error: "Acesso restrito a administradores ativos." },
      { status: 403, headers: noStoreHeaders }
    );
  }

  // 3. Validação do Payload da Requisição
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Payload JSON inválido." },
      { status: 400, headers: noStoreHeaders }
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { success: false, error: "Dados da requisição ausentes." },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const { tipo, id } = body as { tipo?: string; id?: string };

  if (tipo !== "aluno" && tipo !== "professor") {
    return NextResponse.json(
      {
        success: false,
        error: "Tipo de cadastro inválido. Esperado 'aluno' ou 'professor'.",
      },
      { status: 400, headers: noStoreHeaders }
    );
  }

  if (!id || typeof id !== "string" || id.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "Identificador do cadastro é obrigatório." },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const entidadeId = id.trim();
  const tipoAcesso = tipo as TipoAcessoUsuario;

  // 4. Busca do Cadastro Operacional Diretamente no Banco
  let nomeCompleto = "";
  let emailOperacional = "";
  let perfilIdExistente: string | null = null;

  if (tipoAcesso === "aluno") {
    const { data: aluno, error: alunoError } = await supabase
      .from("alunos")
      .select("id, nome_completo, email, perfil_id")
      .eq("id", entidadeId)
      .maybeSingle();

    if (alunoError || !aluno) {
      return NextResponse.json(
        { success: false, error: "Discente não encontrado no repositório." },
        { status: 404, headers: noStoreHeaders }
      );
    }
    nomeCompleto = aluno.nome_completo;
    emailOperacional = aluno.email;
    perfilIdExistente = aluno.perfil_id;
  } else {
    const { data: professor, error: profError } = await supabase
      .from("professores")
      .select("id, nome_completo, email, perfil_id")
      .eq("id", entidadeId)
      .maybeSingle();

    if (profError || !professor) {
      return NextResponse.json(
        { success: false, error: "Docente não encontrado no repositório." },
        { status: 404, headers: noStoreHeaders }
      );
    }
    nomeCompleto = professor.nome_completo;
    emailOperacional = professor.email;
    perfilIdExistente = professor.perfil_id;
  }

  // 5. Verificação de Vínculo Prévio
  if (perfilIdExistente) {
    return NextResponse.json(
      {
        success: false,
        error: "Este cadastro já possui um perfil de usuário vinculado.",
      },
      { status: 409, headers: noStoreHeaders }
    );
  }

  const emailNormalizado = emailOperacional.trim().toLowerCase();

  // 6. Verificação de Acesso Existente em acessos_usuarios
  const filterColumn = tipoAcesso === "aluno" ? "aluno_id" : "professor_id";
  const { data: acessoExistente } = await supabase
    .from("acessos_usuarios")
    .select("id, status, email_normalizado, perfil_id")
    .or(
      `${filterColumn}.eq.${entidadeId},email_normalizado.eq.${emailNormalizado}`
    )
    .maybeSingle();

  if (acessoExistente) {
    if (acessoExistente.status === "ativo" || acessoExistente.perfil_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Este cadastro ou e-mail já possui acesso ativo ao sistema.",
        },
        { status: 409, headers: noStoreHeaders }
      );
    }

    if (acessoExistente.status === "processando") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Já existe um convite sendo processado para este usuário. Aguarde a conclusão.",
        },
        { status: 409, headers: noStoreHeaders }
      );
    }
  }

  // 7. Verificação de Configuração da Chave Administrativa (Secret Key)
  const env = getServerEnv();

  if (!env.supabaseSecretKey) {
    // Na Etapa 10.2C1, a Secret Key não está configurada propositalmente
    return NextResponse.json(
      {
        success: false,
        error: "Serviço de convites ainda não configurado neste ambiente.",
        code: "SECRET_KEY_NOT_CONFIGURED",
      },
      { status: 503, headers: noStoreHeaders }
    );
  }

  // 8. Fluxo Privilegiado com Secret Key (Preparado para Etapa 10.2C2)
  let adminClient;
  try {
    adminClient = getAdminSupabaseClient();
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Erro ao inicializar cliente admin.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 503, headers: noStoreHeaders }
    );
  }

  if (!adminClient) {
    return NextResponse.json(
      {
        success: false,
        error: "Serviço de convites ainda não configurado neste ambiente.",
        code: "SECRET_KEY_NOT_CONFIGURED",
      },
      { status: 503, headers: noStoreHeaders }
    );
  }

  // 9. Impede Vinculação Silenciosa de Usuário Auth Preexistente
  const { data: existingAuthUsers } =
    await adminClient.auth.admin.listUsers();
  const existingUserWithEmail = existingAuthUsers?.users?.find(
    (u) => u.email?.trim().toLowerCase() === emailNormalizado
  );

  if (existingUserWithEmail) {
    if (acessoExistente?.id) {
      await adminClient
        .from("acessos_usuarios")
        .update({
          status: "erro",
          ultimo_erro_interno: `Revisão Administrativa: Conta Auth preexistente detectada (UID: ${existingUserWithEmail.id}). Sobrescrita silenciosa bloqueada.`,
        })
        .eq("id", acessoExistente.id);
    }
    return NextResponse.json(
      {
        success: false,
        error:
          "Já existe uma conta de autenticação cadastrada com este e-mail. Resolução manual de identidade necessária.",
        code: "AUTH_USER_PREEXISTING",
      },
      { status: 409, headers: noStoreHeaders }
    );
  }

  // 10. Criação ou Atualização do Registro em acessos_usuarios (Estado: processando)
  let acessoId = acessoExistente?.id;

  if (!acessoId) {
    const insertPayload = {
      aluno_id: tipoAcesso === "aluno" ? entidadeId : null,
      professor_id: tipoAcesso === "professor" ? entidadeId : null,
      email_normalizado: emailNormalizado,
      tipo: tipoAcesso,
      status: "processando",
      convidado_por: user.id,
    };

    const { data: novoAcesso, error: insertError } = await adminClient
      .from("acessos_usuarios")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError || !novoAcesso) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha ao registrar solicitação de acesso.",
        },
        { status: 500, headers: noStoreHeaders }
      );
    }
    acessoId = novoAcesso.id;
  } else {
    await adminClient
      .from("acessos_usuarios")
      .update({
        status: "processando",
        convidado_por: user.id,
      })
      .eq("id", acessoId);
  }

  // 11. Envio do Convite Oficial via Supabase Auth Admin
  const baseUrl = resolveSafeBaseUrl(request);
  const redirectTo = `${baseUrl}/auth/callback?next=/redefinir-senha`;

  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(emailNormalizado, {
      redirectTo,
      data: {
        nome_completo: nomeCompleto,
      },
    });

  if (inviteError || !inviteData.user) {
    await adminClient
      .from("acessos_usuarios")
      .update({
        status: "erro",
        ultimo_erro_interno: inviteError?.message || "Falha no envio do convite.",
      })
      .eq("id", acessoId);

    return NextResponse.json(
      {
        success: false,
        error: "Falha ao enviar e-mail de convite. Tente novamente mais tarde.",
      },
      { status: 500, headers: noStoreHeaders }
    );
  }

  // 12. Execução Atômica da Função de Vínculo (vincular_acesso_usuario)
  const { error: rpcError } = await adminClient.rpc(
    "vincular_acesso_usuario",
    {
      p_acesso_id: acessoId,
      p_auth_user_id: inviteData.user.id,
    }
  );

  if (rpcError) {
    await adminClient
      .from("acessos_usuarios")
      .update({
        status: "erro",
        ultimo_erro_interno: `Auth UID: ${inviteData.user.id} | Falha na vinculação transacional: ${rpcError.message}`,
      })
      .eq("id", acessoId);

    return NextResponse.json(
      {
        success: false,
        error:
          "O convite foi despachado, mas o vínculo institucional falhou. Contate o suporte.",
      },
      { status: 500, headers: noStoreHeaders }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: `Convite de acesso para "${nomeCompleto}" enviado com sucesso!`,
      acessoId,
    },
    { status: 200, headers: noStoreHeaders }
  );
}
