// scripts/test-agendamento-reposicao-recorrente-e2e.mjs
import WebSocket from "ws";
if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket;
}

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import assert from "assert";

console.log("==================================================================");
console.log("TESTE E2E: AGENDAMENTO DE REPOSIÇÃO E MÚLTIPLOS DIAS NA SEMANA");
console.log("==================================================================");

// Carregar variáveis de .env.local
const envContent = fs.readFileSync(path.resolve(".env.local"), "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const idx = trimmed.indexOf("=");
    if (idx > -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = env.SUPABASE_SECRET_KEY;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !secretKey || !publishableKey) {
  console.error("Variáveis de ambiente incompletas em .env.local");
  process.exit(1);
}

const adminServiceClient = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const adminUserClient = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helper de cálculo de datas
function getNextDayOfWeekDate(startDateStr, targetDow) {
  const [year, month, day] = startDateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const currentDow = d.getDay();
  const diff = (targetDow - currentDow + 7) % 7;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

function addWeeksToDate(dateStr, weeks) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + weeks * 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

function localToUtc(dateStr, timeStr) {
  // Simples conversão UTC para teste
  return new Date(`${dateStr}T${timeStr}:00.000Z`).toISOString();
}

async function run() {
  const timestamp = Date.now();
  let profId = null;
  let alunoId = null;
  let turmaId = null;
  const createdAulaIds = [];

  try {
    // 1. Autenticar como Admin
    console.log("\n1. Autenticando como Administrador...");
    const { data: authData, error: loginErr } = await adminUserClient.auth.signInWithPassword({
      email: "r71020142@gmail.com",
      password: "admin",
    });
    if (loginErr) throw loginErr;
    console.log("-> Admin autenticado com sucesso! UID:", authData.user.id);

    // 2. Criar Professor, Aluno e Turma de Teste
    console.log("\n2. Criando registros efêmeros para o teste...");
    const { data: prof, error: profErr } = await adminServiceClient
      .from("professores")
      .insert({
        nome_completo: `Prof Agenda Test ${timestamp}`,
        email: `prof_agenda_${timestamp}@teste.com`,
        status: "ativo",
      })
      .select()
      .single();
    if (profErr) throw profErr;
    profId = prof.id;

    const { data: aluno, error: alErr } = await adminServiceClient
      .from("alunos")
      .insert({
        nome_completo: `Aluno Agenda Test ${timestamp}`,
        email: `aluno_agenda_${timestamp}@teste.com`,
        nivel_operacional: "B1",
        status: "ativo",
      })
      .select()
      .single();
    if (alErr) throw alErr;
    alunoId = aluno.id;

    const { data: turma, error: tErr } = await adminServiceClient
      .from("turmas")
      .insert({
        nome: `Turma Teste Agenda ${timestamp}`,
        modalidade: "individual",
        nivel: "B1",
        status: "ativa",
        capacidade: 1,
        professor_id: profId,
      })
      .select()
      .single();
    if (tErr) throw tErr;
    turmaId = turma.id;

    // Matricular aluno na turma
    const { error: matErr } = await adminServiceClient
      .from("matriculas_turmas")
      .insert({
        turma_id: turmaId,
        aluno_id: alunoId,
        status: "ativa",
      });
    if (matErr) throw matErr;
    console.log("-> Professor, Aluno, Turma e Matrícula criados.");

    // 3. Teste A: Agendar Aula Única de Reposição
    console.log("\n3. Teste A: Agendando aula única como Reposição (tipo = reposicao)...");
    const inicioUtc = "2026-12-01T14:00:00.000Z";
    const fimUtc = "2026-12-01T15:00:00.000Z";

    const { data: aulaReposicaoId, error: reposicaoErr } = await adminUserClient.rpc("agendar_aula", {
      p_turma_id: turmaId,
      p_professor_id: profId,
      p_titulo: "Reposição: Fonemas Especiais",
      p_inicio_em: inicioUtc,
      p_fim_em: fimUtc,
      p_meeting_url: "https://zoom.us/j/999888777",
      p_observacoes: "Reposição de conteúdo",
      p_serie_id: null,
      p_tipo: "reposicao",
    });

    if (reposicaoErr) throw reposicaoErr;
    createdAulaIds.push(aulaReposicaoId);
    console.log("-> Aula de reposição agendada! ID:", aulaReposicaoId);

    // Verificar se tipo foi salvo como 'reposicao'
    const { data: aulaSalva, error: checkErr } = await adminServiceClient
      .from("aulas")
      .select("id, titulo, tipo, status, presencas_aulas(*)")
      .eq("id", aulaReposicaoId)
      .single();
    if (checkErr) throw checkErr;

    assert.strictEqual(aulaSalva.tipo, "reposicao", "O campo 'tipo' deve ser 'reposicao'");
    assert.strictEqual(aulaSalva.status, "agendada", "Status deve ser 'agendada'");
    assert.strictEqual(aulaSalva.presencas_aulas.length, 1, "Presença deve ter sido inicializada para o aluno");
    console.log("-> [SUCESSO] Aula de reposição persistida com tipo='reposicao' e chamada inicializada!");

    // 4. Teste B: Agendar Recorrência de 2 Dias por Semana (Quinta 10:30 e Sexta 08:50) por 4 semanas = 8 Aulas
    console.log("\n4. Teste B: Agendando 2 dias por semana (Quinta 10:30 e Sexta 08:50) x 4 semanas = 8 aulas...");
    const dataInicio = "2026-12-03"; // Uma quinta-feira
    const diasConfig = [
      { diaSemana: 4, horario: "10:30", nome: "Quinta" },
      { diaSemana: 5, horario: "08:50", nome: "Sexta" },
    ];
    const semanas = 4;

    const listaAulas = [];
    for (const d of diasConfig) {
      const firstDate = getNextDayOfWeekDate(dataInicio, d.diaSemana);
      for (let w = 0; w < semanas; w++) {
        const classDate = addWeeksToDate(firstDate, w);
        listaAulas.push({
          data: classDate,
          horario: d.horario,
          diaNome: d.nome,
        });
      }
    }
    listaAulas.sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario));
    assert.strictEqual(listaAulas.length, 8, "Devem ser calculadas exatamente 8 aulas");
    console.log("-> 8 datas calculadas:", listaAulas.map(a => `${a.diaNome} ${a.data} ${a.horario}`).join(", "));

    // Montar payload para RPC agendar_multiplas_aulas
    const payload = listaAulas.map((item, idx) => {
      const [h, m] = item.horario.split(":").map(Number);
      const startD = new Date(`${item.data}T${item.horario}:00.000Z`);
      const endD = new Date(startD.getTime() + 60 * 60 * 1000); // 60 min

      return {
        turma_id: turmaId,
        professor_id: profId,
        titulo: `Inglês Conversação (${idx + 1}/${listaAulas.length})`,
        inicio_em: startD.toISOString(),
        fim_em: endD.toISOString(),
        meeting_url: "https://zoom.us/j/123456789",
        observacoes: "Material impresso apostila 2",
        tipo: "regular",
      };
    });

    const { data: generatedIds, error: multErr } = await adminUserClient.rpc("agendar_multiplas_aulas", {
      p_aulas: payload,
    });
    if (multErr) throw multErr;

    console.log("-> RPC agendar_multiplas_aulas executada com sucesso! Retornou:", generatedIds);
    assert(Array.isArray(generatedIds) && generatedIds.length === 8, "Deve retornar 8 IDs de aulas");
    createdAulaIds.push(...generatedIds);

    // 5. Verificar integridade das 8 aulas no banco
    console.log("\n5. Verificando as 8 aulas salvas no banco de dados...");
    const { data: aulasCriadas, error: listErr } = await adminServiceClient
      .from("aulas")
      .select("id, titulo, inicio_em, fim_em, status, tipo, presencas_aulas(*)")
      .in("id", generatedIds)
      .order("inicio_em", { ascending: true });
    if (listErr) throw listErr;

    assert.strictEqual(aulasCriadas.length, 8, "Devem existir 8 aulas criadas no banco");
    for (let i = 0; i < 8; i++) {
      const a = aulasCriadas[i];
      assert.strictEqual(a.status, "agendada");
      assert.strictEqual(a.tipo, "regular");
      assert.strictEqual(a.presencas_aulas.length, 1, `Aula #${i + 1} deve ter chamada inicializada para o aluno`);
      assert(a.titulo.includes(`(${i + 1}/8)`), `Título deve conter contador (${i + 1}/8)`);
    }
    console.log("-> [SUCESSO] Todas as 8 aulas foram persistidas com ordem, contador e presenças corretas!");

    // 6. Teste C: Verificação de detecção de conflitos
    console.log("\n6. Teste C: Validando que conflitos de horário são bloqueados...");
    const conflitoPayload = [
      {
        turma_id: turmaId,
        professor_id: profId,
        titulo: "Aula Conflitante",
        inicio_em: payload[0].inicio_em, // mesmo horário de uma aula já existente!
        fim_em: payload[0].fim_em,
        meeting_url: null,
        observacoes: null,
        tipo: "regular",
      },
    ];

    const { error: confErr } = await adminUserClient.rpc("agendar_multiplas_aulas", {
      p_aulas: conflitoPayload,
    });

    assert(confErr !== null, "Deve falhar por conflito de horário");
    console.log("-> [SUCESSO] Conflito bloqueado com erro esperado:", confErr.message);

    console.log("\n==================================================================");
    console.log("TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!");
    console.log("==================================================================");
  } finally {
    // 7. Cleanup
    console.log("\nLimpando registros efêmeros de teste...");
    if (createdAulaIds.length > 0) {
      await adminServiceClient.from("presencas_aulas").delete().in("aula_id", createdAulaIds);
      await adminServiceClient.from("aulas").delete().in("id", createdAulaIds);
    }
    if (turmaId) {
      await adminServiceClient.from("matriculas_turmas").delete().eq("turma_id", turmaId);
      await adminServiceClient.from("turmas").delete().eq("id", turmaId);
    }
    if (alunoId) {
      await adminServiceClient.from("alunos").delete().eq("id", alunoId);
    }
    if (profId) {
      await adminServiceClient.from("professores").delete().eq("id", profId);
    }
    console.log("-> Limpeza concluída.");
  }
}

run().catch((err) => {
  console.error("ERRO NO TESTE:", err);
  process.exit(1);
});
