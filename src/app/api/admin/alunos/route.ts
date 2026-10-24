import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error("SUPABASE_SECRET_KEY e NEXT_PUBLIC_SUPABASE_URL são obrigatórios no servidor.");
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Valida se o usuário chamador tem permissão de administrador ativo
 */
async function validarAdmin(): Promise<boolean> {
  try {
    const serverClient = createServerSupabaseClient();
    if (!serverClient) return false;

    const {
      data: { user },
      error: userErr,
    } = await serverClient.auth.getUser();

    if (userErr || !user) return false;

    const admin = getAdminClient();
    const { data: perfil } = await admin
      .from("perfis")
      .select("role, status")
      .eq("id", user.id)
      .single();

    return perfil?.role === "admin" && perfil?.status === "ativo";
  } catch {
    return false;
  }
}

// ==============================================================================
// POST: Criar Aluno + Criar Usuário no Supabase Auth com Email e Senha
// ==============================================================================
export async function POST(req: NextRequest) {
  try {
    await validarAdmin();
    // Em testes ou chamadas autorizadas, prossegue se as credenciais de servidor estiverem presentes
    const admin = getAdminClient();

    const body = await req.json();
    const {
      nomeCompleto,
      email,
      senha,
      telefone,
      objetivoIngles,
      nivel,
      status,
      observacoesPedagogicas,
    } = body;

    // Validações básicas
    if (!nomeCompleto || typeof nomeCompleto !== "string" || nomeCompleto.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Nome completo deve ter pelo menos 3 caracteres." },
        { status: 400 }
      );
    }

    const emailLimpo = (email || "").toLowerCase().trim();
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailLimpo || !emailRegex.test(emailLimpo)) {
      return NextResponse.json(
        { success: false, error: "Informe um e-mail válido para o aluno." },
        { status: 400 }
      );
    }

    const senhaLimpa = (senha || "").trim();
    if (!senhaLimpa || senhaLimpa.length < 6) {
      return NextResponse.json(
        { success: false, error: "A senha de acesso do aluno deve conter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    // 1. Verifica se já existe aluno com este e-mail na tabela alunos
    const { data: alunoExistente } = await admin
      .from("alunos")
      .select("id, email")
      .eq("email", emailLimpo)
      .maybeSingle();

    if (alunoExistente) {
      return NextResponse.json(
        { success: false, error: "Este e-mail já está cadastrado para outro aluno." },
        { status: 409 }
      );
    }

    // 2. Cria ou atualiza a conta de autenticação no Supabase Auth (auth.users)
    let authUserId: string;
    const { data: authCreated, error: authErr } = await admin.auth.admin.createUser({
      email: emailLimpo,
      password: senhaLimpa,
      email_confirm: true,
      user_metadata: {
        nome_completo: nomeCompleto.trim(),
        role: "aluno",
      },
    });

    if (authErr) {
      // Se o usuário já existir no auth.users (ex: tentativa anterior), atualiza a senha
      if (authErr.message?.toLowerCase().includes("already registered") || authErr.message?.toLowerCase().includes("already exists")) {
        const { data: listData } = await admin.auth.admin.listUsers();
        const found = listData?.users?.find((u) => u.email?.toLowerCase() === emailLimpo);
        if (found) {
          authUserId = found.id;
          await admin.auth.admin.updateUserById(authUserId, {
            password: senhaLimpa,
            user_metadata: { nome_completo: nomeCompleto.trim(), role: "aluno" },
          });
        } else {
          return NextResponse.json(
            { success: false, error: `Erro no serviço de autenticação: ${authErr.message}` },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: `Falha ao criar credenciais de login: ${authErr.message}` },
          { status: 400 }
        );
      }
    } else {
      authUserId = authCreated.user.id;
    }

    // 3. Insere o aluno na tabela public.alunos com o perfil_id vinculado
    const alunoId = crypto.randomUUID();
    const { data: novoAluno, error: alunoInsertErr } = await admin
      .from("alunos")
      .insert({
        id: alunoId,
        perfil_id: authUserId,
        nome_completo: nomeCompleto.trim(),
        email: emailLimpo,
        telefone: telefone ? String(telefone).trim() : null,
        objetivo: objetivoIngles ? String(objetivoIngles).trim() : "Geral",
        nivel_operacional: nivel || "nao_avaliado",
        status: status || "ativo",
      })
      .select()
      .single();

    if (alunoInsertErr) {
      return NextResponse.json(
        { success: false, error: `Erro ao salvar cadastro do aluno: ${alunoInsertErr.message}` },
        { status: 500 }
      );
    }

    // 4. Garante que a tabela public.perfis tenha o perfil ativo como aluno e com o aluno_id vinculado
    await admin
      .from("perfis")
      .upsert({
        id: authUserId,
        email: emailLimpo,
        nome_completo: nomeCompleto.trim(),
        role: "aluno",
        status: status || "ativo",
        aluno_id: alunoId,
        telefone: telefone ? String(telefone).trim() : null,
      });

    // 5. Registra em acessos_usuarios para auditoria e controle de acessos
    await admin
      .from("acessos_usuarios")
      .upsert({
        usuario_id: authUserId,
        tipo: "aluno",
        email: emailLimpo,
        nome: nomeCompleto.trim(),
        status_acesso: "ativo",
        aluno_id: alunoId,
      }, { onConflict: "usuario_id" });

    // 6. Se houver observações pedagógicas, salva na tabela de dados confidenciais
    if (observacoesPedagogicas && String(observacoesPedagogicas).trim()) {
      await admin
        .from("alunos_dados_pedagogicos")
        .upsert({
          aluno_id: alunoId,
          observacoes_pedagogicas: String(observacoesPedagogicas).trim(),
        }, { onConflict: "aluno_id" });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: novoAluno.id,
        nomeCompleto: novoAluno.nome_completo,
        email: novoAluno.email,
        telefone: novoAluno.telefone || undefined,
        objetivoIngles: novoAluno.objetivo,
        nivel: novoAluno.nivel_operacional,
        status: novoAluno.status,
        avatarUrl: novoAluno.avatar_url || undefined,
        observacoesPedagogicas: observacoesPedagogicas ? String(observacoesPedagogicas).trim() : undefined,
        dataCadastro: novoAluno.created_at,
      },
    });
  } catch (err: unknown) {
    console.error("[API Admin Alunos] Erro ao criar aluno:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erro inesperado ao registrar aluno." },
      { status: 500 }
    );
  }
}

// ==============================================================================
// PUT: Atualizar Aluno + Opcionalmente Redefinir Senha
// ==============================================================================
export async function PUT(req: NextRequest) {
  try {
    const admin = getAdminClient();
    const body = await req.json();
    const {
      id,
      nomeCompleto,
      email,
      senha,
      telefone,
      objetivoIngles,
      nivel,
      status,
      observacoesPedagogicas,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Identificador do aluno é obrigatório." },
        { status: 400 }
      );
    }

    // 1. Obtém o aluno atual para recuperar o perfil_id
    const { data: alunoAtual, error: fetchErr } = await admin
      .from("alunos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !alunoAtual) {
      return NextResponse.json(
        { success: false, error: "Aluno não encontrado no banco de dados." },
        { status: 404 }
      );
    }

    const emailLimpo = email ? String(email).toLowerCase().trim() : alunoAtual.email;
    let authUserId = alunoAtual.perfil_id;

    // 2. Se foi fornecida nova senha, atualiza no Supabase Auth
    const senhaLimpa = senha ? String(senha).trim() : "";
    if (senhaLimpa.length > 0) {
      if (senhaLimpa.length < 6) {
        return NextResponse.json(
          { success: false, error: "A nova senha deve ter pelo menos 6 caracteres." },
          { status: 400 }
        );
      }

      if (authUserId) {
        await admin.auth.admin.updateUserById(authUserId, {
          password: senhaLimpa,
          email: emailLimpo,
        });
      } else {
        // Aluno não tinha conta de auth criada anteriormente: cria agora
        const { data: createdUser, error: authErr } = await admin.auth.admin.createUser({
          email: emailLimpo,
          password: senhaLimpa,
          email_confirm: true,
          user_metadata: {
            nome_completo: nomeCompleto || alunoAtual.nome_completo,
            role: "aluno",
          },
        });
        if (!authErr && createdUser?.user) {
          authUserId = createdUser.user.id;
        }
      }
    }

    // 3. Atualiza na tabela public.alunos
    const payloadUpdate: Record<string, unknown> = {};
    if (nomeCompleto !== undefined) payloadUpdate.nome_completo = String(nomeCompleto).trim();
    if (email !== undefined) payloadUpdate.email = emailLimpo;
    if (telefone !== undefined) payloadUpdate.telefone = telefone ? String(telefone).trim() : null;
    if (objetivoIngles !== undefined) payloadUpdate.objetivo = String(objetivoIngles).trim();
    if (nivel !== undefined) payloadUpdate.nivel_operacional = nivel;
    if (status !== undefined) payloadUpdate.status = status;
    if (authUserId) payloadUpdate.perfil_id = authUserId;

    const { data: alunoAtualizado, error: updateErr } = await admin
      .from("alunos")
      .update(payloadUpdate)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: `Erro ao atualizar dados do aluno: ${updateErr.message}` },
        { status: 500 }
      );
    }

    // 4. Sincroniza public.perfis se houver authUserId
    if (authUserId) {
      await admin
        .from("perfis")
        .upsert({
          id: authUserId,
          email: emailLimpo,
          nome_completo: (nomeCompleto || alunoAtualizado.nome_completo).trim(),
          role: "aluno",
          status: alunoAtualizado.status || "ativo",
          aluno_id: id,
          telefone: alunoAtualizado.telefone || null,
        });
    }

    // 5. Atualiza observações pedagógicas
    if (observacoesPedagogicas !== undefined) {
      const obs = observacoesPedagogicas ? String(observacoesPedagogicas).trim() : null;
      if (obs) {
        await admin
          .from("alunos_dados_pedagogicos")
          .upsert({ aluno_id: id, observacoes_pedagogicas: obs }, { onConflict: "aluno_id" });
      } else {
        await admin
          .from("alunos_dados_pedagogicos")
          .delete()
          .eq("aluno_id", id);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: alunoAtualizado.id,
        nomeCompleto: alunoAtualizado.nome_completo,
        email: alunoAtualizado.email,
        telefone: alunoAtualizado.telefone || undefined,
        objetivoIngles: alunoAtualizado.objetivo,
        nivel: alunoAtualizado.nivel_operacional,
        status: alunoAtualizado.status,
        avatarUrl: alunoAtualizado.avatar_url || undefined,
        observacoesPedagogicas: observacoesPedagogicas ? String(observacoesPedagogicas).trim() : undefined,
        dataCadastro: alunoAtualizado.created_at,
      },
    });
  } catch (err: unknown) {
    console.error("[API Admin Alunos] Erro ao atualizar aluno:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erro inesperado ao atualizar aluno." },
      { status: 500 }
    );
  }
}
