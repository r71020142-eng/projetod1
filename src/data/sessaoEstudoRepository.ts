import { SessaoEstudoResumo } from "@/types";
import { SEED_SESSOES_ESTUDO } from "./mockData";

const STORAGE_KEY = "mtd_demonstrativo_sessoes_estudo_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadSessoesFromStorage(): SessaoEstudoResumo[] {
  if (!isBrowser()) {
    return [...SEED_SESSOES_ESTUDO];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SESSOES_ESTUDO));
      return [...SEED_SESSOES_ESTUDO];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as SessaoEstudoResumo[];
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SESSOES_ESTUDO));
    return [...SEED_SESSOES_ESTUDO];
  } catch (err) {
    console.warn("Aviso ao carregar sessões de estudo do localStorage:", err);
    return [...SEED_SESSOES_ESTUDO];
  }
}

export function saveSessoesToStorage(sessoes: SessaoEstudoResumo[]): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessoes));
    window.dispatchEvent(
      new CustomEvent("mtd_storage_updated", { detail: { entity: "sessoes_estudo" } })
    );
    return true;
  } catch (err) {
    console.error("Erro ao persistir sessões de estudo:", err);
    return false;
  }
}

function generateSessaoId(existingList: SessaoEstudoResumo[]): string {
  const maxNum = existingList.reduce((acc, s) => {
    const match = s.id.match(/^sessao-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > acc ? num : acc;
    }
    return acc;
  }, 0);
  const nextNum = maxNum + 1;
  return `sessao-${String(nextNum).padStart(3, "0")}`;
}

export async function salvarSessaoEstudo(
  dados: Omit<SessaoEstudoResumo, "id">
): Promise<SessaoEstudoResumo> {
  const list = loadSessoesFromStorage();
  const nova: SessaoEstudoResumo = {
    id: generateSessaoId(list),
    ...dados,
  };

  list.unshift(nova);
  saveSessoesToStorage(list);
  return nova;
}

export async function obterSessoesPorAluno(
  alunoId: string,
  baralhoId?: string
): Promise<SessaoEstudoResumo[]> {
  const list = loadSessoesFromStorage();
  let filtradas = list.filter((s) => s.alunoId === alunoId);
  if (baralhoId) {
    filtradas = filtradas.filter((s) => s.baralhoId === baralhoId);
  }
  return filtradas.sort(
    (a, b) => new Date(b.concluidaEm).getTime() - new Date(a.concluidaEm).getTime()
  );
}
