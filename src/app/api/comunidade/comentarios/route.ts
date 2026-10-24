import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { publicacaoId, autorId, autorNome, autorAvatar, autorPapel, conteudo } = body;

    const textoComentario = (conteudo || "").trim();
    if (!publicacaoId || !textoComentario || textoComentario.length < 2) {
      return NextResponse.json(
        { success: false, error: "Publicação e conteúdo válido (mínimo 2 caracteres) são obrigatórios." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !secretKey) {
      return NextResponse.json(
        { success: false, error: "Serviço de dados do Supabase não configurado." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Obter a publicação para extrair espaco_id e count atual
    const { data: pub, error: pubErr } = await supabase
      .from("publicacoes_comunidade")
      .select("id, espaco_id, total_comentarios")
      .eq("id", publicacaoId)
      .maybeSingle();

    if (pubErr || !pub) {
      return NextResponse.json(
        { success: false, error: "Publicação não encontrada no Supabase." },
        { status: 404 }
      );
    }

    const comId = `com-${Date.now()}`;
    const papelFinal = autorPapel === "administrador" ? "admin" : autorPapel || "aluno";

    const payload = {
      id: comId,
      publicacao_id: publicacaoId,
      espaco_id: pub.espaco_id,
      autor_id: autorId || "660640d2-99fc-46e7-8e12-9ef0d67b60ee",
      autor_nome: autorNome || "Ray Pires",
      autor_papel: papelFinal,
      autor_avatar: autorAvatar || null,
      conteudo: textoComentario,
      status: "publicado",
      total_curtidas: 0,
      metadata: {},
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("comentarios_comunidade")
      .insert(payload)
      .select()
      .single();

    if (insertErr) {
      console.error("[API Comentários] Erro ao inserir comentário:", insertErr);
      return NextResponse.json(
        { success: false, error: `Erro ao salvar comentário no Supabase: ${insertErr.message}` },
        { status: 500 }
      );
    }

    // Atualiza contagem na publicação
    await supabase
      .from("publicacoes_comunidade")
      .update({ total_comentarios: (pub.total_comentarios || 0) + 1 })
      .eq("id", publicacaoId);

    return NextResponse.json({
      success: true,
      data: {
        id: inserted.id,
        publicacaoId: inserted.publicacao_id,
        espacoId: inserted.espaco_id,
        autorId: inserted.autor_id,
        autorNome: inserted.autor_nome,
        autorPapel: inserted.autor_papel,
        autorTipo: inserted.autor_papel,
        autorAvatar: inserted.autor_avatar || undefined,
        texto: inserted.conteudo,
        conteudo: inserted.conteudo,
        status: inserted.status,
        criadoEm: inserted.created_at,
        atualizadoEm: inserted.updated_at,
      },
    });
  } catch (err: unknown) {
    console.error("[API Comentários] Erro inesperado:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erro interno ao processar comentário." },
      { status: 500 }
    );
  }
}
