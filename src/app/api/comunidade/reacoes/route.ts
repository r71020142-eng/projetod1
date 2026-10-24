import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      alvoTipo = "publicacao",
      alvoId,
      tipo = "curtidas",
      usuarioId,
    } = body;

    if (!alvoId || !usuarioId) {
      return NextResponse.json(
        { success: false, error: "Identificadores alvoId e usuarioId são obrigatórios." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // =========================================================================
    // 1. REAÇÃO EM PUBLICAÇÃO
    // =========================================================================
    if (alvoTipo === "publicacao") {
      const { data: pub, error: fetchErr } = await supabase
        .from("publicacoes_comunidade")
        .select("id, reacoes, reacoes_usuarios, total_curtidas, metadata")
        .eq("id", alvoId)
        .maybeSingle();

      if (fetchErr || !pub) {
        return NextResponse.json(
          { success: false, error: "Publicação não encontrada no banco de dados." },
          { status: 404 }
        );
      }

      const reacoesObj = (pub.reacoes && typeof pub.reacoes === "object" ? { ...pub.reacoes } : {}) as Record<string, number>;
      const usuariosArr = Array.isArray(pub.reacoes_usuarios) ? [...pub.reacoes_usuarios] : [];
      const metadataObj = (pub.metadata && typeof pub.metadata === "object" ? { ...pub.metadata } : {}) as Record<string, unknown>;
      const reacoesPorUsuario = (metadataObj.reacoes_por_usuario && typeof metadataObj.reacoes_por_usuario === "object"
        ? { ...metadataObj.reacoes_por_usuario }
        : {}) as Record<string, string>;

      const reacaoAtual = reacoesPorUsuario[usuarioId] || (usuariosArr.includes(usuarioId) ? "curtidas" : undefined);
      let novaReacaoUsuario: string | null = null;
      let novoTotal = typeof pub.total_curtidas === "number" ? pub.total_curtidas : 0;

      if (reacaoAtual === tipo) {
        // Toggle OFF (remove a reação)
        reacoesObj[tipo] = Math.max(0, (reacoesObj[tipo] || 1) - 1);
        novoTotal = Math.max(0, novoTotal - 1);
        delete reacoesPorUsuario[usuarioId];
        const idx = usuariosArr.indexOf(usuarioId);
        if (idx !== -1) usuariosArr.splice(idx, 1);
        novaReacaoUsuario = null;
      } else {
        if (reacaoAtual) {
          // Troca de tipo de reação (ex.: curtidas -> apoio)
          reacoesObj[reacaoAtual] = Math.max(0, (reacoesObj[reacaoAtual] || 1) - 1);
        } else {
          // Primeira reação do usuário
          novoTotal += 1;
          if (!usuariosArr.includes(usuarioId)) {
            usuariosArr.push(usuarioId);
          }
        }
        reacoesObj[tipo] = (reacoesObj[tipo] || 0) + 1;
        reacoesPorUsuario[usuarioId] = tipo;
        novaReacaoUsuario = tipo;
      }

      metadataObj.reacoes_por_usuario = reacoesPorUsuario;

      const { error: updateErr } = await supabase
        .from("publicacoes_comunidade")
        .update({
          reacoes: reacoesObj,
          reacoes_usuarios: usuariosArr,
          total_curtidas: novoTotal,
          metadata: metadataObj,
        })
        .eq("id", alvoId);

      if (updateErr) {
        console.error("[API Reações] Erro ao persistir reação na publicação:", updateErr);
        return NextResponse.json(
          { success: false, error: `Falha ao registrar reação: ${updateErr.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          publicacaoId: alvoId,
          reacoes: reacoesObj,
          totalCurtidas: novoTotal,
          reacoesUsuarios: usuariosArr,
          reacaoUsuario: novaReacaoUsuario,
        },
      });
    }

    // =========================================================================
    // 2. REAÇÃO EM COMENTÁRIO
    // =========================================================================
    if (alvoTipo === "comentario") {
      const { data: com, error: comErr } = await supabase
        .from("comentarios_comunidade")
        .select("id, total_curtidas, metadata")
        .eq("id", alvoId)
        .maybeSingle();

      if (comErr || !com) {
        return NextResponse.json(
          { success: false, error: "Comentário não encontrado no banco de dados." },
          { status: 404 }
        );
      }

      const metadataObj = (com.metadata && typeof com.metadata === "object" ? { ...com.metadata } : {}) as Record<string, unknown>;
      const curtidasUsuarios = Array.isArray(metadataObj.curtidas_usuarios) ? [...metadataObj.curtidas_usuarios] : [];
      const jaCurtiu = curtidasUsuarios.includes(usuarioId);

      let novoTotal = typeof com.total_curtidas === "number" ? com.total_curtidas : 0;
      let curtiuFinal = false;

      if (jaCurtiu) {
        // Toggle OFF
        const idx = curtidasUsuarios.indexOf(usuarioId);
        if (idx !== -1) curtidasUsuarios.splice(idx, 1);
        novoTotal = Math.max(0, novoTotal - 1);
        curtiuFinal = false;
      } else {
        // Toggle ON
        curtidasUsuarios.push(usuarioId);
        novoTotal += 1;
        curtiuFinal = true;
      }

      metadataObj.curtidas_usuarios = curtidasUsuarios;

      const { error: comUpErr } = await supabase
        .from("comentarios_comunidade")
        .update({
          total_curtidas: novoTotal,
          metadata: metadataObj,
        })
        .eq("id", alvoId);

      if (comUpErr) {
        console.error("[API Reações] Erro ao persistir curtida no comentário:", comUpErr);
        return NextResponse.json(
          { success: false, error: `Falha ao registrar curtida: ${comUpErr.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          comentarioId: alvoId,
          totalCurtidas: novoTotal,
          curtiu: curtiuFinal,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: `alvoTipo '${alvoTipo}' inválido. Utilize 'publicacao' ou 'comentario'.` },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error("[API Reações] Erro inesperado:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Erro interno ao processar reação." },
      { status: 500 }
    );
  }
}
