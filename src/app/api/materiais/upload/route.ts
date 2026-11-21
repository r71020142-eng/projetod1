import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Endpoint de Upload de Arquivos para Materiais Didáticos no Supabase Storage.
 *
 * Bucket: 'materiais' (público)
 * Limite de tamanho: 50MB
 * Extensões aceitas: PDF, áudio (MP3, WAV, AAC, M4A, OGG), vídeo (MP4, WEBM), documentos (DOCX, PPTX, TXT), imagens (PNG, JPG).
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
    
    // Suporte tanto a múltiplos arquivos ('files' ou 'file') quanto a envio único
    const rawFiles: unknown[] = [
      ...formData.getAll("files"),
      ...formData.getAll("file"),
    ];

    const files = rawFiles.filter(
      (f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f && (f as File).size > 0
    );

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum arquivo válido enviado." },
        { status: 400 }
      );
    }

    // Validação de tamanho (máximo 50MB por arquivo)
    const MAX_SIZE = 50 * 1024 * 1024;
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `O arquivo "${file.name || "enviado"}" excede o limite máximo permitido de 50MB.`,
          },
          { status: 400 }
        );
      }
    }

    // Cria cliente com permissões administrativas para garantir upload no bucket
    const supabaseAdmin = createSupabaseJsClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const uploadedFiles: Array<{
      url: string;
      fileName: string;
      size: number;
      path: string;
      type: string;
    }> = [];

    for (const file of files) {
      // Sanitização do nome do arquivo
      const originalName = file.name || "arquivo";
      const sanitizedName = originalName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${Date.now()}_${Math.random().toString(36).substring(7)}_${sanitizedName}`;

      const ext = originalName.split(".").pop()?.toLowerCase() || "";
      let tipoArquivo = "documento";
      if (file.type?.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
        tipoArquivo = "imagem";
      } else if (ext === "pdf" || file.type === "application/pdf") {
        tipoArquivo = "pdf";
      } else if (["mp3", "wav", "aac", "ogg", "m4a"].includes(ext) || file.type?.startsWith("audio/")) {
        tipoArquivo = "audio";
      } else if (["mp4", "webm", "mov", "avi"].includes(ext) || file.type?.startsWith("video/")) {
        tipoArquivo = "video";
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from("materiais")
        .upload(filePath, fileBuffer, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });

      if (uploadError) {
        console.error(`[Upload Material] Erro ao gravar "${originalName}":`, uploadError);
        return NextResponse.json(
          {
            success: false,
            error: `Falha ao gravar "${originalName}" no Supabase Storage: ${uploadError.message}`,
          },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from("materiais")
        .getPublicUrl(uploadData.path);

      uploadedFiles.push({
        url: publicUrlData.publicUrl,
        fileName: originalName,
        size: file.size,
        path: uploadData.path,
        type: tipoArquivo,
      });
    }

    const first = uploadedFiles[0];

    return NextResponse.json({
      success: true,
      url: first?.url || "",
      fileName: first?.fileName || "",
      size: first?.size || 0,
      path: first?.path || "",
      type: first?.type || "documento",
      files: uploadedFiles,
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
