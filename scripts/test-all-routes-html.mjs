const routes = [
  "/aluno",
  "/aluno/aulas",
  "/aluno/materiais",
  "/aluno/materiais/mat-001",
  "/aluno/avaliacoes",
  "/aluno/avaliacoes/aval-001",
  "/aluno/self-presentation",
  "/aluno/self-presentation/sp-001",
  "/aluno/flashcards",
  "/aluno/flashcards/baralho-001",
  "/aluno/flashcards/baralho-001/estudar",
  "/aluno/comunidade",
  "/aluno/comunidade/topico-001",
  "/aluno/conquistas",
  "/aluno/conquistas/cnq-001",
  "/aluno/perfil",
  "/aluno/jornada",
  "/aluno/atividades",
];

async function check() {
  console.log("Checking all routes on http://localhost:3000 ...");
  for (const r of routes) {
    try {
      const res = await fetch("http://localhost:3000" + r);
      const text = await res.text();
      const hasCarregando = text.includes("Carregando") || text.includes("carregando");
      const hasError = text.includes("Internal Server Error") || text.includes("Application error");
      console.log(`Route: ${r.padEnd(40)} | Status: ${res.status} | Has "Carregando": ${hasCarregando} | Has Error: ${hasError} | HTML Length: ${text.length}`);
    } catch (e) {
      console.error(`Route: ${r.padEnd(40)} | FAILED TO FETCH: ${e.message}`);
    }
  }
}

check();
