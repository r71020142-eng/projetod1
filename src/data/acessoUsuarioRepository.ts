import { AcessoUsuario } from "@/types";
import { getCoreUsersDataSource } from "./repositoryFactory";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";

interface AcessoDbRow {
  id: string;
  aluno_id: string | null;
  professor_id: string | null;
  perfil_id: string | null;
  email_normalizado: string;
  tipo: "aluno" | "professor";
  status: "processando" | "convite_pendente" | "ativo" | "bloqueado" | "erro";
  convidado_por: string | null;
  convite_enviado_em: string | null;
  acesso_ativado_em: string | null;
  ultimo_erro_interno: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToAcesso(row: AcessoDbRow): AcessoUsuario {
  return {
    id: row.id,
    alunoId: row.aluno_id || undefined,
    professorId: row.professor_id || undefined,
    perfilId: row.perfil_id || undefined,
    emailNormalizado: row.email_normalizado,
    tipo: row.tipo,
    status: row.status,
    convidadoPor: row.convidado_por || undefined,
    conviteEnviadoEm: row.convite_enviado_em || undefined,
    acessoAtivadoEm: row.acesso_ativado_em || undefined,
    ultimoErroInterno: row.ultimo_erro_interno || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const acessoUsuarioRepository = {
  async obterPorAlunoId(alunoId: string): Promise<AcessoUsuario | null> {
    const dataSource = getCoreUsersDataSource();

    if (dataSource === "local") {
      if (typeof window === "undefined") return null;
      try {
        const raw = localStorage.getItem("mtd_acessos_usuarios");
        if (!raw) return null;
        const list: AcessoUsuario[] = JSON.parse(raw);
        return list.find((a) => a.alunoId === alunoId) || null;
      } catch {
        return null;
      }
    }

    try {
      const client = createBrowserSupabaseClient();
      if (!client) return null;

      const { data, error } = await client
        .from("acessos_usuarios")
        .select("*")
        .eq("aluno_id", alunoId)
        .maybeSingle();

      if (error || !data) return null;
      return mapRowToAcesso(data as AcessoDbRow);
    } catch {
      return null;
    }
  },

  async obterPorProfessorId(professorId: string): Promise<AcessoUsuario | null> {
    const dataSource = getCoreUsersDataSource();

    if (dataSource === "local") {
      if (typeof window === "undefined") return null;
      try {
        const raw = localStorage.getItem("mtd_acessos_usuarios");
        if (!raw) return null;
        const list: AcessoUsuario[] = JSON.parse(raw);
        return list.find((a) => a.professorId === professorId) || null;
      } catch {
        return null;
      }
    }

    try {
      const client = createBrowserSupabaseClient();
      if (!client) return null;

      const { data, error } = await client
        .from("acessos_usuarios")
        .select("*")
        .eq("professor_id", professorId)
        .maybeSingle();

      if (error || !data) return null;
      return mapRowToAcesso(data as AcessoDbRow);
    } catch {
      return null;
    }
  },

  async obterPorEmail(email: string): Promise<AcessoUsuario | null> {
    const norm = email.trim().toLowerCase();
    const dataSource = getCoreUsersDataSource();

    if (dataSource === "local") {
      if (typeof window === "undefined") return null;
      try {
        const raw = localStorage.getItem("mtd_acessos_usuarios");
        if (!raw) return null;
        const list: AcessoUsuario[] = JSON.parse(raw);
        return list.find((a) => a.emailNormalizado === norm) || null;
      } catch {
        return null;
      }
    }

    try {
      const client = createBrowserSupabaseClient();
      if (!client) return null;

      const { data, error } = await client
        .from("acessos_usuarios")
        .select("*")
        .eq("email_normalizado", norm)
        .maybeSingle();

      if (error || !data) return null;
      return mapRowToAcesso(data as AcessoDbRow);
    } catch {
      return null;
    }
  },
};
