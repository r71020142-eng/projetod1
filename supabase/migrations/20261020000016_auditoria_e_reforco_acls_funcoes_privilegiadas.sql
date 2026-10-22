-- ==============================================================================
-- MIGRAÇÃO: 20261020000016_auditoria_e_reforco_acls_funcoes_privilegiadas.sql
-- ETAPA 10.3B1.4: AUDITORIA FINAL DE ACLS E BLINDAGEM DE FUNÇÕES PRIVILEGIADAS
--
-- Objetivos:
-- 1. Alinhamento de search_path seguro (search_path = public, auth) em todas
--    as funções de autenticação e papel.
-- 2. Revogação de EXECUTE desnecessário concedido por padrão pelo PostgreSQL a
--    PUBLIC e anon em get_auth_role() e is_admin().
-- 3. Concessão estrita de EXECUTE exclusivamente para authenticated e service_role.
-- 4. Blindagem em calcular_frequencia_aluno() para rejeitar perfil inativo
--    mesmo quando a conexão física de manutenção é postgres (exige auth.uid() IS NULL).
-- ==============================================================================

-- 1. get_auth_role()
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS public.user_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_role
  FROM public.perfis
  WHERE id = auth.uid()
    AND status = 'ativo';

  RETURN v_role;
END;
$$;

REVOKE ALL ON FUNCTION public.get_auth_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated, service_role;

-- 2. is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN (public.get_auth_role() = 'admin');
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 3. get_current_aluno_id()
CREATE OR REPLACE FUNCTION public.get_current_aluno_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_aluno_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT id INTO v_aluno_id
  FROM public.alunos
  WHERE perfil_id = auth.uid()
  LIMIT 1;
  RETURN v_aluno_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_current_aluno_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_aluno_id() TO authenticated, service_role;

-- 4. get_current_professor_id()
CREATE OR REPLACE FUNCTION public.get_current_professor_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_prof_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT id INTO v_prof_id
  FROM public.professores
  WHERE perfil_id = auth.uid()
  LIMIT 1;
  RETURN v_prof_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_current_professor_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_professor_id() TO authenticated, service_role;

-- 5. Blindagem de calcular_frequencia_aluno contra perfis inativos autenticados
CREATE OR REPLACE FUNCTION public.calcular_frequencia_aluno(
  p_aluno_id UUID,
  p_turma_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_presentes INT := 0;
  v_ausentes INT := 0;
  v_justificados INT := 0;
  v_nao_registrados INT := 0;
  v_total_concluidas INT := 0;
  v_base INT := 0;
  v_porcentagem NUMERIC;
  v_role public.user_role;
  v_caller_aluno_id UUID;
  v_caller_prof_id UUID;
BEGIN
  v_role := public.get_auth_role();
  
  -- Fallback de admin estritamente para scripts de manutenção do sistema SEM sessão de usuário
  IF v_role IS NULL AND auth.uid() IS NULL AND session_user = 'postgres' THEN
    v_role := 'admin'::public.user_role;
  END IF;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Perfil inativo ou inexistente.';
  END IF;

  -- 1. Aluno só pode consultar a própria frequência
  IF v_role = 'aluno' THEN
    v_caller_aluno_id := public.get_current_aluno_id();
    IF v_caller_aluno_id != p_aluno_id THEN
      RAISE EXCEPTION 'ACESSO_NEGADO: O aluno so pode consultar a propria frequencia.';
    END IF;
  END IF;

  -- 2. Professor só pode consultar alunos vinculados a suas turmas/aulas
  IF v_role = 'professor' THEN
    v_caller_prof_id := public.get_current_professor_id();
    IF NOT EXISTS (
      SELECT 1 FROM public.aulas a
      JOIN public.presencas_aulas pa ON pa.aula_id = a.id
      WHERE a.professor_id = v_caller_prof_id
        AND pa.aluno_id = p_aluno_id
    ) AND NOT (
      p_turma_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = p_turma_id AND t.professor_id = v_caller_prof_id
      )
    ) THEN
      RAISE EXCEPTION 'ACESSO_NEGADO: O professor nao possui vinculo com este aluno.';
    END IF;
  END IF;

  -- 3. Cálculo com join em matriculas_turmas assegurando validade temporal
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE pa.status = 'presente'), 0),
    COALESCE(COUNT(*) FILTER (WHERE pa.status = 'ausente'), 0),
    COALESCE(COUNT(*) FILTER (WHERE pa.status = 'justificado'), 0),
    COALESCE(COUNT(*) FILTER (WHERE pa.status = 'nao_registrado'), 0),
    COALESCE(COUNT(DISTINCT a.id), 0)
  INTO
    v_presentes,
    v_ausentes,
    v_justificados,
    v_nao_registrados,
    v_total_concluidas
  FROM public.presencas_aulas pa
  JOIN public.aulas a ON a.id = pa.aula_id
  JOIN public.matriculas_turmas m ON m.turma_id = a.turma_id AND m.aluno_id = pa.aluno_id
  WHERE pa.aluno_id = p_aluno_id
    AND a.status = 'concluida'
    AND m.matriculado_em <= a.inicio_em
    AND (
      (m.status = 'ativa' AND m.encerrado_em IS NULL)
      OR (m.encerrado_em IS NOT NULL AND a.inicio_em < m.encerrado_em)
    )
    AND (p_turma_id IS NULL OR a.turma_id = p_turma_id);

  v_base := v_presentes + v_ausentes;

  IF v_base > 0 THEN
    v_porcentagem := ROUND((v_presentes::numeric / v_base::numeric) * 100, 2);
  ELSE
    v_porcentagem := NULL;
  END IF;

  RETURN jsonb_build_object(
    'totalAulasConcluidas', v_total_concluidas,
    'presentes', v_presentes,
    'totalPresentes', v_presentes,
    'ausentes', v_ausentes,
    'totalAusentes', v_ausentes,
    'justificados', v_justificados,
    'totalJustificados', v_justificados,
    'naoRegistrados', v_nao_registrados,
    'porcentagem', v_porcentagem,
    'formulaExplicativa', 'Presentes / (Presentes + Ausentes) * 100 (Faltas justificadas e nao registrados nao penalizam o percentual)'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.calcular_frequencia_aluno(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calcular_frequencia_aluno(UUID, UUID) TO authenticated, service_role;
