/**
 * Utilitários assíncronos e de controle de concorrência do DEMOSTRATIVO MTD.
 *
 * Garante que operações de escrita em formulários:
 * 1. Não fiquem pendentes indefinidamente (timeout controlado configurável);
 * 2. Limpem temporizadores em caso de conclusão ou rejeição;
 * 3. Suportem cancelamento/invalidação de respostas defasadas.
 */

export const DEFAULT_ASYNC_TIMEOUT_MS = 15000;
export const DEFAULT_TIMEOUT_MESSAGE =
  "A operação excedeu o tempo limite de resposta (15s). Por favor, verifique sua conexão e tente novamente.";

/**
 * Executa uma promise com tempo limite controlado.
 * Se a promise demorar mais do que timeoutMs, rejeita com erro explícito e cancela o timer.
 */
export async function executeWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_ASYNC_TIMEOUT_MS,
  timeoutMessage: string = DEFAULT_TIMEOUT_MESSAGE
): Promise<T> {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
  }
}

/**
 * Controlador de ciclo de submissão para componentes React.
 * Permite invalidar requisições antigas e checar se uma resposta ainda é a mais recente.
 */
export class SubmissionLifecycleController {
  private currentRequestId = 0;
  private isSubmittingState = false;

  public startSubmission(): { requestId: number; allowed: boolean } {
    if (this.isSubmittingState) {
      return { requestId: this.currentRequestId, allowed: false };
    }
    this.isSubmittingState = true;
    this.currentRequestId += 1;
    return { requestId: this.currentRequestId, allowed: true };
  }

  public endSubmission(requestId: number): boolean {
    if (requestId === this.currentRequestId) {
      this.isSubmittingState = false;
      return true;
    }
    return false;
  }

  public reset(): void {
    this.currentRequestId += 1;
    this.isSubmittingState = false;
  }

  public isLatest(requestId: number): boolean {
    return requestId === this.currentRequestId;
  }

  public isSubmitting(): boolean {
    return this.isSubmittingState;
  }
}
