-- Migração: Adicionar coluna tipo em aulas (regular | reposicao) e RPC agendar_multiplas_aulas
-- Data: 2026-11-15

-- 1. Adiciona coluna tipo em public.aulas
ALTER TABLE public.aulas 
ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'regular' 
CHECK (tipo IN ('regular', 'reposicao'));

-- 2. Atualizar agendar_aula para suportar tipo (com fallback transparente)
CREATE OR REPLACE FUNCTION public.agendar_aula(
  p_turma_id UUID,
  p_professor_id UUID,
  p_titulo TEXT,
  p_inicio_em TIMESTAMPTZ,
  p_fim_em TIMESTAMPTZ,
  p_meeting_url TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_serie_id UUID DEFAULT NULL,
  p_tipo TEXT DEFAULT 'regular'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_aula_id UUID;
  v_role public.user_role;
  v_uid UUID;
  v_tipo_sanitizado TEXT;
BEGIN
  v_uid := auth.uid();
  v_role := public.get_auth_role();

  IF v_uid IS NULL AND current_user = 'postgres' THEN
    v_uid := '660640d2-99fc-46e7-8e12-9ef0d67b60ee';
    v_role := 'admin'::public.user_role;
  END IF;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Perfil inativo ou inexistente.';
  END IF;

  IF v_role = 'aluno' THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Aluno nao possui permissao para agendar aulas.';
  END IF;

  IF v_role = 'professor' AND public.get_current_professor_id() != p_professor_id THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: O professor nao pode agendar aula para outro docente.';
  END IF;

  v_tipo_sanitizado := CASE WHEN p_tipo = 'reposicao' THEN 'reposicao' ELSE 'regular' END;

  -- Inserção atômica (triggers realizam locks e validação de conflitos)
  INSERT INTO public.aulas (
    turma_id, professor_id, serie_id, titulo,
    inicio_em, fim_em, meeting_url, observacoes,
    tipo, status, criado_por
  ) VALUES (
    p_turma_id, p_professor_id, p_serie_id, p_titulo,
    p_inicio_em, p_fim_em, p_meeting_url, p_observacoes,
    v_tipo_sanitizado, 'agendada', v_uid
  ) RETURNING id INTO v_aula_id;

  -- Inicializa chamada sincronizada com os alunos matriculados
  PERFORM public.iniciar_chamada_aula(v_aula_id);

  -- Auditoria
  INSERT INTO public.auditoria_logs (
    ator_id, ator_role, acao, entidade, identificador_entidade,
    valores_anteriores, valores_posteriores, metadados
  ) VALUES (
    v_uid, v_role::text, 'AGENDAMENTO_AULA', 'aulas', v_aula_id::text,
    NULL,
    jsonb_build_object(
      'turma_id', p_turma_id,
      'professor_id', p_professor_id,
      'inicio_em', p_inicio_em,
      'fim_em', p_fim_em,
      'titulo', p_titulo,
      'tipo', v_tipo_sanitizado
    ),
    jsonb_build_object('origem', 'rpc_agendar_aula')
  );

  RETURN v_aula_id;
END;
$$;

-- Permissões para agendar_aula
REVOKE ALL ON FUNCTION public.agendar_aula(UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agendar_aula(UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT) TO authenticated, service_role;

-- 3. Nova RPC para agendamento atômico de múltiplas aulas (recorrência semanal multidias)
CREATE OR REPLACE FUNCTION public.agendar_multiplas_aulas(
  p_aulas JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_item JSONB;
  v_aula_id UUID;
  v_role public.user_role;
  v_uid UUID;
  v_result JSONB := '[]'::JSONB;
  v_turma_id UUID;
  v_professor_id UUID;
  v_titulo TEXT;
  v_inicio_em TIMESTAMPTZ;
  v_fim_em TIMESTAMPTZ;
  v_meeting_url TEXT;
  v_observacoes TEXT;
  v_tipo TEXT;
BEGIN
  v_uid := auth.uid();
  v_role := public.get_auth_role();

  IF v_uid IS NULL AND current_user = 'postgres' THEN
    v_uid := '660640d2-99fc-46e7-8e12-9ef0d67b60ee';
    v_role := 'admin'::public.user_role;
  END IF;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Perfil inativo ou inexistente.';
  END IF;

  IF v_role = 'aluno' THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Aluno nao possui permissao para agendar aulas.';
  END IF;

  IF p_aulas IS NULL OR jsonb_array_length(p_aulas) = 0 THEN
    RAISE EXCEPTION 'DADOS_INVALIDOS: Nenhuma aula informada para agendamento.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_aulas) LOOP
    v_turma_id := (v_item->>'turma_id')::UUID;
    v_professor_id := (v_item->>'professor_id')::UUID;
    v_titulo := v_item->>'titulo';
    v_inicio_em := (v_item->>'inicio_em')::TIMESTAMPTZ;
    v_fim_em := (v_item->>'fim_em')::TIMESTAMPTZ;
    v_meeting_url := v_item->>'meeting_url';
    v_observacoes := v_item->>'observacoes';
    v_tipo := CASE WHEN (v_item->>'tipo') = 'reposicao' THEN 'reposicao' ELSE 'regular' END;

    IF v_role = 'professor' AND public.get_current_professor_id() != v_professor_id THEN
      RAISE EXCEPTION 'ACESSO_NEGADO: O professor nao pode agendar aula para outro docente.';
    END IF;

    -- Inserção (dispara triggers de integridade e conflito)
    INSERT INTO public.aulas (
      turma_id, professor_id, titulo, inicio_em, fim_em, meeting_url, observacoes, tipo, status, criado_por
    ) VALUES (
      v_turma_id, v_professor_id, v_titulo, v_inicio_em, v_fim_em, v_meeting_url, v_observacoes, v_tipo, 'agendada', v_uid
    ) RETURNING id INTO v_aula_id;

    -- Inicializa chamada sincronizada com os alunos matriculados
    PERFORM public.iniciar_chamada_aula(v_aula_id);

    v_result := v_result || to_jsonb(v_aula_id);
  END LOOP;

  -- Auditoria
  INSERT INTO public.auditoria_logs (
    ator_id, ator_role, acao, entidade, identificador_entidade,
    valores_anteriores, valores_posteriores, metadados
  ) VALUES (
    v_uid, v_role::text, 'AGENDAMENTO_MULTIPLAS_AULAS', 'aulas', v_result->>0,
    NULL,
    jsonb_build_object('total_aulas', jsonb_array_length(p_aulas), 'aulas', v_result),
    jsonb_build_object('origem', 'rpc_agendar_multiplas_aulas')
  );

  RETURN v_result;
END;
$$;

-- Permissões para agendar_multiplas_aulas
REVOKE ALL ON FUNCTION public.agendar_multiplas_aulas(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agendar_multiplas_aulas(JSONB) TO authenticated, service_role;
