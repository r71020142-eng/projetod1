/**
 * Testes Unitários e de Integração — P0-1: Ativar Agenda e Presenças no Supabase
 *
 * Valida:
 * 1. Resolução quando configuração específica está ausente e fonte principal é 'supabase' (herança)
 * 2. Seleção explícita de 'local' (override)
 * 3. Seleção explícita de 'supabase'
 * 4. Modo demonstrativo padrão (nenhuma variável)
 * 5. Detecção estrita de divergência
 * 6. Resolução determinística de getAulaRepository() e getPresencaRepository()
 */

import assert from "assert";

function cleanEnv() {
  delete process.env.DATA_SOURCE;
  delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  delete process.env.ACADEMIC_AGENDA_DATA_SOURCE;
  delete process.env.NEXT_PUBLIC_ACADEMIC_AGENDA_DATA_SOURCE;
  delete process.env.CORE_USERS_DATA_SOURCE;
  delete process.env.NEXT_PUBLIC_CORE_USERS_DATA_SOURCE;
  delete process.env.ACADEMIC_CORE_DATA_SOURCE;
  delete process.env.NEXT_PUBLIC_ACADEMIC_CORE_DATA_SOURCE;
  delete process.env.AUTH_MODE;
  delete process.env.APP_MODE;
}

async function main() {
  console.log("==================================================================");
  console.log("TESTES OBRIGATÓRIOS P0-1 — RESOLUÇÃO DE FONTES DE DADOS DA AGENDA");
  console.log("==================================================================\n");

  const originalEnv = { ...process.env };
  let passed = 0;
  let total = 0;

  function runTest(name: string, fn: () => void) {
    total++;
    try {
      fn();
      console.log(`  ✓ [${total}] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ [${total}] FALHA: ${name}`);
      console.error(`     Detalhes: ${err.message}`);
      process.exitCode = 1;
    }
  }

  // Import dynamic to allow env changes
  const { getServerEnv, getClientEnv } = await import("../src/lib/env");
  const {
    getAcademicAgendaDataSource,
    getAulaRepository,
    getPresencaRepository,
    aulaSupabaseRepository,
    aulaLocalStorageRepository,
    presencaSupabaseRepository,
  } = await import("../src/data/repositoryFactory");

  // CASO 1: Herança da fonte principal (DATA_SOURCE=supabase, sem variáveis específicas de agenda)
  cleanEnv();
  process.env.APP_MODE = "demo";
  process.env.AUTH_MODE = "demo";
  process.env.DATA_SOURCE = "supabase";
  process.env.NEXT_PUBLIC_DATA_SOURCE = "supabase";

  runTest("1.1 Agenda herda 'supabase' quando configuração específica está ausente e DATA_SOURCE='supabase'", () => {
    const serverEnv = getServerEnv();
    assert.strictEqual(
      serverEnv.academicAgendaDataSource,
      "supabase",
      `serverEnv.academicAgendaDataSource deve ser 'supabase', obteve: ${serverEnv.academicAgendaDataSource}`
    );

    const clientEnv = getClientEnv();
    assert.strictEqual(
      clientEnv.academicAgendaDataSource,
      "supabase",
      `clientEnv.academicAgendaDataSource deve ser 'supabase', obteve: ${clientEnv.academicAgendaDataSource}`
    );

    const source = getAcademicAgendaDataSource();
    assert.strictEqual(source, "supabase", `getAcademicAgendaDataSource() deve retornar 'supabase', obteve: ${source}`);

    const aulaRepo = getAulaRepository();
    assert.strictEqual(
      aulaRepo,
      aulaSupabaseRepository,
      "getAulaRepository() deve resolver para aulaSupabaseRepository"
    );

    const presencaRepo = getPresencaRepository();
    assert.strictEqual(
      presencaRepo,
      presencaSupabaseRepository,
      "getPresencaRepository() deve resolver para presencaSupabaseRepository"
    );
  });

  // CASO 2: Seleção explícita de 'local' mesmo quando DATA_SOURCE='supabase'
  cleanEnv();
  process.env.APP_MODE = "demo";
  process.env.AUTH_MODE = "demo";
  process.env.DATA_SOURCE = "supabase";
  process.env.NEXT_PUBLIC_DATA_SOURCE = "supabase";
  process.env.ACADEMIC_AGENDA_DATA_SOURCE = "local";
  process.env.NEXT_PUBLIC_ACADEMIC_AGENDA_DATA_SOURCE = "local";

  runTest("2.1 Seleção explícita de 'local' sobrepõe DATA_SOURCE='supabase'", () => {
    const serverEnv = getServerEnv();
    assert.strictEqual(
      serverEnv.academicAgendaDataSource,
      "local",
      `serverEnv.academicAgendaDataSource deve ser 'local', obteve: ${serverEnv.academicAgendaDataSource}`
    );

    const clientEnv = getClientEnv();
    assert.strictEqual(
      clientEnv.academicAgendaDataSource,
      "local",
      `clientEnv.academicAgendaDataSource deve ser 'local', obteve: ${clientEnv.academicAgendaDataSource}`
    );

    const source = getAcademicAgendaDataSource();
    assert.strictEqual(source, "local", `getAcademicAgendaDataSource() deve retornar 'local', obteve: ${source}`);

    const aulaRepo = getAulaRepository();
    assert.strictEqual(
      aulaRepo,
      aulaLocalStorageRepository,
      "getAulaRepository() deve resolver para aulaLocalStorageRepository"
    );
  });

  // CASO 3: Seleção explícita de 'supabase' para a agenda
  cleanEnv();
  process.env.APP_MODE = "demo";
  process.env.AUTH_MODE = "demo";
  process.env.DATA_SOURCE = "local";
  process.env.ACADEMIC_AGENDA_DATA_SOURCE = "supabase";
  process.env.NEXT_PUBLIC_ACADEMIC_AGENDA_DATA_SOURCE = "supabase";

  runTest("3.1 Seleção explícita de 'supabase' ativa aulaSupabaseRepository mesmo se DATA_SOURCE='local'", () => {
    const serverEnv = getServerEnv();
    assert.strictEqual(
      serverEnv.academicAgendaDataSource,
      "supabase",
      `serverEnv.academicAgendaDataSource deve ser 'supabase', obteve: ${serverEnv.academicAgendaDataSource}`
    );

    const source = getAcademicAgendaDataSource();
    assert.strictEqual(source, "supabase", `getAcademicAgendaDataSource() deve retornar 'supabase', obteve: ${source}`);

    const aulaRepo = getAulaRepository();
    assert.strictEqual(
      aulaRepo,
      aulaSupabaseRepository,
      "getAulaRepository() deve resolver para aulaSupabaseRepository"
    );
  });

  // CASO 4: Modo demonstrativo puro padrão (sem variáveis de ambiente)
  cleanEnv();
  process.env.APP_MODE = "demo";
  process.env.AUTH_MODE = "demo";

  runTest("4.1 Modo demonstrativo padrão resolve para 'local' de forma limpa", () => {
    const serverEnv = getServerEnv();
    assert.strictEqual(
      serverEnv.academicAgendaDataSource,
      "local",
      `serverEnv.academicAgendaDataSource deve ser 'local', obteve: ${serverEnv.academicAgendaDataSource}`
    );

    const source = getAcademicAgendaDataSource();
    assert.strictEqual(source, "local", `getAcademicAgendaDataSource() deve retornar 'local', obteve: ${source}`);

    const aulaRepo = getAulaRepository();
    assert.strictEqual(
      aulaRepo,
      aulaLocalStorageRepository,
      "getAulaRepository() deve resolver para aulaLocalStorageRepository"
    );
  });

  // CASO 5: Validação estrita de divergência entre servidor e cliente
  cleanEnv();
  process.env.APP_MODE = "demo";
  process.env.AUTH_MODE = "demo";
  process.env.ACADEMIC_AGENDA_DATA_SOURCE = "supabase";
  process.env.NEXT_PUBLIC_ACADEMIC_AGENDA_DATA_SOURCE = "local";

  runTest("5.1 Divergência entre ACADEMIC_AGENDA_DATA_SOURCE e NEXT_PUBLIC_ACADEMIC_AGENDA_DATA_SOURCE lança erro", () => {
    assert.throws(
      () => getServerEnv(),
      /Divergência crítica detectada entre ACADEMIC_AGENDA_DATA_SOURCE/,
      "Deve lançar erro de divergência crítica"
    );
  });

  // Restaura ambiente original
  process.env = originalEnv;

  console.log("\n==================================================================");
  console.log(`TOTAL DE TESTES APROVADOS: ${passed}/${total}`);
  console.log("==================================================================");

  if (passed === total) {
    console.log("SUCESSO: Todos os testes de resolução de fontes de dados foram aprovados!");
  } else {
    console.error("FALHA: Um ou mais testes falharam.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
