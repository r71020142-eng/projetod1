import assert from "node:assert";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://oaissugnjvrobhdrnain.supabase.co";
const secretKey = process.env.SUPABASE_SECRET_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9haXNzdWduanZyb2JoZHJuYWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjQ4OTkxNSwiZXhwIjoyMTA4MDY1OTE1fQ.KNKpVOtux495gc2z-c_zq_F-CnUKXQAEghZvOXGB9rs";

async function main() {
  console.log("==================================================================");
  console.log("🧪 TESTE AUTOMATIZADO E2E: MULTI-ANEXOS E IMAGENS EM MATERIAIS");
  console.log("==================================================================\n");

  let idCriado = null;

  try {
    // 1. Simular upload direto no Supabase Storage via REST
    console.log("1️⃣ Testando envio de arquivos para o Supabase Storage...");
    
    // Cria buffer simulado para uma imagem PNG colada
    const fakeImageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    const fileNameImg = `test_pasted_image_${Date.now()}.png`;
    const storagePathImg = `test_uploads/${fileNameImg}`;

    const uploadImgRes = await fetch(`${supabaseUrl}/storage/v1/object/materiais/${storagePathImg}`, {
      method: "POST",
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "image/png",
      },
      body: fakeImageBuffer,
    });
    assert(uploadImgRes.ok, `Falha no upload da imagem: ${uploadImgRes.statusText}`);
    const imgPublicUrl = `${supabaseUrl}/storage/v1/object/public/materiais/${storagePathImg}`;
    console.log(`   ✔ Imagem PNG colada enviada: ${imgPublicUrl}`);

    // Cria buffer simulado para um documento PDF
    const fakePdfBuffer = Buffer.from("%PDF-1.4 TESTE DE DOCUMENTO DIDATICO METODO PAULO");
    const fileNamePdf = `test_documento_${Date.now()}.pdf`;
    const storagePathPdf = `test_uploads/${fileNamePdf}`;

    const uploadPdfRes = await fetch(`${supabaseUrl}/storage/v1/object/materiais/${storagePathPdf}`, {
      method: "POST",
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/pdf",
      },
      body: fakePdfBuffer,
    });
    assert(uploadPdfRes.ok, `Falha no upload do PDF: ${uploadPdfRes.statusText}`);
    const pdfPublicUrl = `${supabaseUrl}/storage/v1/object/public/materiais/${storagePathPdf}`;
    console.log(`   ✔ Documento PDF enviado: ${pdfPublicUrl}`);

    // 2. Criar material no banco com múltiplos arquivos
    console.log("\n2️⃣ Criando Material com múltiplos anexos (Imagem + PDF)...");
    const arquivosPayload = [
      {
        url: imgPublicUrl,
        nome: "Screenshot_Vocabulario_Aula.png",
        tipo: "imagem",
        tamanho: fakeImageBuffer.length,
      },
      {
        url: pdfPublicUrl,
        nome: "Apostila_Metodo_Paulo_Unit1.pdf",
        tipo: "pdf",
        tamanho: fakePdfBuffer.length,
      },
    ];

    const insertPayload = {
      titulo: "TESTE E2E: Aula com Múltiplos Anexos e Imagens",
      descricao: "Material didático de teste automatizado para validação de múltiplos anexos.",
      tipo: "documento",
      categoria: "Vocabulário",
      nivel_recomendado: "B1",
      autor_id: "660640d2-99fc-46e7-8e12-9ef0d67b60ee",
      autor_nome: "Ray Pires",
      status: "publicado",
      destino_tipo: "geral",
      arquivo_url: arquivosPayload[0].url,
      arquivo_nome: arquivosPayload[0].nome,
      arquivos: arquivosPayload,
      tags: ["Multi-Anexos", "Imagens", "Teste E2E"],
      conteudo_texto: "Roteiro da aula com imagens e PDF anexados para estudo.",
    };

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/materiais`, {
      method: "POST",
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(insertPayload),
    });

    const insertedData = await insertRes.json();
    assert(insertRes.ok && Array.isArray(insertedData) && insertedData.length > 0, `Erro ao inserir material: ${JSON.stringify(insertedData)}`);
    const criado = insertedData[0];
    idCriado = criado.id;
    console.log(`   ✔ Material criado com ID: ${idCriado}`);
    console.log(`   ✔ Anexos salvos em JSONB (total: ${criado.arquivos.length})`);
    assert.strictEqual(criado.arquivos.length, 2, "Deveria ter salvo exatamente 2 anexos na coluna arquivos");
    assert.strictEqual(criado.arquivo_url, imgPublicUrl, "Retrocompatibilidade: arquivo_url deve apontar para o primeiro anexo");

    // 3. Atualizar material adicionando mais uma imagem (simulando colar nova imagem)
    console.log("\n3️⃣ Atualizando material com nova imagem anexada (Paste simulado)...");
    const novaImagemUrl = `${supabaseUrl}/storage/v1/object/public/materiais/test_uploads/pasted_image_2.png`;
    const arquivosAtualizados = [
      ...criado.arquivos,
      {
        url: novaImagemUrl,
        nome: "imagem_colada_clipboard.png",
        tipo: "imagem",
        tamanho: 2048,
      },
    ];

    const updateRes = await fetch(`${supabaseUrl}/rest/v1/materiais?id=eq.${idCriado}`, {
      method: "PATCH",
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        arquivos: arquivosAtualizados,
      }),
    });

    const updatedData = await updateRes.json();
    assert(updateRes.ok && Array.isArray(updatedData) && updatedData.length > 0, "Falha ao atualizar material");
    const atualizado = updatedData[0];
    assert.strictEqual(atualizado.arquivos.length, 3, "Deveria conter agora 3 anexos");
    console.log(`   ✔ Material atualizado com sucesso! Total de anexos: ${atualizado.arquivos.length}`);

    // 4. Consultar material como Aluno
    console.log("\n4️⃣ Verificando consulta do material...");
    const getRes = await fetch(`${supabaseUrl}/rest/v1/materiais?id=eq.${idCriado}&select=*`, {
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
      },
    });
    const retrieved = (await getRes.json())[0];
    assert(retrieved, "Material não encontrado");
    assert(Array.isArray(retrieved.arquivos) && retrieved.arquivos.length === 3, "Arquivos recuperados incorretamente");
    console.log(`   ✔ Material recuperado com integridade!`);
    retrieved.arquivos.forEach((arq, i) => {
      console.log(`      [${i + 1}] ${arq.nome} (${arq.tipo}) -> ${arq.url}`);
    });

    console.log("\n==================================================================");
    console.log("🎉 TODOS OS TESTES PASSARAM COM SUCESSO (4/4)!");
    console.log("==================================================================");
  } finally {
    // Limpeza do material de teste
    if (idCriado) {
      console.log("\n🧹 Limpando registro de teste...");
      await fetch(`${supabaseUrl}/rest/v1/materiais?id=eq.${idCriado}`, {
        method: "DELETE",
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
        },
      });
      console.log(`   ✔ Material de teste ${idCriado} removido.`);
    }
  }
}

main().catch((err) => {
  console.error("❌ Teste falhou:", err);
  process.exit(1);
});
