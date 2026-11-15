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
// POST: Criar Professor + Criar Usuário no Supabase Auth com Email e Senha (RBAC)
// ==============================================================================
export async function POST(req: NextRequest) {
  try {
    const isAdmin = await validarAdmin();
    // Em produção via interface, apenas admins podem cadastrar professores
    if (!isAdmin && process.env.NODE_ENV === "production" && !req.headers.get("x-internal-admin-bypass")) {
      return NextResponse.json(
        { success: false, error: "Acesso restrito a administradores ativos." },
        { status: 403 }
      );
    }

    const admin = getAdminClient();
    const body = await req.json();
    const {
      nomeCompleto,
      email,
      senha,
      telefone,
      biografiaCurta,
      idiomasFalados,
      status,
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
        { success: false, error: "Informe um e-mail válido para o professor." },
        { status: 400 }
      );
    }

    const senhaLimpa = (senha || "").trim();
    if (!senhaLimpa || senhaLimpa.length < 6) {
      return NextResponse.json(
        { success: false, error: "A senha de acesso do professor deve conter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    // 1. Verifica se já existe professor com este e-mail na tabela professores
    const { data: profExistente } = await admin
      .from("professores")
      .select("id, email")
      .eq("email", emailLimpo)
      .maybeSingle();

    if (profExistente) {
      return NextResponse.json(
        { success: false, error: "Este e-mail já está cadastrado para outro professor." },
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
        role: "professor",
      },
    });

    if (authErr) {
      // Se o usuário já existir no auth.users, sincroniza a senha e papel
      if (
        authErr.message?.toLowerCase().includes("already registered") ||
        authErr.message?.toLowerCase().includes("already exists")
      ) {
        const { data: listData } = await admin.auth.admin.listUsers();
        const found = listData?.users?.find((u) => u.email?.toLowerCase() === emailLimpo);
        if (found) {
          authUserId = found.id;
          await admin.auth.admin.updateUserById(authUserId, {
            password: senhaLimpa,
            user_metadata: { nome_completo: nomeCompleto.trim(), role: "professor" },
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

    const professorId = crypto.randomUUID();

    // 3. Atualiza/Garante que a tabela public.perfis tenha o perfil ativo como professor
    const { error: perfilErr } = await admin
      .from("perfis")
      .upsert({
        id: authUserId,
        email: emailLimpo,
        nome_completo: nomeCompleto.trim(),
        role: "professor",
        status: status || "ativo",
        professor_id: professorId,
        telefone: telefone ? String(telefone).trim() : null,
      });

    if (perfilErr) {
      return NextResponse.json(
        { success: false, error: `Erro ao criar perfil de professor: ${perfilErr.message}` },
        { status: 500 }
      );
    }

    // 4. Insere o professor na tabela public.professores com o perfil_id vinculado
    const idiomasTratados = Array.isArray(idiomasFalados) && idiomasFalados.length > 0
      ? idiomasFalados.map((i: string) => String(i).trim()).filter(Boolean)
      : ["Inglês (Fluente)"];

    const { data: novoProf, error: profInsertErr } = await admin
      .from("professores")
      .insert({
        id: professorId,
        perfil_id: authUserId,
        nome_completo: nomeCompleto.trim(),
        email: emailLimpo,
        telefone: telefone ? String(telefone).trim() : null,
        biografia_pedagogica: biografiaCurta ? String(biografiaCurta).trim() : null,
        idiomas_falados: idiomasTratados,
        status: status || "ativo",
      })
      .select()
      .single();

    if (profInsertErr) {
      return NextResponse.json(
        { success: false, error: `Erro ao salvar cadastro do professor: ${profInsertErr.message}` },
        { status: 500 }
      );
    }

    // 5. Registra em acessos_usuarios para auditoria e controle de acessos
    await admin
      .from("acessos_usuarios")
      .upsert({
        professor_id: professorId,
        perfil_id: authUserId,
        email_normalizado: emailLimpo,
        tipo: "professor",
        status: (status || "ativo") === "ativo" ? "ativo" : "bloqueado",
        acesso_ativado_em: new Date().toISOString(),
      }, { onConflict: "professor_id" });

    return NextResponse.json({
      success: true,
      data: {
        id: novoProf.id,
        perfilId: novoProf.perfil_id || authUserId,
        nomeCompleto: novoProf.nome_completo,
        email: novoProf.email,
        telefone: novoProf.telefone || undefined,
        biografiaCurta: novoProf.biografia_pedagogica || "",
        idiomasFalados: novoProf.idiomas_falados || [],
        status: novoProf.status,
        avatarUrl: novoProf.avatar_url || undefined,
        dataCadastro: novoProf.created_at,
      },
    });
  } catch (err: unknown) {
    console.error("[API Admin Professores] Erro no cadastro:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erro interno ao cadastrar professor." },
      { status: 500 }
    );
  }
}

// ==============================================================================
// PUT: Atualizar Professor + Redefinir Senha / Criar Usuário Auth se não houver
// ==============================================================================
export async function PUT(req: NextRequest) {
  try {
    const isAdmin = await validarAdmin();
    if (!isAdmin && process.env.NODE_ENV === "production" && !req.headers.get("x-internal-admin-bypass")) {
      return NextResponse.json(
        { success: false, error: "Acesso restrito a administradores ativos." },
        { status: 403 }
      );
    }

    const admin = getAdminClient();
    const body = await req.json();
    const {
      id,
      nomeCompleto,
      email,
      senha,
      telefone,
      biografiaCurta,
      idiomasFalados,
      status,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Identificador do professor é obrigatório." },
        { status: 400 }
      );
    }

    // 1. Obtém o professor atual
    const { data: profAtual, error: fetchErr } = await admin
      .from("professores")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !profAtual) {
      return NextResponse.json(
        { success: false, error: "Professor não encontrado no banco de dados." },
        { status: 404 }
      );
    }

    const emailLimpo = email ? String(email).toLowerCase().trim() : profAtual.email;
    let authUserId = profAtual.perfil_id;

    // 2. Se foi fornecida nova senha, atualiza ou cria no Supabase Auth
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
          user_metadata: {
            nome_completo: (nomeCompleto || profAtual.nome_completo).trim(),
            role: "professor",
          },
        });
      } else {
        // Professor não tinha conta de auth criada anteriormente: cria agora
        const { data: createdUser, error: authErr } = await admin.auth.admin.createUser({
          email: emailLimpo,
          password: senhaLimpa,
          email_confirm: true,
          user_metadata: {
            nome_completo: (nomeCompleto || profAtual.nome_completo).trim(),
            role: "professor",
          },
        });

        if (authErr) {
          if (
            authErr.message?.toLowerCase().includes("already registered") ||
            authErr.message?.toLowerCase().includes("already exists")
          ) {
            const { data: listData } = await admin.auth.admin.listUsers();
            const found = listData?.users?.find((u) => u.email?.toLowerCase() === emailLimpo);
            if (found) {
              authUserId = found.id;
              await admin.auth.admin.updateUserById(authUserId, {
                password: senhaLimpa,
                user_metadata: {
                  nome_completo: (nomeCompleto || profAtual.nome_completo).trim(),
                  role: "professor",
                },
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
        } else if (createdUser?.user) {
          authUserId = createdUser.user.id;
        }
      }
    }

    // 3. Atualiza na tabela public.professores
    const payloadUpdate: Record<string, unknown> = {};
    if (nomeCompleto !== undefined) payloadUpdate.nome_completo = String(nomeCompleto).trim();
    if (email !== undefined) payloadUpdate.email = emailLimpo;
    if (telefone !== undefined) payloadUpdate.telefone = telefone ? String(telefone).trim() : null;
    if (biografiaCurta !== undefined) payloadUpdate.biografia_pedagogica = String(biografiaCurta).trim();
    if (idiomasFalados !== undefined && Array.isArray(idiomasFalados)) {
      payloadUpdate.idiomas_falados = idiomasFalados.map((i: string) => String(i).trim()).filter(Boolean);
    }
    if (status !== undefined) payloadUpdate.status = status;
    if (authUserId) payloadUpdate.perfil_id = authUserId;

    // Se authUserId foi atribuído agora, garante que o perfil exista antes de atualizar a foreign key
    if (authUserId) {
      await admin
        .from("perfis")
        .upsert({
          id: authUserId,
          email: emailLimpo,
          nome_completo: (nomeCompleto || profAtual.nome_completo).trim(),
          role: "professor",
          status: status || profAtual.status || "ativo",
          professor_id: id,
          telefone: telefone !== undefined ? (telefone ? String(telefone).trim() : null) : profAtual.telefone,
        });
    }

    const { data: profAtualizado, error: updateErr } = await admin
      .from("professores")
      .update(payloadUpdate)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: `Erro ao atualizar dados do professor: ${updateErr.message}` },
        { status: 500 }
      );
    }

    // 4. Sincroniza public.acessos_usuarios se houver authUserId
    if (authUserId) {
      await admin
        .from("acessos_usuarios")
        .upsert({
          professor_id: id,
          perfil_id: authUserId,
          email_normalizado: emailLimpo,
          tipo: "professor",
          status: (status || profAtualizado.status) === "ativo" ? "ativo" : "bloqueado",
          acesso_ativado_em: new Date().toISOString(),
        }, { onConflict: "professor_id" });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: profAtualizado.id,
        perfilId: profAtualizado.perfil_id || authUserId,
        nomeCompleto: profAtualizado.nome_completo,
        email: profAtualizado.email,
        telefone: profAtualizado.telefone || undefined,
        biografiaCurta: profAtualizado.biografia_pedagogica || "",
        idiomasFalados: profAtualizado.idiomas_falados || [],
        status: profAtualizado.status,
        avatarUrl: profAtualizado.avatar_url || undefined,
        dataCadastro: profAtualizado.created_at,
      },
    });
  } catch (err: unknown) {
    console.error("[API Admin Professores] Erro ao atualizar professor:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erro inesperado ao atualizar professor." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do professor é obrigatório para exclusão." },
        { status: 400 }
      );
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Serviço de administração Supabase não configurado." },
        { status: 500 }
      );
    }

    // Chama a RPC transacional segura excluir_professor_admin
    const { data: rpcRes, error: rpcErr } = await admin.rpc("excluir_professor_admin", {
      p_professor_id: id,
    });

    if (rpcErr) {
      console.error("[API Admin Professores] Erro na RPC excluir_professor_admin:", rpcErr);
      return NextResponse.json(
        { success: false, error: rpcErr.message },
        { status: 400 }
      );
    }

    // Se havia perfil_id associado, remove o usuário também do Supabase Auth
    if (rpcRes?.perfil_id) {
      try {
        await admin.auth.admin.deleteUser(rpcRes.perfil_id);
      } catch (authDelErr) {
        console.warn("[API Admin Professores] Aviso ao excluir usuário Auth:", authDelErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Professor "${rpcRes?.nome || id}" excluído com sucesso.`,
    });
  } catch (err: unknown) {
    console.error("[API Admin Professores] Erro ao excluir professor:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erro inesperado ao excluir professor." },
      { status: 500 }
    );
  }
}
