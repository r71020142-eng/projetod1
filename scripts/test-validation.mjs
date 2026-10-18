import assert from "node:assert/strict";

// Replicate or import the pure functions
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function normalizeText(text) {
  return text.trim().replace(/\s+/g, " ");
}

function validateAlunoInput(input, currentId, existingList = []) {
  const errors = {};

  const nome = normalizeText(input.nomeCompleto || "");
  if (!nome) {
    errors.nomeCompleto = "O nome completo é obrigatório.";
  } else if (nome.length < 3) {
    errors.nomeCompleto = "O nome completo deve conter no mínimo 3 caracteres.";
  }

  const email = normalizeEmail(input.email || "");
  if (!email) {
    errors.email = "O e-mail é obrigatório.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Insira um endereço de e-mail válido (ex.: usuario@dominio.com).";
  } else {
    const isDuplicate = existingList.some(
      (a) => a.id !== currentId && normalizeEmail(a.email) === email
    );
    if (isDuplicate) {
      errors.email = "Este e-mail já está cadastrado para outro aluno.";
    }
  }

  const objetivo = normalizeText(input.objetivoIngles || "");
  if (!objetivo) {
    errors.objetivoIngles = "O objetivo com o inglês é obrigatório.";
  } else if (objetivo.length < 5) {
    errors.objetivoIngles = "Descreva o objetivo com pelo menos 5 caracteres.";
  }

  const validNiveis = ["nao_avaliado", "A1", "A2", "B1", "B2", "C1", "C2"];
  if (!input.nivel || !validNiveis.includes(input.nivel)) {
    errors.nivel = "Selecione um nível válido para o aluno.";
  }

  if (input.status !== "ativo" && input.status !== "inativo") {
    errors.status = "Selecione um status válido (ativo ou inativo).";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

function validateProfessorInput(input, currentId, existingList = []) {
  const errors = {};

  const nome = normalizeText(input.nomeCompleto || "");
  if (!nome) {
    errors.nomeCompleto = "O nome completo é obrigatório.";
  } else if (nome.length < 3) {
    errors.nomeCompleto = "O nome completo deve conter no mínimo 3 caracteres.";
  }

  const email = normalizeEmail(input.email || "");
  if (!email) {
    errors.email = "O e-mail é obrigatório.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Insira um endereço de e-mail válido (ex.: professor@mtd.com).";
  } else {
    const isDuplicate = existingList.some(
      (p) => p.id !== currentId && normalizeEmail(p.email) === email
    );
    if (isDuplicate) {
      errors.email = "Este e-mail já está cadastrado para outro professor.";
    }
  }

  const bio = normalizeText(input.biografiaCurta || "");
  if (!bio) {
    errors.biografiaCurta = "A biografia pedagógica curta é obrigatória.";
  } else if (bio.length < 10) {
    errors.biografiaCurta = "A biografia deve conter pelo menos 10 caracteres.";
  }

  const idiomas = (input.idiomasFalados || [])
    .map((i) => i.trim())
    .filter(Boolean);
  if (idiomas.length === 0) {
    errors.idiomasFalados = "Informe pelo menos um idioma falado pelo professor.";
  }

  if (input.status !== "ativo" && input.status !== "inativo") {
    errors.status = "Selecione um status válido (ativo ou inativo).";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ==========================================
// TEST SUITE
// ==========================================
console.log("=== INICIANDO SUÍTE DE TESTES UNITÁRIOS DA ETAPA 2 ===");

const existingAlunos = [
  { id: "alu-001", nomeCompleto: "Mariana Oliveira", email: "mariana.oliveira@email.com" },
  { id: "alu-002", nomeCompleto: "Pedro Santos", email: "pedro.santos@email.com" },
];

const existingProfessores = [
  { id: "prof-001", nomeCompleto: "Lucas Ferreira", email: "lucas.ferreira@email.com" },
];

// Test 1: Aluno válido
{
  const res = validateAlunoInput(
    {
      nomeCompleto: "  Carlos Eduardo  ",
      email: "  carlos.edu@email.com  ",
      objetivoIngles: "Fluência em reuniões internacionais",
      nivel: "nao_avaliado",
      status: "ativo",
    },
    undefined,
    existingAlunos
  );
  assert.equal(res.isValid, true, "Aluno válido deve ser aceito");
  assert.equal(Object.keys(res.errors).length, 0);
  console.log("✔ Teste 1: Aluno válido aceito com sucesso");
}

// Test 2: Bloqueio de e-mail duplicado de aluno (case-insensitive & trim)
{
  const res = validateAlunoInput(
    {
      nomeCompleto: "Outro Aluno",
      email: "  MARIANA.OLIVEIRA@EMAIL.COM  ",
      objetivoIngles: "Aprender inglês",
      nivel: "A1",
      status: "ativo",
    },
    undefined,
    existingAlunos
  );
  assert.equal(res.isValid, false, "E-mail duplicado de aluno deve ser rejeitado");
  assert.equal(res.errors.email, "Este e-mail já está cadastrado para outro aluno.");
  console.log("✔ Teste 2: E-mail duplicado de aluno bloqueado com sucesso");
}

// Test 3: Edição permitindo manter o próprio e-mail
{
  const res = validateAlunoInput(
    {
      nomeCompleto: "Mariana Oliveira da Silva",
      email: "mariana.oliveira@email.com",
      objetivoIngles: "Novo objetivo atualizado",
      nivel: "B1",
      status: "ativo",
    },
    "alu-001", // mesmo ID
    existingAlunos
  );
  assert.equal(res.isValid, true, "Edição mantendo o próprio e-mail deve ser válida");
  console.log("✔ Teste 3: Edição de aluno mantendo o próprio e-mail permitida");
}

// Test 4: Bloqueio de campos vazios ou inválidos de aluno
{
  const res = validateAlunoInput(
    {
      nomeCompleto: "  ",
      email: "email-invalido",
      objetivoIngles: "oi",
      nivel: "invalido",
      status: "outro",
    },
    undefined,
    existingAlunos
  );
  assert.equal(res.isValid, false);
  assert.ok(res.errors.nomeCompleto);
  assert.ok(res.errors.email);
  assert.ok(res.errors.objetivoIngles);
  assert.ok(res.errors.nivel);
  assert.ok(res.errors.status);
  console.log("✔ Teste 4: Validação de campos obrigatórios de aluno aprovada");
}

// Test 5: Professor válido
{
  const res = validateProfessorInput(
    {
      nomeCompleto: "Roberto Justos",
      email: "roberto@mtd.com",
      biografiaCurta: "Professor experiente com mais de 10 anos de ensino.",
      idiomasFalados: ["Inglês (Fluente)", "Português (Nativo)"],
      status: "ativo",
    },
    undefined,
    existingProfessores
  );
  assert.equal(res.isValid, true, "Professor válido deve ser aceito");
  console.log("✔ Teste 5: Professor válido cadastrado com sucesso");
}

// Test 6: Bloqueio de e-mail duplicado de professor
{
  const res = validateProfessorInput(
    {
      nomeCompleto: "Novo Instrutor",
      email: "LUCAS.FERREIRA@EMAIL.COM",
      biografiaCurta: "Biografia pedagógica com mais de 10 caracteres.",
      idiomasFalados: ["Inglês (Nativo)"],
      status: "ativo",
    },
    undefined,
    existingProfessores
  );
  assert.equal(res.isValid, false, "E-mail duplicado de professor deve ser rejeitado");
  assert.equal(res.errors.email, "Este e-mail já está cadastrado para outro professor.");
  console.log("✔ Teste 6: E-mail duplicado de professor bloqueado com sucesso");
}

// Test 7: Professor sem idiomas
{
  const res = validateProfessorInput(
    {
      nomeCompleto: "Ana Paula",
      email: "ana@mtd.com",
      biografiaCurta: "Professora de conversação e pronúncia.",
      idiomasFalados: [],
      status: "ativo",
    },
    undefined,
    existingProfessores
  );
  assert.equal(res.isValid, false);
  assert.ok(res.errors.idiomasFalados);
  console.log("✔ Teste 7: Professor sem idiomas rejeitado com sucesso");
}

console.log("\n=== TODOS OS 7 TESTES UNITÁRIOS FORAM EXECUTADOS E APROVADOS! ===");
