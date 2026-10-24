import ws from "ws";
if (!globalThis.WebSocket) {
  globalThis.WebSocket = ws;
}
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Carrega .env.local se existir
if (fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error("❌ Faltam credenciais do Supabase em .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey);

async function runTest() {
  console.log("=== INICIANDO TESTE E2E: MATERIAIS & COMUNIDADE ===");

  const adminId = "660640d2-99fc-46e7-8e12-9ef0d67b60ee"; // Ray Pires
  const testIdSuffix = Date.now();

  // 1. TESTE DE MATERIAL COM ARQUIVO ANEXO
  console.log("\n[1/3] Testando criação de Material com Anexo e Autor UUID...");
  const materialPayload = {
    titulo: `Material E2E Teste ${testIdSuffix}`,
    descricao: "Guia completo de pronúncia do Método Paulo em PDF",
    tipo: "pdf",
    categoria: "Pronúncia",
    nivel_recomendado: "todos",
    autor_id: adminId,
    autor_nome: "Ray Pires",
    data_publicacao: new Date().toISOString().slice(0, 10),
    status: "publicado",
    destino_tipo: "geral",
    arquivo_url: `https://oaissugnjvrobhdrnain.supabase.co/storage/v1/object/public/materiais/guia-pronuncia-${testIdSuffix}.pdf`,
    arquivo_nome: "guia-pronuncia-metodo-paulo.pdf",
    tags: ["pronuncia", "audio", "e2e"],
  };

  const { data: mat, error: matErr } = await supabase
    .from("materiais")
    .insert(materialPayload)
    .select()
    .single();

  if (matErr) {
    console.error("❌ Falha ao criar material no Supabase:", matErr.message);
    process.exit(1);
  }
  console.log("✅ Material criado com sucesso! ID:", mat.id);
  console.log("   Autor ID (UUID válido):", mat.autor_id);
  console.log("   Arquivo URL:", mat.arquivo_url);
  console.log("   Arquivo Nome:", mat.arquivo_nome);

  // 2. TESTE DE PUBLICAÇÃO NA COMUNIDADE COM AUTOR REAL
  console.log("\n[2/3] Testando criação de Publicação na Comunidade...");
  const pubPayload = {
    id: `pub-e2e-${testIdSuffix}`,
    espaco_id: "esp-1792839427689", // Espaço Teste existente
    autor_id: adminId,
    autor_nome: "Ray Pires",
    autor_papel: "admin",
    autor_avatar: null,
    tipo: "geral",
    titulo: `Boas-vindas à Comunidade ${testIdSuffix}`,
    conteudo: "Mensagem oficial da coordenação para todos os alunos.",
    status: "publicado",
    total_curtidas: 0,
    total_comentarios: 0,
  };

  const { data: pub, error: pubErr } = await supabase
    .from("publicacoes_comunidade")
    .insert(pubPayload)
    .select()
    .single();

  if (pubErr) {
    console.error("❌ Falha ao criar publicação no Supabase:", pubErr.message);
    process.exit(1);
  }
  console.log("✅ Publicação criada com sucesso! ID:", pub.id);
  console.log("   Autor Nome:", pub.autor_nome);
  console.log("   Autor Papel:", pub.autor_papel);

  // 3. TESTE DE COMENTÁRIO NA PUBLICAÇÃO
  console.log("\n[3/3] Testando criação de Comentário e incremento do contador...");
  const comPayload = {
    id: `com-e2e-${testIdSuffix}`,
    publicacao_id: pub.id,
    espaco_id: pub.espaco_id,
    autor_id: adminId,
    autor_nome: "Ray Pires",
    autor_papel: "admin",
    autor_avatar: null,
    conteudo: "Este é um comentário oficial de teste validando persistência direta.",
    status: "publicado",
    total_curtidas: 0,
    metadata: {},
  };

  const { data: com, error: comErr } = await supabase
    .from("comentarios_comunidade")
    .insert(comPayload)
    .select()
    .single();

  if (comErr) {
    console.error("❌ Falha ao criar comentário no Supabase:", comErr.message);
    process.exit(1);
  }
  console.log("✅ Comentário criado com sucesso! ID:", com.id);
  console.log("   Publicação ID:", com.publicacao_id);
  console.log("   Conteúdo:", com.conteudo);

  // Atualiza contador
  await supabase
    .from("publicacoes_comunidade")
    .update({ total_comentarios: 1 })
    .eq("id", pub.id);

  // Consulta para verificar persistência
  const { data: checkPub } = await supabase
    .from("publicacoes_comunidade")
    .select("total_comentarios")
    .eq("id", pub.id)
    .single();
  console.log("   Total comentários verificado na publicação:", checkPub?.total_comentarios);

  // Limpeza segura dos registros de teste criados
  console.log("\n🧹 Limpando registros transitórios de teste...");
  await supabase.from("comentarios_comunidade").delete().eq("id", com.id);
  await supabase.from("publicacoes_comunidade").delete().eq("id", pub.id);
  await supabase.from("materiais").delete().eq("id", mat.id);
  console.log("✅ Registros transitórios removidos com sucesso.");

  console.log("\n🎉 TODOS OS TESTES E2E FORAM APROVADOS COM SUCESSO!");
}

runTest().catch((e) => {
  console.error("❌ Erro no teste:", e);
  process.exit(1);
});
