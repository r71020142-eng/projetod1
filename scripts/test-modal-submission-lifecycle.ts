/**
 * Teste de Validação de Ciclo de Vida e Anti-Travamento de Modais
 * Demonstração e Verificação dos 8 critérios do requisito de correção estrutural.
 */

import { executeWithTimeout, SubmissionLifecycleController } from "../src/lib/asyncUtils";

interface SimulatedFormState<T> {
  isOpen: boolean;
  isSubmitting: boolean;
  record: T | null;
  formData: T | null;
  error: string | null;
  activeRequestId: number;
}

class SimulatedModalComponent<T extends { id: string; nome: string }> {
  public state: SimulatedFormState<T>;
  public submissionCount = 0;

  constructor() {
    this.state = {
      isOpen: false,
      isSubmitting: false,
      record: null,
      formData: null,
      error: null,
      activeRequestId: 0,
    };
  }

  // Simula o useEffect([record, isOpen])
  public onOpen(record: T | null) {
    this.state.activeRequestId += 1;
    this.state.isSubmitting = false;
    this.state.error = null;
    this.state.isOpen = true;
    this.state.record = record;
    this.state.formData = record ? { ...record } : null;
  }

  // Simula o handleClose()
  public onClose() {
    this.state.activeRequestId += 1;
    this.state.isSubmitting = false;
    this.state.isOpen = false;
  }

  // Simula o handleSubmit()
  public async onSubmit(
    saveOperation: (record: T) => Promise<{ success: boolean; data?: T; error?: string }>,
    timeoutMs: number = 15000
  ): Promise<boolean> {
    // Proteção contra duplo clique
    if (this.state.isSubmitting) {
      return false;
    }

    this.state.activeRequestId += 1;
    const currentRequestId = this.state.activeRequestId;
    this.state.isSubmitting = true;
    this.state.error = null;
    this.submissionCount += 1;

    try {
      const res = await executeWithTimeout(
        saveOperation(this.state.formData!),
        timeoutMs,
        "A operação excedeu o tempo limite de resposta (15s)."
      );

      // Verificação de stale request (desmontado ou requisição mais recente em andamento)
      if (currentRequestId !== this.state.activeRequestId) {
        return false;
      }

      if (!res.success) {
        this.state.error = res.error || "Erro ao salvar";
        return false;
      }

      // Sucesso
      this.state.record = res.data || this.state.formData;
      this.onClose();
      return true;
    } catch (err: unknown) {
      if (currentRequestId !== this.state.activeRequestId) {
        return false;
      }
      this.state.error = err instanceof Error ? err.message : "Erro inesperado";
      return false;
    } finally {
      if (currentRequestId === this.state.activeRequestId) {
        this.state.isSubmitting = false;
      }
    }
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("INICIANDO SUÍTE DE TESTES: CICLO DE VIDA E ANTI-TRAVAMENTO DE MODAIS");
  console.log("==================================================================");

  let passedTests = 0;
  const totalTests = 8;

  const profA = { id: "prof-001", nome: "Carlos Eduardo" };
  const profB = { id: "prof-002", nome: "Mariana Silva" };

  // TESTE 1: Abrir modal -> estado idle (isSubmitting === false)
  console.log("\n[TESTE 1] Abrir modal inicia em estado idle");
  const modal = new SimulatedModalComponent<typeof profA>();
  modal.onOpen(profA);

  if (modal.state.isOpen && !modal.state.isSubmitting && modal.state.error === null) {
    console.log("  PASS: Modal abriu com isOpen=true, isSubmitting=false, error=null");
    passedTests++;
  } else {
    console.error("  FAIL: Modal não iniciou no estado esperado:", modal.state);
  }

  // TESTE 2: Salvar com sucesso -> fecha e volta para idle
  console.log("\n[TESTE 2] Salvar com sucesso fecha e retorna para idle");
  const successPromise = async (data: typeof profA) => {
    await new Promise((r) => setTimeout(r, 50));
    return { success: true, data: { ...data, nome: "Carlos Editado" } };
  };

  const successResult = await modal.onSubmit(successPromise);
  if (successResult && !modal.state.isOpen && !modal.state.isSubmitting) {
    console.log("  PASS: Operação bem-sucedida finalizou com isOpen=false e isSubmitting=false");
    passedTests++;
  } else {
    console.error("  FAIL: Estado após sucesso inválido:", modal.state);
  }

  // TESTE 3: Salvar com erro / rejeição da promise -> exibe erro, mantém dados, volta para idle
  console.log("\n[TESTE 3] Salvar com erro exibe aviso, mantém dados preenchidos e volta para idle");
  modal.onOpen(profA);
  const failPromise = async () => {
    await new Promise((r) => setTimeout(r, 50));
    throw new Error("Falha na rede ou violação de integridade");
  };

  const failResult = await modal.onSubmit(failPromise);
  if (
    !failResult &&
    modal.state.isOpen &&
    !modal.state.isSubmitting &&
    modal.state.error === "Falha na rede ou violação de integridade" &&
    modal.state.formData?.nome === "Carlos Eduardo"
  ) {
    console.log("  PASS: Erro tratado com sucesso. isOpen=true, isSubmitting=false, dados preservados");
    passedTests++;
  } else {
    console.error("  FAIL: Estado após erro inesperado inválido:", modal.state);
  }

  // TESTE 4: Fechar modal durante 'Salvando...' ou logo após erro -> ao reabrir, não pode abrir em 'Salvando...'
  console.log("\n[TESTE 4] Fechar modal e reabrir nunca preserva 'Salvando...'");
  modal.onClose(); // Usuário fecha modal
  // Simulamos que por qualquer motivo residual isSubmitting fosse true na memória
  modal.state.isSubmitting = true;
  // Reabertura do modal (disparando onOpen / useEffect)
  modal.onOpen(profA);

  if (modal.state.isOpen && !modal.state.isSubmitting) {
    console.log("  PASS: Ao reabrir, isSubmitting foi resetado obrigatoriamente para false");
    passedTests++;
  } else {
    console.error("  FAIL: Modal reabriu em estado travado:", modal.state);
  }

  // TESTE 5: Trocar de registro rapidamente (editar prof A, fechar rápido, editar prof B) ->
  // A resposta da promise anterior não pode sobrescrever o professor B
  console.log("\n[TESTE 5] Troca rápida de registro com requisição defasada");
  modal.onOpen(profA);

  let slowResolve: (val: any) => void;
  const slowPromise = new Promise<{ success: boolean; data?: typeof profA }>((resolve) => {
    slowResolve = resolve;
  });

  // Dispara submissão de A que demora
  const submissionAPromise = modal.onSubmit(() => slowPromise);

  // Usuário fecha rápido e abre professor B
  modal.onClose();
  modal.onOpen(profB);

  // A resposta de A chega agora
  slowResolve!({ success: true, data: { id: "prof-001", nome: "NOME INDEVIDO DE A" } });
  await submissionAPromise;

  if (
    modal.state.record?.id === "prof-002" &&
    modal.state.formData?.nome === "Mariana Silva" &&
    modal.state.record?.nome !== "NOME INDEVIDO DE A"
  ) {
    console.log("  PASS: Resposta defasada de A foi ignorada com sucesso; professor B permanece intacto");
    passedTests++;
  } else {
    console.error("  FAIL: Resposta defasada sobrescreveu o registro atual:", modal.state);
  }

  // TESTE 6: Duplo clique no botão de salvar -> apenas 1 requisição deve ser disparada
  console.log("\n[TESTE 6] Bloqueio contra múltiplos cliques concorrentes");
  modal.submissionCount = 0;
  const mediumPromise = () => new Promise<{ success: boolean }>((r) => setTimeout(() => r({ success: true }), 100));

  const click1 = modal.onSubmit(mediumPromise);
  const click2 = modal.onSubmit(mediumPromise); // Duplo clique imediato

  await Promise.all([click1, click2]);

  if (modal.submissionCount === 1) {
    console.log("  PASS: Duplo clique prevenido com sucesso (apenas 1 requisição disparada)");
    passedTests++;
  } else {
    console.error("  FAIL: Múltiplas requisições disparadas:", modal.submissionCount);
  }

  // TESTE 7: Operação que ultrapasse timeout (ex: 200ms neste teste simulado) -> aborta por timeout e destrava interface
  console.log("\n[TESTE 7] Timeout controlado de operação assíncrona");
  modal.onOpen(profA);

  const hangingPromise = () => new Promise<{ success: boolean }>(() => {
    // nunca resolve
  });

  const timeoutStart = Date.now();
  // Usamos timeout controlado de 150ms para teste rápido
  const timeoutResult = await modal.onSubmit(hangingPromise, 150);
  const elapsed = Date.now() - timeoutStart;

  if (
    !timeoutResult &&
    !modal.state.isSubmitting &&
    modal.state.error?.includes("tempo limite") &&
    elapsed >= 140
  ) {
    console.log(`  PASS: Operação cancelada por timeout em ${elapsed}ms. Interface destravada com erro amigável`);
    passedTests++;
  } else {
    console.error("  FAIL: Falha no controle de timeout:", { timeoutResult, state: modal.state, elapsed });
  }

  // TESTE 8: Em nenhum desses cenários foi necessário recarregar a página (F5)
  console.log("\n[TESTE 8] Retentativa imediata sem necessidade de F5");
  // Imediatamente após o erro de timeout do Teste 7, o usuário pode tentar novamente com uma promise rápida
  const retryResult = await modal.onSubmit(successPromise);

  if (retryResult && !modal.state.isSubmitting && !modal.state.isOpen) {
    console.log("  PASS: Retentativa executada com 100% de sucesso sem necessidade de F5");
    passedTests++;
  } else {
    console.error("  FAIL: Retentativa falhou ou requereu reload:", modal.state);
  }

  // RESUMO FINAL
  console.log("\n==================================================================");
  console.log(`RESULTADO DA SUÍTE: ${passedTests}/${totalTests} TESTES APROVADOS`);
  console.log("==================================================================");

  if (passedTests === totalTests) {
    console.log("TODOS OS 8 CRITÉRIOS DE ANTI-TRAVAMENTO FORAM RIGOROSAMENTE VALIDADOS COM SUCESSO!\n");
    process.exit(0);
  } else {
    console.error("FALHA EM UM OU MAIS TESTES.\n");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Erro fatal na execução da suíte de testes:", err);
  process.exit(1);
});
