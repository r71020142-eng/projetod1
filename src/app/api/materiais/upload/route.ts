import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Endpoint de Upload de Arquivos para Materiais Didáticos no Supabase Storage.
 *
 * Bucket: 'materiais' (público)
 * Limite de tamanho: 50MB
 * Extensões aceitas: PDF, áudio (MP3, WAV, AAC), vídeo (MP4, WEBM), documentos (DOCX, PPTX, TXT), imagens (PNG, JPG).
 */
export async function POST(req: NextRequest) {
  try {
    const env = getServerEnv();
    const supabaseUrl = env.supabaseUrl;
    const secretKey = env.supabaseSecretKey;

    if (!supabaseUrl || !secretKey) {
      return NextResponse.json(
        { success: false, error: "Serviço de armazenamento não configurado no servidor." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Nenhum arquivo enviado." },
        { status: 400 }
      );
    }

    // Validação de tamanho (máximo 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "O arquivo excede o limite máximo permitido de 50MB." },
        { status: 400 }
      );
    }

    // Sanitização do nome do arquivo
    const originalName = file.name || "arquivo";
    const sanitizedName = originalName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${Date.now()}_${sanitizedName}`;

    // Cria cliente com permissões administrativas para garantir upload no bucket
    const supabaseAdmin = createSupabaseJsClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("materiais")
      .upload(filePath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      console.error("[Upload Material] Erro ao gravar no storage:", uploadError);
      return NextResponse.json(
        { success: false, error: `Falha ao gravar arquivo no Supabase Storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("materiais")
      .getPublicUrl(uploadData.path);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      fileName: originalName,
      size: file.size,
      path: uploadData.path,
    });
  } catch (err: unknown) {
    console.error("[Upload Material] Erro inesperado:", err);
    return NextResponse.json(
      {
        success: false,
        error: `Erro interno ao processar upload: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 }
    );
  }
}
