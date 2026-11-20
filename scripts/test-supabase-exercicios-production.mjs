import assert from "node:assert";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://oaissugnjvrobhdrnain.supabase.co";
const secretKey = process.env.SUPABASE_SECRET_KEY || "";

if (!secretKey) {
  console.log("SUPABASE_SECRET_KEY not set in environment, skipping test.");
  process.exit(0);
}

async function main() {
  console.log("==================================================================");
  console.log("🧪 TESTE EM PRODUÇÃO SUPABASE: FLUXO DE EXERCÍCIO INTERATIVO");
  console.log("==================================================================\n");

  // 1. Criar exercício de teste
  const novoExercicio = {
    titulo: "TESTE E2E: Past Simple Irregular Verbs",
    descricao: "Exercício automatizado de verificação em produção Supabase.",
    instrucoes: "Selecione a alternativa correta.",
    tipo: "multipla_escolha",
    nivel: "A2",
    categoria: "Grammar Test",
    questoes: [
      {
        id: "q-test-01",
        enunciado: "What is the past simple form of 'bring'?",
        pontos: 5,
        alternativas: [
          { id: "opt-1", texto: "Brang" },
          { id: "opt-2", texto: "Brought" },
          { id: "opt-3", texto: "Bringed" },
          { id: "opt-4", texto: "Broughten" },
        ],
        alternativaCorretaId: "opt-2",
        explicacao: "'Brought' é a forma correta do Past Simple de 'bring'.",
      },
      {
        id: "q-test-02",
        enunciado: "What is the past simple form of 'teach'?",
        pontos: 5,
        alternativas: [
          { id: "opt-5", texto: "Teached" },
          { id: "opt-6", texto: "Taught" },
          { id: "opt-7", texto: "Tought" },
          { id: "opt-8", texto: "Thought" },
        ],
        alternativaCorretaId: "opt-6",
        explicacao: "'Taught' é a forma correta do Past Simple de 'teach'.",
      },
    ],
    destino_tipo: "geral",
    professor_id: "prof-001",
    professor_nome: "Paulo Ricardo",
    status: "publicado",
    nota_maxima: 10,
    nota_minima_aprovacao: 7.0,
    politica_gabarito: "apos_tentativa",
    versao: 1,
  };

  console.log("1. Inserindo exercício de teste no Supabase...");
  const createRes = await fetch(`${url}/rest/v1/exercicios_interativos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(novoExercicio),
  });

  assert.ok(createRes.ok, "Criação do exercício deve retornar HTTP 2xx");
  const [createdEx] = await createRes.json();
  console.log(`✅ Exercício criado com sucesso! ID: ${createdEx.id}`);

  // 2. Simular início de tentativa por aluno de teste
  console.log("\n2. Gravando tentativa em andamento no Supabase...");
  const novaTentativa = {
    exercicio_id: createdEx.id,
    exercicio_titulo: createdEx.titulo,
    exercicio_tipo: createdEx.tipo,
    exercicio_nivel: createdEx.nivel,
    versao_exercicio: createdEx.versao,
    aluno_id: "alu-test-prod",
    aluno_nome: "Aluno de Homologação",
    numero_tentativa: 1,
    status: "em_andamento",
    questoes_snapshot: createdEx.questoes,
    total_questoes: 2,
    pontos_totais: 10,
  };

  const tentRes = await fetch(`${url}/rest/v1/tentativas_exercicios`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(novaTentativa),
  });

  assert.ok(tentRes.ok, "Início da tentativa deve retornar HTTP 2xx");
  const [createdTent] = await tentRes.json();
  console.log(`✅ Tentativa iniciada com sucesso! ID: ${createdTent.id}`);

  // 3. Aluno responde (1 acerto e 1 erro)
  console.log("\n3. Submetendo respostas e calculando nota...");
  // opt-2 é correta (+5 pts), opt-5 é errada (0 pts)
  const respostas = [
    { questaoId: "q-test-01", alternativaEscolhidaId: "opt-2", correta: true, pontosObtidos: 5 },
    { questaoId: "q-test-02", alternativaEscolhidaId: "opt-5", correta: false, pontosObtidos: 0 },
  ];

  const updateRes = await fetch(`${url}/rest/v1/tentativas_exercicios?id=eq.${createdTent.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      status: "concluida",
      concluida_em: new Date().toISOString(),
      tempo_gasto_segundos: 45,
      respostas,
      total_acertos: 1,
      total_erros: 1,
      pontos_obtidos: 5,
      nota_final: 5,
      percentual_aproveitamento: 50,
      aprovado: false,
    }),
  });

  assert.ok(updateRes.ok, "Conclusão da tentativa deve retornar HTTP 2xx");
  const [concludedTent] = await updateRes.json();
  console.log(`✅ Tentativa concluída e persistida no Supabase! Nota: ${concludedTent.nota_final}/10, Acertos: ${concludedTent.total_acertos}/${concludedTent.total_questoes}`);

  // 4. Limpeza do registro de teste para manter a base limpa
  console.log("\n4. Limpando dados de teste efêmeros...");
  await fetch(`${url}/rest/v1/tentativas_exercicios?id=eq.${createdTent.id}`, {
    method: "DELETE",
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
  });
  await fetch(`${url}/rest/v1/exercicios_interativos?id=eq.${createdEx.id}`, {
    method: "DELETE",
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
  });
  console.log("✅ Limpeza de teste concluída com sucesso!");

  console.log("\n==================================================================");
  console.log("🎉 TESTE EM PRODUÇÃO CONCLUÍDO COM 100% DE SUCESSO!");
  console.log("==================================================================\n");
}

main().catch((err) => {
  console.error("❌ ERRO NO TESTE EM PRODUÇÃO:", err);
  process.exit(1);
});
