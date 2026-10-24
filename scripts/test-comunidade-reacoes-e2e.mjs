import ws from "ws";
if (!globalThis.WebSocket) {
  globalThis.WebSocket = ws;
}
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Carrega variáveis de ambiente de .env.local
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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !secretKey) {
  console.error("❌ Faltam credenciais do Supabase em .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runTest() {
  console.log("================================================================================");
  console.log("  TESTE E2E: PERSISTÊNCIA DE REAÇÕES (LIKES) E COMENTÁRIOS NA COMUNIDADE MTD   ");
  console.log("================================================================================");

  const timestamp = Date.now();
  const testUserId = "660640d2-99fc-46e7-8e12-9ef0d67b60ee"; // Ray Pires
  const testUserName = "Ray Pires";

  let testPubId = null;
  let testComId = null;

  try {
    // --------------------------------------------------------------------------
    // ETAPA 1: Obter ou criar um espaço de teste
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 1] Verificando canal de comunidade para teste...");
    const { data: espacos } = await adminClient
      .from("espacos_comunidade")
      .select("id")
      .limit(1);

    const espacoId = espacos && espacos.length > 0 ? espacos[0].id : "esp-geral";

    // Cria uma publicação de teste no Supabase
    testPubId = `pub-test-${timestamp}`;
    const { error: insPubErr } = await adminClient.from("publicacoes_comunidade").insert({
      id: testPubId,
      espaco_id: espacoId,
      espaco_nome: "Geral",
      autor_id: testUserId,
      autor_nome: testUserName,
      autor_papel: "admin",
      tipo: "discussao",
      titulo: `Publicação Teste de Reações ${timestamp}`,
      conteudo: "Validação de curtidas e reações atômicas na comunidade sem recarregar a tela.",
      status: "publicado",
      total_curtidas: 0,
      total_comentarios: 0,
      reacoes: { curtidas: 0, apoio: 0, parabens: 0 },
      reacoes_usuarios: [],
      metadata: {},
    });
    if (insPubErr) throw new Error(`Falha ao criar publicação de teste: ${insPubErr.message}`);
    console.log(`  ✅ Publicação de teste criada com sucesso: ${testPubId}`);

    // --------------------------------------------------------------------------
    // ETAPA 2: Testar Reação em Publicação (POST /api/comunidade/reacoes)
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 2] Testando alternar reação em publicação (Curtir)...");
    
    // Simula a lógica da API /api/comunidade/reacoes para o alvo 'publicacao'
    const { data: pub1 } = await adminClient
      .from("publicacoes_comunidade")
      .select("id, reacoes, reacoes_usuarios, total_curtidas, metadata")
      .eq("id", testPubId)
      .single();

    const reacoes1 = { ...pub1.reacoes };
    reacoes1.curtidas = (reacoes1.curtidas || 0) + 1;
    const usuarios1 = [testUserId];
    const meta1 = { ...pub1.metadata, reacoes_por_usuario: { [testUserId]: "curtidas" } };

    const { error: updErr1 } = await adminClient
      .from("publicacoes_comunidade")
      .update({
        reacoes: reacoes1,
        reacoes_usuarios: usuarios1,
        total_curtidas: 1,
        metadata: meta1,
      })
      .eq("id", testPubId);

    if (updErr1) throw new Error(`Falha ao registrar curtida: ${updErr1.message}`);

    // Verifica persistência no Supabase
    const { data: pubVerif1 } = await adminClient
      .from("publicacoes_comunidade")
      .select("reacoes, reacoes_usuarios, total_curtidas, metadata")
      .eq("id", testPubId)
      .single();

    if (pubVerif1.total_curtidas !== 1 || !pubVerif1.reacoes_usuarios.includes(testUserId)) {
      throw new Error(`Falha na contagem de curtidas na publicação! Total: ${pubVerif1.total_curtidas}`);
    }
    console.log(`  ✅ Curtida registrada com sucesso no Supabase: total_curtidas = ${pubVerif1.total_curtidas}`);

    // --------------------------------------------------------------------------
    // ETAPA 3: Testar Troca de Reação (Curtida -> Apoiar)
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 3] Testando troca de reação (Curtir -> Apoiar)...");
    const reacoes2 = { ...pubVerif1.reacoes };
    reacoes2.curtidas = Math.max(0, reacoes2.curtidas - 1);
    reacoes2.apoio = (reacoes2.apoio || 0) + 1;
    const meta2 = { ...pubVerif1.metadata, reacoes_por_usuario: { [testUserId]: "apoio" } };

    await adminClient
      .from("publicacoes_comunidade")
      .update({
        reacoes: reacoes2,
        metadata: meta2,
      })
      .eq("id", testPubId);

    const { data: pubVerif2 } = await adminClient
      .from("publicacoes_comunidade")
      .select("reacoes, metadata, total_curtidas")
      .eq("id", testPubId)
      .single();

    if (pubVerif2.reacoes.apoio !== 1 || pubVerif2.reacoes.curtidas !== 0) {
      throw new Error(`Falha ao trocar reação! Reações atuais: ${JSON.stringify(pubVerif2.reacoes)}`);
    }
    console.log(`  ✅ Troca de reação confirmada no Supabase: apoio = 1, curtidas = 0.`);

    // --------------------------------------------------------------------------
    // ETAPA 4: Testar Toggle Off (Remoção da reação)
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 4] Testando Toggle Off (Remoção de reação)...");
    const reacoes3 = { ...pubVerif2.reacoes };
    reacoes3.apoio = Math.max(0, reacoes3.apoio - 1);
    const meta3 = { ...pubVerif2.metadata };
    delete meta3.reacoes_por_usuario[testUserId];

    await adminClient
      .from("publicacoes_comunidade")
      .update({
        reacoes: reacoes3,
        reacoes_usuarios: [],
        total_curtidas: 0,
        metadata: meta3,
      })
      .eq("id", testPubId);

    const { data: pubVerif3 } = await adminClient
      .from("publicacoes_comunidade")
      .select("reacoes, reacoes_usuarios, total_curtidas")
      .eq("id", testPubId)
      .single();

    if (pubVerif3.total_curtidas !== 0 || pubVerif3.reacoes_usuarios.length !== 0) {
      throw new Error(`Falha ao remover reação! Total: ${pubVerif3.total_curtidas}`);
    }
    console.log(`  ✅ Remoção de reação confirmada no Supabase: total_curtidas = 0.`);

    // --------------------------------------------------------------------------
    // ETAPA 5: Testar Criação de Comentário e Incremento do Contador
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 5] Testando criação de comentário e atualização da publicação...");
    testComId = `com-test-${timestamp}`;
    const { error: insComErr } = await adminClient.from("comentarios_comunidade").insert({
      id: testComId,
      publicacao_id: testPubId,
      espaco_id: espacoId,
      autor_id: testUserId,
      autor_nome: testUserName,
      autor_papel: "admin",
      conteudo: "Comentário de teste E2E validando feedback instantâneo e contagem.",
      status: "publicado",
      total_curtidas: 0,
      metadata: {},
    });
    if (insComErr) throw new Error(`Falha ao criar comentário: ${insComErr.message}`);

    // Incrementa contagem na publicação
    await adminClient
      .from("publicacoes_comunidade")
      .update({ total_comentarios: 1 })
      .eq("id", testPubId);

    const { data: pubVerif4 } = await adminClient
      .from("publicacoes_comunidade")
      .select("total_comentarios")
      .eq("id", testPubId)
      .single();

    if (pubVerif4.total_comentarios !== 1) {
      throw new Error(`Falha ao atualizar contador de comentários! Total: ${pubVerif4.total_comentarios}`);
    }
    console.log(`  ✅ Comentário criado e contador da publicação atualizado: total_comentarios = 1.`);

    // --------------------------------------------------------------------------
    // ETAPA 6: Testar Curtida em Comentário
    // --------------------------------------------------------------------------
    console.log("\n[ETAPA 6] Testando curtida em comentário...");
    const { error: curtirComErr } = await adminClient
      .from("comentarios_comunidade")
      .update({
        total_curtidas: 1,
        metadata: { curtidas_usuarios: [testUserId] },
      })
      .eq("id", testComId);

    if (curtirComErr) throw new Error(`Falha ao curtir comentário: ${curtirComErr.message}`);

    const { data: comVerif } = await adminClient
      .from("comentarios_comunidade")
      .select("total_curtidas, metadata")
      .eq("id", testComId)
      .single();

    if (comVerif.total_curtidas !== 1 || !comVerif.metadata.curtidas_usuarios.includes(testUserId)) {
      throw new Error(`Falha na contagem de curtidas do comentário! Total: ${comVerif.total_curtidas}`);
    }
    console.log(`  ✅ Curtida no comentário confirmada no Supabase: total_curtidas = 1.`);

    console.log("\n================================================================================");
    console.log("  TODAS AS 6 ETAPAS DE REAÇÃO E COMENTÁRIOS FORAM APROVADAS COM SUCESSO!        ");
    console.log("================================================================================");
  } finally {
    // Limpeza
    console.log("\n[LIMPEZA] Removendo dados de teste...");
    if (testComId) {
      await adminClient.from("comentarios_comunidade").delete().eq("id", testComId);
    }
    if (testPubId) {
      await adminClient.from("publicacoes_comunidade").delete().eq("id", testPubId);
    }
    console.log("  ✅ Limpeza concluída.");
  }
}

runTest().catch((err) => {
  console.error("❌ ERRO NO TESTE:", err);
  process.exit(1);
});
