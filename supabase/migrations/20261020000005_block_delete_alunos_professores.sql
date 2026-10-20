-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 5 (ETAPA 10.2B2 - CORREÇÃO DE SEGURANÇA)
-- Bloqueio Estrito de Exclusão Física (DELETE) em Alunos e Professores
-- ==============================================================================
-- Regras de Negócio:
-- 1. A regra de domínio determina estritamente inativação lógica (status = 'inativo').
-- 2. Nenhum usuário autenticado da aplicação (inclusive administrador) pode executar DELETE físico via API.
-- 3. Revogação explícita de privilégios DELETE para 'anon' e 'authenticated'.
-- 4. Remoção de todas as políticas RLS permissivas de DELETE.
-- 5. Preservação integral das permissões de SELECT, INSERT e UPDATE para administradores.
-- 6. Trigger ativo de bloqueio prevenindo qualquer tentativa com sessão autenticada.
-- ==============================================================================

-- 1. REMOÇÃO DE POLÍTICAS RLS DE DELETE
DROP POLICY IF EXISTS "alunos_delete_policy" ON public.alunos;
DROP POLICY IF EXISTS "professores_delete_policy" ON public.professores;

-- Para public.alunos_dados_pedagogicos: substitui policy ALL por políticas granulares sem DELETE
DROP POLICY IF EXISTS "alunos_dados_pedagogicos_admin_all" ON public.alunos_dados_pedagogicos;

DROP POLICY IF EXISTS "alunos_dados_pedagogicos_admin_select" ON public.alunos_dados_pedagogicos;
CREATE POLICY "alunos_dados_pedagogicos_admin_select"
  ON public.alunos_dados_pedagogicos
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "alunos_dados_pedagogicos_admin_insert" ON public.alunos_dados_pedagogicos;
CREATE POLICY "alunos_dados_pedagogicos_admin_insert"
  ON public.alunos_dados_pedagogicos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "alunos_dados_pedagogicos_admin_update" ON public.alunos_dados_pedagogicos;
CREATE POLICY "alunos_dados_pedagogicos_admin_update"
  ON public.alunos_dados_pedagogicos
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. REVOGAÇÃO EXPLÍCITA DE PRIVILÉGIOS DE DELETE PARA ANON E AUTHENTICATED
REVOKE DELETE ON TABLE public.alunos FROM anon, authenticated;
REVOKE DELETE ON TABLE public.professores FROM anon, authenticated;
REVOKE DELETE ON TABLE public.alunos_dados_pedagogicos FROM anon, authenticated;

-- Garante que permissões legítimas permaneçam intactas
GRANT SELECT, INSERT, UPDATE ON TABLE public.alunos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.professores TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.alunos_dados_pedagogicos TO authenticated;

-- 3. TRIGGER ATIVO DE DEFESA EM PROFUNDIDADE CONTRA EXCLUSÃO FÍSICA
CREATE OR REPLACE FUNCTION public.prevent_client_physical_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Exclusão física bloqueada: a regra de negócio do Método Paulo exige inativação lógica através da alteração de status para inativo.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_delete_alunos ON public.alunos;
CREATE TRIGGER trg_prevent_delete_alunos
  BEFORE DELETE ON public.alunos
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_client_physical_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_professores ON public.professores;
CREATE TRIGGER trg_prevent_delete_professores
  BEFORE DELETE ON public.professores
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_client_physical_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_alunos_dados_pedagogicos ON public.alunos_dados_pedagogicos;
CREATE TRIGGER trg_prevent_delete_alunos_dados_pedagogicos
  BEFORE DELETE ON public.alunos_dados_pedagogicos
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_client_physical_delete();
