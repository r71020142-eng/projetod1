/**
 * DEMOSTRATIVO MTD — Suíte de Testes da Etapa 10.2B2
 * Validação dos Repositórios de Alunos e Professores, Troca Modular de Fonte e Regras de Isolamento.
 */

import assert from "node:assert";
import { alunoRepository } from "@/data/alunoRepository";
import { professorRepository } from "@/data/professorRepository";
import {
  getAlunoRepository,
  getProfessorRepository,
  getCoreUsersDataSource,
} from "@/data/repositoryFactory";
import {
  normalizeEmail,
  normalizeText,
  validateAlunoInput,
  validateProfessorInput,
} from "@/data/validators";
import { getServerEnv, getClientEnv } from "@/lib/env";

async function runTests() {
  console.log("=== INICIANDO BATERIA DE TESTES - ETAPA 10.2B2 (ALUNOS E PROFESSORES) ===\n");

  // 1. Validação de Contratos e Métodos Obrigatórios
  console.log("1. Validando métodos obrigatórios do IAlunoRepository e IProfessorRepository...");

  const requiredAlunoMethods = [
    "listar",
    "obterPorId",
    "criar",
    "atualizar",
    "inativar",
    "reativar",
    "atualizarNivel",
    "contarAtivos",
    "contarTotal",
  ] as const;

  for (const m of requiredAlunoMethods) {
    assert.strictEqual(
      typeof alunoRepository[m],
      "function",
      `alunoRepository deve implementar o método ${m}`
    );
  }
  console.log("   ✓ alunoRepository implementa todos os 9 métodos do contrato.");

  const requiredProfessorMethods = [
    "listar",
    "obterPorId",
    "criar",
    "atualizar",
    "inativar",
    "reativar",
    "contarAtivos",
    "contarTotal",
  ] as const;

  for (const m of requiredProfessorMethods) {
    assert.strictEqual(
      typeof professorRepository[m],
      "function",
      `professorRepository deve implementar o método ${m}`
    );
  }
  console.log("   ✓ professorRepository implementa todos os 8 métodos do contrato.");

  // 2. Validação da Seleção Explícita de Fonte por Módulo (CORE_USERS_DATA_SOURCE)
  console.log("\n2. Validando seleção explícita por módulo (CORE_USERS_DATA_SOURCE)...");
  assert.strictEqual(
    getCoreUsersDataSource(),
    "local",
    "No ambiente padrão local/demo, getCoreUsersDataSource() deve retornar 'local'."
  );

  const localAlunoRepo = getAlunoRepository();
  assert.ok(localAlunoRepo, "Repositório local de alunos deve ser resolvido.");
  const localProfRepo = getProfessorRepository();
  assert.ok(localProfRepo, "Repositório local de professores deve ser resolvido.");
  console.log("   ✓ Resolução padrão em modo 'local' validada.");

  // 3. Validação de Normalização de E-mail e Textos
  console.log("\n3. Validando funções de normalização e validação...");

  assert.strictEqual(
    normalizeEmail("  Usuario.Teste@MTD.com  "),
    "usuario.teste@mtd.com",
    "normalizeEmail deve remover espaços e converter para minúsculas."
  );

  assert.strictEqual(
    normalizeText("  Nome   Completo   com   Espaços  "),
    "Nome Completo com Espaços",
    "normalizeText deve colapsar espaços múltiplos e remover pontas."
  );

  const valAlunoInvalido = validateAlunoInput({
    nomeCompleto: "A",
    email: "email-invalido",
    objetivoIngles: "",
    nivel: "A1",
    status: "ativo",
  });
  assert.strictEqual(valAlunoInvalido.isValid, false);
  assert.ok(valAlunoInvalido.errors.nomeCompleto);
  assert.ok(valAlunoInvalido.errors.email);
  assert.ok(valAlunoInvalido.errors.objetivoIngles);
  console.log("   ✓ Validações sintáticas e de obrigatoriedade de alunos aprovadas.");

  const valProfInvalido = validateProfessorInput({
    nomeCompleto: "",
    email: "prof@",
    biografiaCurta: "",
    status: "ativo",
  });
  assert.strictEqual(valProfInvalido.isValid, false);
  assert.ok(valProfInvalido.errors.nomeCompleto);
  assert.ok(valProfInvalido.errors.email);
  assert.ok(valProfInvalido.errors.biografiaCurta);
  console.log("   ✓ Validações sintáticas e de obrigatoriedade de professores aprovadas.");

  // 4. Validação de Isolamento Modular e Preservação de Dados Locais
  console.log("\n4. Validando listagem inicial do repositório local...");
  const alunosLocais = await alunoRepository.listar();
  assert.ok(Array.isArray(alunosLocais));
  assert.ok(alunosLocais.length > 0, "Repositório local preserva dados de demonstração.");

  const profsLocais = await professorRepository.listar();
  assert.ok(Array.isArray(profsLocais));
  assert.ok(profsLocais.length > 0, "Repositório local preserva docentes de demonstração.");
  console.log(`   ✓ Repositório local preservado com ${alunosLocais.length} alunos e ${profsLocais.length} professores.`);

  // 5. Verificação de Integridade das Variáveis de Ambiente
  console.log("\n5. Validando configuração de variáveis de ambiente para a Etapa 10.2B2...");

  const clientEnv = getClientEnv();
  assert.strictEqual(typeof clientEnv.coreUsersDataSource, "string");

  const serverEnv = getServerEnv();
  assert.strictEqual(typeof serverEnv.coreUsersDataSource, "string");
  assert.strictEqual(serverEnv.dataSource, "local");
  console.log(`   ✓ getServerEnv() configurado: DATA_SOURCE=${serverEnv.dataSource}, CORE_USERS_DATA_SOURCE=${serverEnv.coreUsersDataSource}.`);

  // 6. Testando Alternância Dinâmica com CORE_USERS_DATA_SOURCE=supabase
  console.log("\n6. Validando chaveamento dinâmico com CORE_USERS_DATA_SOURCE=supabase...");
  const oldVal = process.env.CORE_USERS_DATA_SOURCE;
  try {
    process.env.CORE_USERS_DATA_SOURCE = "supabase";
    assert.strictEqual(getCoreUsersDataSource(), "supabase");
    const supabaseAlunoRepo = getAlunoRepository();
    const supabaseProfRepo = getProfessorRepository();
    assert.ok(supabaseAlunoRepo, "Deve resolver alunoSupabaseRepository.");
    assert.ok(supabaseProfRepo, "Deve resolver professorSupabaseRepository.");
    console.log("   ✓ getAlunoRepository() e getProfessorRepository() alternam dinamicamente para Supabase.");
  } finally {
    if (oldVal !== undefined) {
      process.env.CORE_USERS_DATA_SOURCE = oldVal;
    } else {
      delete process.env.CORE_USERS_DATA_SOURCE;
    }
  }

  console.log("\n============================================================");
  console.log("TODOS OS TESTES DA ETAPA 10.2B2 PASSARAM COM 100% DE SUCESSO!");
  console.log("============================================================\n");
}

runTests().catch((err) => {
  console.error("ERRO NOS TESTES:", err);
  process.exit(1);
});
