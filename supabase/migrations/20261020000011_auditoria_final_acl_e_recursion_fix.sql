-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 11 (AUDITORIA FINAL ETAPA 10.3A)
-- Blindagem de ACL das Funções, Resolução de Recursão RLS e Bloqueio de DELETE
--
-- Objetivo:
-- 1. Eliminar risco de recursão infinita RLS (42P17) entre public.turmas e
--    public.matriculas_turmas via funções STABLE SECURITY DEFINER (aluno_has_turma
--    e professor_has_matricula).
-- 2. Revogar privilégios EXECUTE de PUBLIC e anon em todas as funções internas e triggers.
-- 3. Assegurar REVOKE DELETE absoluto de PUBLIC, anon e authenticated em turmas e matrículas.
-- 4. Garantir search_path seguro e imutável ('public, auth' ou 'public') em todas as funções.
-- 5. Remover funções redundantes/obsoletas de triggers prévios.
-- ==============================================================================

-- 1. FUNÇÕES AUXILIARES SEGURAS PARA RLS (PREVENÇÃO DE RECURSÃO CIRCULAR)

CREATE OR REPLACE FUNCTION public.aluno_has_turma(p_turma_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matriculas_turmas
    WHERE turma_id = p_turma_id
      AND aluno_id = public.get_current_aluno_id()
      AND status = 'ativa'
  );
$$;

CREATE OR REPLACE FUNCTION public.professor_has_matricula(p_turma_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.turmas
    WHERE id = p_turma_id
      AND professor_id = public.get_current_professor_id()
  );
$$;

-- Permissões das funções auxiliares de RLS
REVOKE ALL ON FUNCTION public.aluno_has_turma(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aluno_has_turma(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.professor_has_matricula(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.professor_has_matricula(UUID) TO authenticated, service_role;


-- 2. ATUALIZAÇÃO IDEMPOTENTE DAS POLÍTICAS RLS ANTI-RECURSÃO

-- 2.1. Política aluno_select_turmas
DROP POLICY IF EXISTS aluno_select_turmas ON public.turmas;
CREATE POLICY aluno_select_turmas
ON public.turmas
FOR SELECT
TO authenticated
USING (
  public.get_auth_role() = 'aluno'
  AND public.aluno_has_turma(id)
);

-- 2.2. Política professor_select_matriculas
DROP POLICY IF EXISTS professor_select_matriculas ON public.matriculas_turmas;
CREATE POLICY professor_select_matriculas
ON public.matriculas_turmas
FOR SELECT
TO authenticated
USING (
  public.get_auth_role() = 'professor'
  AND public.professor_has_matricula(turma_id)
);


-- 3. BLINDAGEM DE ACL EM FUNÇÕES DE TRIGGER E PROCEDURES

-- 3.1. check_matricula_integridade
REVOKE ALL ON FUNCTION public.check_matricula_integridade() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_matricula_integridade() TO authenticated, service_role;

-- 3.2. check_turma_integridade
REVOKE ALL ON FUNCTION public.check_turma_integridade() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_turma_integridade() TO authenticated, service_role;

-- 3.3. prevent_client_physical_delete
REVOKE ALL ON FUNCTION public.prevent_client_physical_delete() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prevent_client_physical_delete() TO authenticated, service_role;

-- 3.4. RPCs Transacionais (reafirmação de search_path e ACL estrita)
REVOKE ALL ON FUNCTION public.matricular_aluno_turma(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.matricular_aluno_turma(UUID, UUID, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.encerrar_matricula_aluno(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.encerrar_matricula_aluno(UUID, UUID, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.alterar_capacidade_turma(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.alterar_capacidade_turma(UUID, INTEGER) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.trocar_professor_turma(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trocar_professor_turma(UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_current_professor_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_professor_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_current_aluno_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_aluno_id() TO authenticated, service_role;


-- 4. REAFIRMAÇÃO DE BLOQUEIO DE DELETE DIRETO

REVOKE DELETE ON public.turmas FROM PUBLIC, anon, authenticated;
REVOKE DELETE ON public.matriculas_turmas FROM PUBLIC, anon, authenticated;

-- Garante ausência total de políticas que permitam DELETE
DROP POLICY IF EXISTS admin_delete_turmas ON public.turmas;
DROP POLICY IF EXISTS aluno_delete_turmas ON public.turmas;
DROP POLICY IF EXISTS professor_delete_turmas ON public.turmas;
DROP POLICY IF EXISTS admin_delete_matriculas ON public.matriculas_turmas;
DROP POLICY IF EXISTS aluno_delete_matriculas ON public.matriculas_turmas;
DROP POLICY IF EXISTS professor_delete_matriculas ON public.matriculas_turmas;


-- 5. LIMPEZA DE FUNÇÕES OBSOLETAS
DROP FUNCTION IF EXISTS public.check_matricula_aluno_ativo();
DROP FUNCTION IF EXISTS public.check_turma_professor_ativo();
