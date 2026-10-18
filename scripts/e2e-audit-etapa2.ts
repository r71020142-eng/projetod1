import fs from "fs";
import path from "path";
import { alunoRepository } from "../src/data/alunoRepository";
import { professorRepository } from "../src/data/professorRepository";
import { SEED_ALUNOS, SEED_PROFESSORES } from "../src/data/mockData";
import { validateAlunoInput, validateProfessorInput } from "../src/data/validators";
import { NivelAluno, StatusCadastro } from "../src/types";

interface TestResult {
  suite: string;
  testName: string;
  passed: boolean;
  evidence: string;
  error?: string;
}

const results: TestResult[] = [];

function recordTest(suite: string, testName: string, passed: boolean, evidence: string, error?: string) {
  results.push({ suite, testName, passed, evidence, error });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} [${suite}] ${testName} - ${evidence}`);
  if (error) console.error(`   Error details: ${error}`);
}

async function runAudit() {
  console.log("================================================================================");
  console.log("🔍 INICIANDO AUDITORIA E2E E QUALIDADE - ETAPA 2 (DEMOSTRATIVO MTD)");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // 1. ROTAS HTTP
  // ---------------------------------------------------------------------------
  const routesToTest = [
    { url: "http://localhost:3000/admin/alunos", label: "Admin Alunos (Listagem)" },
    { url: "http://localhost:3000/admin/alunos/alu-001", label: "Admin Alunos Detalhes (alu-001)" },
    { url: "http://localhost:3000/admin/professores", label: "Admin Professores (Listagem)" },
    { url: "http://localhost:3000/admin/professores/prof-001", label: "Admin Professores Detalhes (prof-001)" },
    { url: "http://localhost:3000/admin", label: "Admin Dashboard" },
    { url: "http://localhost:3000/aluno", label: "Visão do Aluno" },
  ];

  for (const route of routesToTest) {
    try {
      const resp = await fetch(route.url);
      const passed = resp.status === 200;
      recordTest(
        "1. Rotas HTTP 200",
        route.label,
        passed,
        `Status retornado: HTTP ${resp.status} ${resp.statusText}`
      );
    } catch (err: any) {
      recordTest("1. Rotas HTTP 200", route.label, false, "Falha na conexão", err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. AJUSTES DA ETAPA 1
  // ---------------------------------------------------------------------------
  const srcDir = path.resolve(process.cwd(), "src");
  function scanDirForText(dir: string, text: string): string[] {
    const matches: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        matches.push(...scanDirForText(fullPath, text));
      } else if (entry.isFile() && /\.(tsx?|jsx?|json|css)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.toLowerCase().includes(text.toLowerCase())) {
          matches.push(fullPath);
        }
      }
    }
    return matches;
  }

  // 2.1 Frase "15 minutos antes" removida
  const ocorrencias15min = scanDirForText(srcDir, "15 minutos");
  recordTest(
    "2. Ajustes Etapa 1",
    "Remoção da frase '15 minutos antes' no src",
    ocorrencias15min.length === 0,
    ocorrencias15min.length === 0
      ? "Nenhuma ocorrência encontrada em nenhum arquivo de src"
      : `Ocorrências encontradas em: ${ocorrencias15min.join(", ")}`
  );

  // 2.2 Status "Link da aula ainda não disponibilizado" presente
  const alunoHtml = await (await fetch("http://localhost:3000/aluno")).text();
  const temNoticeLink = alunoHtml.includes("Link da aula ainda não disponibilizado");
  recordTest(
    "2. Ajustes Etapa 1",
    "Presença do status 'Link da aula ainda não disponibilizado' na tela do Aluno",
    temNoticeLink,
    temNoticeLink
      ? "Texto confirmado no HTML renderizado de http://localhost:3000/aluno"
      : "Texto não localizado no HTML renderizado"
  );

  // 2.3 Substituição de "Professores certificados" por "Professores"
  const ocorrenciasProfCert = scanDirForText(srcDir, "Professores certificados");
  recordTest(
    "2. Ajustes Etapa 1",
    "Remoção do termo 'Professores certificados'",
    ocorrenciasProfCert.length === 0,
    ocorrenciasProfCert.length === 0
      ? "Nenhuma ocorrência de 'Professores certificados' no projeto"
      : `Encontrado em: ${ocorrenciasProfCert.join(", ")}`
  );

  const adminHtml = await (await fetch("http://localhost:3000/admin")).text();
  const professoresHtml = await (await fetch("http://localhost:3000/admin/professores")).text();
  const temProfessoresAdmin = adminHtml.includes("Professores");
  const temProfessoresListagem = professoresHtml.includes("Professores");
  recordTest(
    "2. Ajustes Etapa 1",
    "Termo 'Professores' presente no Dashboard (/admin) e na Listagem (/admin/professores)",
    temProfessoresAdmin && temProfessoresListagem,
    `Admin: ${temProfessoresAdmin ? "OK" : "Ausente"} | Professores: ${temProfessoresListagem ? "OK" : "Ausente"}`
  );

  // ---------------------------------------------------------------------------
  // 3. CADASTRO DE ALUNOS (/admin/alunos e /admin/alunos/alu-001)
  // ---------------------------------------------------------------------------
  const alunoAlu001 = SEED_ALUNOS.find((a) => a.id === "alu-001");
  const camposObrigatoriosAluno = [
    "id",
    "nomeCompleto",
    "email",
    "telefone",
    "objetivoIngles",
    "nivel",
    "status",
    "dataCadastro",
    "observacoesPedagogicas",
  ];
  const camposPresentesAlu001 = camposObrigatoriosAluno.every(
    (campo) => (alunoAlu001 as any)[campo] !== undefined
  );

  recordTest(
    "3. Cadastro de Alunos",
    "Presença de todos os campos estruturais no modelo de Alunos",
    camposPresentesAlu001,
    `Campos validados em alu-001: ${camposObrigatoriosAluno.join(", ")}`
  );

  // Testar niveis permitidos e padrão nao_avaliado
  const niveisEsperados: NivelAluno[] = ["nao_avaliado", "A1", "A2", "B1", "B2", "C1", "C2"];
  let todosNiveisValidos = true;
  for (const niv of niveisEsperados) {
    const val = validateAlunoInput({
      nomeCompleto: "Teste Nivel",
      email: "teste@mtd.com",
      objetivoIngles: "Fluencia em ingles para trabalho",
      nivel: niv,
      status: "ativo",
    });
    if (!val.isValid || val.errors.nivel) {
      todosNiveisValidos = false;
      break;
    }
  }

  // Nivel invalido deve falhar
  const nivelInvalido = validateAlunoInput({
    nomeCompleto: "Teste Invalido",
    email: "teste@mtd.com",
    objetivoIngles: "Fluencia em ingles",
    nivel: "D1" as any,
    status: "ativo",
  });

  recordTest(
    "3. Cadastro de Alunos",
    "Validação de níveis: padrão 'nao_avaliado' e escala A1 a C2",
    todosNiveisValidos && !nivelInvalido.isValid && !!nivelInvalido.errors.nivel,
    "Todos os níveis CEFR + nao_avaliado validados com sucesso; nível incorreto devidamente rejeitado."
  );

  // Teste de criação e regras de repositório de alunos
  const resCriacaoAluno = await alunoRepository.criar({
    nomeCompleto: "Aluno Auditoria E2E",
    email: "auditor.aluno@mtd.com",
    telefone: "(11) 99999-8888",
    objetivoIngles: "Validar integridade E2E do sistema",
    nivel: "nao_avaliado",
    status: "ativo",
    observacoesPedagogicas: "Observação de teste automatizado",
  });

  recordTest(
    "3. Cadastro de Alunos",
    "Criação de aluno via alunoRepository com nível padrão",
    resCriacaoAluno.success && !!resCriacaoAluno.data && resCriacaoAluno.data.nivel === "nao_avaliado",
    resCriacaoAluno.success
      ? `Aluno criado com ID: ${resCriacaoAluno.data?.id}, nível: ${resCriacaoAluno.data?.nivel}`
      : `Falha: ${resCriacaoAluno.error}`
  );

  // Teste de duplicidade de email
  const resEmailDuplicado = await alunoRepository.criar({
    nomeCompleto: "Aluno Duplicado",
    email: "mariana.oliveira@email.com", // ja existente no seed
    objetivoIngles: "Objetivo teste",
    nivel: "A1",
    status: "ativo",
  });
  recordTest(
    "3. Cadastro de Alunos",
    "Bloqueio de duplicidade de e-mail de aluno",
    !resEmailDuplicado.success && !!resEmailDuplicado.fieldErrors?.email,
    `Mensagem capturada: "${resEmailDuplicado.fieldErrors?.email || resEmailDuplicado.error}"`
  );

  // Inativação e Reativação
  if (resCriacaoAluno.data) {
    const resInat = await alunoRepository.inativar(resCriacaoAluno.data.id);
    const inativou = resInat.success && resInat.data?.status === "inativo";
    const resReat = await alunoRepository.reativar(resCriacaoAluno.data.id);
    const reativou = resReat.success && resReat.data?.status === "ativo";

    recordTest(
      "3. Cadastro de Alunos",
      "Ciclo de vida de matrícula (Inativação e Reativação)",
      inativou && reativou,
      `Inativação: ${inativou ? "OK (status: inativo)" : "Falhou"} | Reativação: ${reativou ? "OK (status: ativo)" : "Falhou"}`
    );
  }

  // Verificação na página de detalhes e formulários do Aluno
  const alunoDetalheFile = fs.readFileSync(
    path.resolve(srcDir, "app/admin/alunos/[id]/page.tsx"),
    "utf-8"
  );
  const alunoModalFile = fs.readFileSync(
    path.resolve(srcDir, "components/admin/AlunoFormModal.tsx"),
    "utf-8"
  );

  // Alertas de módulos futuros na página de detalhes
  const temAlertaTurmas = alunoDetalheFile.includes("Turma ainda não atribuída") && alunoDetalheFile.includes("Turma e Horários");
  const temAlertaFreq = alunoDetalheFile.includes("Histórico de frequência indisponível") && alunoDetalheFile.includes("Aulas e Presença");
  const temAlertaAval = alunoDetalheFile.includes("Fila de avaliações em desenvolvimento") && alunoDetalheFile.includes("Self Presentations");

  recordTest(
    "3. Cadastro de Alunos",
    "Alertas de módulos futuros na página de detalhes (/admin/alunos/alu-001)",
    temAlertaTurmas && temAlertaFreq && temAlertaAval,
    `Turmas: ${temAlertaTurmas ? "Presente" : "Ausente"} | Frequência: ${temAlertaFreq ? "Presente" : "Ausente"} | Avaliações/Self Presentation: ${temAlertaAval ? "Presente" : "Ausente"}`
  );

  // Aviso explicito CEFR
  const avisoCefrDetalhes = alunoDetalheFile.includes("não substitui nem representa emissão de certificado formal CEFR") || alunoDetalheFile.includes("não representa emissão de certificado formal CEFR");
  const avisoCefrModal = alunoModalFile.includes("não representa emissão de certificado formal CEFR");

  recordTest(
    "3. Cadastro de Alunos",
    "Aviso explícito de que nível não representa emissão de certificado formal CEFR",
    avisoCefrDetalhes && avisoCefrModal,
    `Presente na página de detalhes: ${avisoCefrDetalhes ? "SIM" : "NÃO"} | Presente no modal de cadastro: ${avisoCefrModal ? "SIM" : "NÃO"}`
  );

  // ---------------------------------------------------------------------------
  // 4. CADASTRO DE PROFESSORES (/admin/professores e /admin/professores/prof-001)
  // ---------------------------------------------------------------------------
  const profProf001 = SEED_PROFESSORES.find((p) => p.id === "prof-001");
  const camposObrigatoriosProfessor = [
    "id",
    "nomeCompleto",
    "email",
    "telefone",
    "biografiaCurta",
    "idiomasFalados",
    "status",
    "dataCadastro",
  ];
  const camposPresentesProf001 = camposObrigatoriosProfessor.every(
    (campo) => (profProf001 as any)[campo] !== undefined
  );

  recordTest(
    "4. Cadastro de Professores",
    "Presença de todos os campos estruturais no modelo de Professores",
    camposPresentesProf001,
    `Campos validados em prof-001: ${camposObrigatoriosProfessor.join(", ")}`
  );

  // Teste de criação e regras de repositório de professores
  const resCriacaoProf = await professorRepository.criar({
    nomeCompleto: "Professor Auditoria E2E",
    email: "auditor.professor@mtd.com",
    telefone: "(11) 98888-7777",
    biografiaCurta: "Biografia pedagógica de validação E2E com experiência comprovada no Método Paulo.",
    idiomasFalados: ["Inglês (Fluente)", "Português (Nativo)"],
    status: "ativo",
  });

  recordTest(
    "4. Cadastro de Professores",
    "Criação de professor via professorRepository",
    resCriacaoProf.success && !!resCriacaoProf.data,
    resCriacaoProf.success
      ? `Professor criado com ID: ${resCriacaoProf.data?.id}, idiomas: ${resCriacaoProf.data?.idiomasFalados.join(", ")}`
      : `Falha: ${resCriacaoProf.error}`
  );

  // Teste de duplicidade de email professor
  const resEmailDuplicadoProf = await professorRepository.criar({
    nomeCompleto: "Professor Duplicado",
    email: "lucas.ferreira@email.com", // ja existente no seed
    biografiaCurta: "Bio de teste",
    idiomasFalados: ["Inglês (Fluente)"],
    status: "ativo",
  });
  recordTest(
    "4. Cadastro de Professores",
    "Bloqueio de duplicidade de e-mail de professor",
    !resEmailDuplicadoProf.success && !!resEmailDuplicadoProf.fieldErrors?.email,
    `Mensagem capturada: "${resEmailDuplicadoProf.fieldErrors?.email || resEmailDuplicadoProf.error}"`
  );

  // Inativação e Reativação de Professor
  if (resCriacaoProf.data) {
    const resInat = await professorRepository.inativar(resCriacaoProf.data.id);
    const inativou = resInat.success && resInat.data?.status === "inativo";
    const resReat = await professorRepository.reativar(resCriacaoProf.data.id);
    const reativou = resReat.success && resReat.data?.status === "ativo";

    recordTest(
      "4. Cadastro de Professores",
      "Ciclo de disponibilidade do Professor (Inativação e Reativação)",
      inativou && reativou,
      `Inativação: ${inativou ? "OK (status: inativo)" : "Falhou"} | Reativação: ${reativou ? "OK (status: ativo)" : "Falhou"}`
    );
  }

  // Verificação de Aviso sobre Conta de Acesso e Autenticação
  const profDetalheFile = fs.readFileSync(
    path.resolve(srcDir, "app/admin/professores/[id]/page.tsx"),
    "utf-8"
  );
  const profModalFile = fs.readFileSync(
    path.resolve(srcDir, "components/admin/ProfessorFormModal.tsx"),
    "utf-8"
  );
  const profListPageFile = fs.readFileSync(
    path.resolve(srcDir, "app/admin/professores/page.tsx"),
    "utf-8"
  );

  const avisoAuthDetalhes = profDetalheFile.includes("não cria automaticamente uma conta de acesso ao sistema");
  const avisoAuthModal = profModalFile.includes("não cria automaticamente uma conta de acesso ao sistema");
  const avisoAuthListagem = profListPageFile.includes("não cria automaticamente uma conta de acesso ao sistema");

  recordTest(
    "4. Cadastro de Professores",
    "Aviso explícito de que cadastro não cria automaticamente conta de acesso",
    avisoAuthDetalhes && avisoAuthModal && avisoAuthListagem,
    `Detalhes: ${avisoAuthDetalhes ? "SIM" : "NÃO"} | Modal: ${avisoAuthModal ? "SIM" : "NÃO"} | Listagem: ${avisoAuthListagem ? "SIM" : "NÃO"}`
  );

  // Verificação de módulos futuros do Professor
  const temAlertaTurmasProf = profDetalheFile.includes("Turmas Atribuídas") && profDetalheFile.includes("Nenhuma turma alocada");
  const temAlertaCorrecaoProf = profDetalheFile.includes("Fila de Correções") && profDetalheFile.includes("Módulo em desenvolvimento");

  recordTest(
    "4. Cadastro de Professores",
    "Alertas de módulos futuros na página de detalhes (/admin/professores/prof-001)",
    temAlertaTurmasProf && temAlertaCorrecaoProf,
    `Turmas Atribuídas: ${temAlertaTurmasProf ? "Presente" : "Ausente"} | Fila de Correções: ${temAlertaCorrecaoProf ? "Presente" : "Ausente"}`
  );

  // ---------------------------------------------------------------------------
  // RESUMO E STATUS GERAL
  // ---------------------------------------------------------------------------
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log("\n================================================================================");
  console.log(`📊 RESUMO DA AUDITORIA: ${passed}/${total} TESTES PASSARAM (${failed} falhas)`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error("Erro fatal na auditoria:", err);
  process.exit(1);
});
