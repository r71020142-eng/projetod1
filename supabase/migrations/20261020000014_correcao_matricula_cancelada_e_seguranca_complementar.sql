-- ==============================================================================
-- MIGRAÇÃO: 20261020000014_correcao_matricula_cancelada_e_seguranca_complementar.sql
-- ETAPA 10.3B1.2: VERIFICAÇÃO COMPLEMENTAR OBRIGATÓRIA — DEMOSTRATIVO MTD
--
-- Objetivos:
-- 1. HISTÓRICO DE MATRÍCULAS CANCELADAS E ENCERRADAS:
--    Substituição da cláusula restritiva "m.status != 'cancelada'" pelo modelo
--    temporal semiaberto unificado:
--    m.matriculado_em <= aula.inicio_em AND (
--      (m.status = 'ativa' AND m.encerrado_em IS NULL) OR
--      (m.encerrado_em IS NOT NULL AND aula.inicio_em < m.encerrado_em)
--    )
--    Garante que discentes com matrícula encerrada ou cancelada preservem a
--    visibilidade de suas aulas, presenças e cálculo de frequência histórica
--    estritamente para o intervalo em que estavam matriculados.
--
-- 2. PRIVACIDADE E ACL DAS VIEWS E RPCS DE ALUNOS:
--    Revogação de privilégios de escrita herdados em public.vw_aluno_aulas e
--    public.vw_aluno_presencas, concedendo exclusivamente SELECT para authenticated
--    e service_role. Confirmação de ACL estrita das RPCs de consulta.
--
-- 3. INTEGRIDADE DAS FUNÇÕES DE TRIGGER:
--    Garante preenchimento determinístico de encerrado_em em cancelamentos e
--    encerramento de matrículas quando ausente.
-- ==============================================================================

-- 1. ATUALIZAÇÃO DO TRIGGER DE INTEGRIDADE DE MATRÍCULAS (ENCERRADO_EM DETERMINÍSTICO)
CREATE OR REPLACE FUNCTION public.check_matricula_integridade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_aluno_status TEXT;
  v_aluno_nome TEXT;
  v_turma RECORD;
  v_contagem_ativas INTEGER;
BEGIN
  -- Se o status for encerrada ou cancelada e encerrado_em não foi fornecido, define now()
  IF NEW.status IN ('encerrada', 'cancelada') AND NEW.encerrado_em IS NULL THEN
    NEW.encerrado_em := timezone('utc'::text, now());
  END IF;

  -- Se for reativada para ativa, limpa encerrado_em se não explicitamente mantido
  IF NEW.status = 'ativa' AND (TG_OP = 'INSERT' OR OLD.status IN ('encerrada', 'cancelada')) THEN
    NEW.encerrado_em := NULL;
  END IF;

  -- Regras aplicáveis a qualquer matrícula com status ativo
  IF NEW.status = 'ativa' THEN
    -- 1.1. Validação de status ativo do discente
    SELECT status, nome_completo INTO v_aluno_status, v_aluno_nome
    FROM public.alunos
    WHERE id = NEW.aluno_id;

    IF v_aluno_status IS NULL THEN
      RAISE EXCEPTION 'Discente não encontrado (ID: %).', NEW.aluno_id;
    END IF;

    IF v_aluno_status <> 'ativo' THEN
      RAISE EXCEPTION 'Não é permitido matricular o discente "%" pois seu cadastro está inativo.', v_aluno_nome;
    END IF;

    -- 1.2. Validação da turma com bloqueio de linha (FOR UPDATE) para serialização de concorrência
    SELECT id, nome, modalidade, capacidade, status INTO v_turma
    FROM public.turmas
    WHERE id = NEW.turma_id
    FOR UPDATE;

    IF v_turma.id IS NULL THEN
      RAISE EXCEPTION 'Turma não encontrada (ID: %).', NEW.turma_id;
    END IF;

    -- 1.3. Bloqueio de matrícula ou reativação em turma encerrada
    IF v_turma.status = 'encerrada' THEN
      RAISE EXCEPTION 'Não é permitido matricular ou reativar aluno na turma "%" pois ela está encerrada.', v_turma.nome;
    END IF;

    -- 1.4. Contagem atômica de matrículas ativas existentes na turma de destino
    SELECT count(*) INTO v_contagem_ativas
    FROM public.matriculas_turmas
    WHERE turma_id = NEW.turma_id
      AND status = 'ativa'
      AND (TG_OP = 'INSERT' OR id <> NEW.id);

    -- 1.5. Bloqueio de excesso de capacidade
    IF v_turma.modalidade = 'individual' AND v_contagem_ativas >= 1 THEN
      RAISE EXCEPTION 'A turma individual "%" já atingiu a capacidade máxima (1 aluno).', v_turma.nome;
    END IF;

    IF v_turma.modalidade = 'grupo' AND v_contagem_ativas >= v_turma.capacidade THEN
      RAISE EXCEPTION 'A turma "%" atingiu a capacidade máxima planejada (% alunos).', v_turma.nome, v_turma.capacidade;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_matricula_integridade() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_matricula_integridade() TO service_role;


-- 2. FUNÇÃO AUXILIAR DE VISIBILIDADE DE AULAS PELO ALUNO (INTERVALO SEMIABERTO UNIFICADO)
CREATE OR REPLACE FUNCTION public.aluno_can_view_aula(p_aula_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.aulas a
    JOIN public.matriculas_turmas m ON m.turma_id = a.turma_id
    WHERE a.id = p_aula_id
      AND m.aluno_id = public.get_current_aluno_id()
      AND m.matriculado_em <= a.inicio_em
      AND (
        (m.status = 'ativa' AND m.encerrado_em IS NULL)
        OR (m.encerrado_em IS NOT NULL AND a.inicio_em < m.encerrado_em)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.aluno_can_view_aula(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aluno_can_view_aula(UUID) TO authenticated, service_role;


-- 3. DETECÇÃO DE CONFLITOS DE ALUNOS COM INTERVALO TEMPORAL SEMIABERTO UNIFICADO
CREATE OR REPLACE FUNCTION public.check_conflito_horario_alunos_turma(
  p_turma_id UUID,
  p_inicio TIMESTAMPTZ,
  p_fim TIMESTAMPTZ,
  p_ignorar_aula_id UUID DEFAULT NULL
)
RETURNS TABLE (
  aluno_id UUID,
  aluno_nome TEXT,
  outra_turma_nome TEXT,
  aula_id UUID,
  inicio_em TIMESTAMPTZ,
  fim_em TIMESTAMPTZ
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT al.id, al.nome_completo, t2.nome, a2.id, a2.inicio_em, a2.fim_em
  FROM public.matriculas_turmas m1
  JOIN public.alunos al ON al.id = m1.aluno_id
  JOIN public.matriculas_turmas m2 ON m2.aluno_id = m1.aluno_id AND m2.turma_id != p_turma_id
  JOIN public.turmas t2 ON t2.id = m2.turma_id
  JOIN public.aulas a2 ON a2.turma_id = t2.id
  WHERE m1.turma_id = p_turma_id
    AND m1.matriculado_em <= p_inicio
    AND (
      (m1.status = 'ativa' AND m1.encerrado_em IS NULL)
      OR (m1.encerrado_em IS NOT NULL AND p_inicio < m1.encerrado_em)
    )
    AND m2.matriculado_em <= a2.inicio_em
    AND (
      (m2.status = 'ativa' AND m2.encerrado_em IS NULL)
      OR (m2.encerrado_em IS NOT NULL AND a2.inicio_em < m2.encerrado_em)
    )
    AND a2.status != 'cancelada'
    AND (p_ignorar_aula_id IS NULL OR a2.id != p_ignorar_aula_id)
    AND (a2.inicio_em < p_fim AND a2.fim_em > p_inicio);
$$;

REVOKE ALL ON FUNCTION public.check_conflito_horario_alunos_turma(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_conflito_horario_alunos_turma(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated, service_role;


-- 4. TRIGGER DE INTEGRIDADE DE AULAS (IMUTABILIDADE PRIORITÁRIA E INTERVALO SEMIABERTO UNIFICADO)
CREATE OR REPLACE FUNCTION public.check_aula_integridade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_turma_status TEXT;
  v_turma_prof_id UUID;
  v_conflito_aula_id UUID;
  v_conflito_turma_nome TEXT;
  v_conflito_inicio TIMESTAMPTZ;
  v_conflito_fim TIMESTAMPTZ;
  v_aluno_conflito RECORD;
  v_aluno_lock_id UUID;
  v_role public.user_role;
  v_uid UUID;
BEGIN
  -- 1. Imutabilidade de aula cancelada
  IF TG_OP = 'UPDATE' AND OLD.status = 'cancelada' THEN
    IF NEW.status != 'cancelada' THEN
      RAISE EXCEPTION 'AULA_CANCELADA_IMUTAVEL: Nao e permitido alterar o status de uma aula cancelada.';
    END IF;
    IF OLD.inicio_em != NEW.inicio_em OR OLD.fim_em != NEW.fim_em OR OLD.turma_id != NEW.turma_id OR OLD.professor_id != NEW.professor_id THEN
      RAISE EXCEPTION 'AULA_CANCELADA_IMUTAVEL: Os dados estruturais de uma aula cancelada sao imutaveis.';
    END IF;
  END IF;

  -- 2. Imutabilidade de aula concluída
  IF TG_OP = 'UPDATE' AND OLD.status = 'concluida' THEN
    IF NEW.status != 'concluida' THEN
      RAISE EXCEPTION 'AULA_CONCLUIDA_IMUTAVEL: Nao e permitido alterar o status de uma aula ja concluida.';
    END IF;
    IF OLD.inicio_em != NEW.inicio_em OR OLD.fim_em != NEW.fim_em OR OLD.turma_id != NEW.turma_id OR OLD.professor_id != NEW.professor_id THEN
      RAISE EXCEPTION 'AULA_CONCLUIDA_IMUTAVEL: Os dados estruturais de uma aula concluida sao imutaveis.';
    END IF;
  END IF;

  -- 3. Normalização de datas e timezone
  IF NEW.fim_em <= NEW.inicio_em THEN
    RAISE EXCEPTION 'HORARIO_INVALIDO: O horario de termino (%) deve ser posterior ao inicio (%).', NEW.fim_em, NEW.inicio_em;
  END IF;

  -- Validação de meeting_url segura
  IF NEW.meeting_url IS NOT NULL AND length(trim(NEW.meeting_url)) > 0 THEN
    IF NOT (NEW.meeting_url ~* '^https://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$') THEN
      RAISE EXCEPTION 'MEETING_URL_INVALIDA: O link da aula deve ser uma URL HTTPS valida e confiavel (ex: https://zoom.us/j/...). Links sem HTTPS, javascript, data ou malformatados sao proibidos.';
    END IF;
  END IF;

  -- 4. Aulas canceladas não geram conflitos
  IF NEW.status = 'cancelada' THEN
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
  END IF;

  -- 5. Validação da turma e bloqueio de concorrência determinístico
  SELECT status, professor_id INTO v_turma_status, v_turma_prof_id
  FROM public.turmas WHERE id = NEW.turma_id;

  IF v_turma_status IS NULL THEN
    RAISE EXCEPTION 'TURMA_NAO_ENCONTRADA: Turma % nao encontrada.', NEW.turma_id;
  END IF;

  IF v_turma_status = 'encerrada' THEN
    RAISE EXCEPTION 'TURMA_ENCERRADA: Nao e permitido agendar aulas em uma turma encerrada.';
  END IF;

  -- Lock 1: Professor
  PERFORM pg_advisory_xact_lock(hashtext('lock_prof_' || NEW.professor_id::text));

  -- Lock 2: Turma
  PERFORM pg_advisory_xact_lock(hashtext('lock_turma_' || NEW.turma_id::text));

  -- Lock 3: Todos os alunos temporalmente ativos na turma na data da aula
  FOR v_aluno_lock_id IN
    SELECT aluno_id
    FROM public.matriculas_turmas
    WHERE turma_id = NEW.turma_id
      AND matriculado_em <= NEW.inicio_em
      AND (
        (status = 'ativa' AND encerrado_em IS NULL)
        OR (encerrado_em IS NOT NULL AND NEW.inicio_em < encerrado_em)
      )
    ORDER BY aluno_id ASC
  LOOP
    PERFORM pg_advisory_xact_lock(hashtext('lock_aluno_' || v_aluno_lock_id::text));
  END LOOP;

  -- 6. Validação de conflito do professor
  SELECT aula_id, turma_nome, inicio_em, fim_em
  INTO v_conflito_aula_id, v_conflito_turma_nome, v_conflito_inicio, v_conflito_fim
  FROM public.check_conflito_horario_professor(
    NEW.professor_id,
    NEW.inicio_em,
    NEW.fim_em,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NULL END
  )
  LIMIT 1;

  IF v_conflito_aula_id IS NOT NULL THEN
    RAISE EXCEPTION 'CONFLITO_HORARIO_PROFESSOR: O professor ja possui a aula % agendada na turma "%" entre % e %.',
      v_conflito_aula_id, v_conflito_turma_nome, v_conflito_inicio, v_conflito_fim;
  END IF;

  -- 7. Validação de conflito dos alunos da turma
  SELECT aluno_id, aluno_nome, outra_turma_nome, aula_id, inicio_em, fim_em
  INTO v_aluno_conflito
  FROM public.check_conflito_horario_alunos_turma(
    NEW.turma_id,
    NEW.inicio_em,
    NEW.fim_em,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NULL END
  )
  LIMIT 1;

  IF v_aluno_conflito.aluno_id IS NOT NULL THEN
    RAISE EXCEPTION 'CONFLITO_HORARIO_ALUNO: O discente % (%) ja possui a aula % na turma "%" entre % e %.',
      v_aluno_conflito.aluno_nome, v_aluno_conflito.aluno_id, v_aluno_conflito.aula_id,
      v_aluno_conflito.outra_turma_nome, v_aluno_conflito.inicio_em, v_aluno_conflito.fim_em;
  END IF;

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_aula_integridade() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_aula_integridade() TO service_role;


-- 5. TRIGGER DE INTEGRIDADE DE PRESENÇAS (INTERVALO SEMIABERTO UNIFICADO)
CREATE OR REPLACE FUNCTION public.check_presenca_integridade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_turma_id UUID;
  v_inicio_em TIMESTAMPTZ;
  v_aula_status TEXT;
  v_matricula_id UUID;
  v_ator_id UUID;
  v_ator_role TEXT;
BEGIN
  SELECT turma_id, inicio_em, status
  INTO v_turma_id, v_inicio_em, v_aula_status
  FROM public.aulas WHERE id = NEW.aula_id;

  IF v_turma_id IS NULL THEN
    RAISE EXCEPTION 'AULA_NAO_ENCONTRADA: Aula % nao encontrada.', NEW.aula_id;
  END IF;

  IF v_aula_status = 'cancelada' THEN
    RAISE EXCEPTION 'AULA_CANCELADA: Nao e permitido registrar presencas em aula cancelada.';
  END IF;

  -- Regra Temporal Semiaberta Estrita de Matrícula:
  SELECT id INTO v_matricula_id
  FROM public.matriculas_turmas
  WHERE turma_id = v_turma_id
    AND aluno_id = NEW.aluno_id
    AND matriculado_em <= v_inicio_em
    AND (
      (status = 'ativa' AND encerrado_em IS NULL)
      OR (encerrado_em IS NOT NULL AND v_inicio_em < encerrado_em)
    )
  LIMIT 1;

  IF v_matricula_id IS NULL THEN
    RAISE EXCEPTION 'ALUNO_NAO_MATRICULADO_TEMPORAL: O aluno % nao estava ativamente matriculado na turma na data de inicio da aula.', NEW.aluno_id;
  END IF;

  NEW.matricula_id := v_matricula_id;

  v_ator_id := auth.uid();
  v_ator_role := public.get_auth_role();

  -- Auditoria de alteração posterior se a aula já estiver concluída
  IF TG_OP = 'UPDATE' AND v_aula_status = 'concluida' THEN
    IF OLD.status IS DISTINCT FROM NEW.status OR OLD.justificativa IS DISTINCT FROM NEW.justificativa THEN
      INSERT INTO public.auditoria_logs (
        ator_id, ator_role, acao, entidade, identificador_entidade,
        valores_anteriores, valores_posteriores, metadados
      ) VALUES (
        v_ator_id, v_ator_role, 'ALTERACAO_POSTERIOR_PRESENCA', 'presencas_aulas', NEW.id::text,
        jsonb_build_object('status', OLD.status, 'justificativa', OLD.justificativa, 'observacao_pedagogica', OLD.observacao_pedagogica),
        jsonb_build_object('status', NEW.status, 'justificativa', NEW.justificativa, 'observacao_pedagogica', NEW.observacao_pedagogica),
        jsonb_build_object('aula_id', NEW.aula_id, 'aluno_id', NEW.aluno_id, 'aula_concluida', true)
      );
    END IF;
  END IF;

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_presenca_integridade() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_presenca_integridade() TO service_role;


-- 6. RPC INICIAR CHAMADA AULA (INTERVALO SEMIABERTO UNIFICADO)
CREATE OR REPLACE FUNCTION public.iniciar_chamada_aula(p_aula_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_turma_id UUID;
  v_inicio_em TIMESTAMPTZ;
  v_status TEXT;
  v_prof_id UUID;
  v_role public.user_role;
BEGIN
  v_role := public.get_auth_role();
  IF v_role IS NULL AND current_user = 'postgres' THEN
    v_role := 'admin'::public.user_role;
  END IF;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Perfil inativo ou inexistente.';
  END IF;

  SELECT turma_id, inicio_em, status, professor_id
  INTO v_turma_id, v_inicio_em, v_status, v_prof_id
  FROM public.aulas WHERE id = p_aula_id;

  IF v_turma_id IS NULL THEN
    RAISE EXCEPTION 'AULA_NAO_ENCONTRADA: Aula nao encontrada.';
  END IF;

  IF v_status = 'cancelada' THEN
    RAISE EXCEPTION 'AULA_CANCELADA: Nao e possivel iniciar chamada em aula cancelada.';
  END IF;

  IF v_role = 'aluno' THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Aluno nao possui permissao para iniciar chamada.';
  END IF;

  IF v_role = 'professor' AND public.get_current_professor_id() != v_prof_id THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: O professor nao pode iniciar chamada de aula de outro docente.';
  END IF;

  -- Cria registros nao_registrado apenas para alunos temporalmente válidos no instante da aula
  INSERT INTO public.presencas_aulas (
    aula_id, aluno_id, matricula_id, status
  )
  SELECT
    p_aula_id,
    m.aluno_id,
    m.id,
    'nao_registrado'
  FROM public.matriculas_turmas m
  WHERE m.turma_id = v_turma_id
    AND m.matriculado_em <= v_inicio_em
    AND (
      (m.status = 'ativa' AND m.encerrado_em IS NULL)
      OR (m.encerrado_em IS NOT NULL AND v_inicio_em < m.encerrado_em)
    )
  ON CONFLICT (aula_id, aluno_id) DO UPDATE
    SET matricula_id = EXCLUDED.matricula_id
    WHERE presencas_aulas.status = 'nao_registrado';
END;
$$;

REVOKE ALL ON FUNCTION public.iniciar_chamada_aula(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_chamada_aula(UUID) TO authenticated, service_role;


-- 7. RPC SALVAR CHAMADA AULA (INTERVALO SEMIABERTO UNIFICADO)
CREATE OR REPLACE FUNCTION public.salvar_chamada_aula(
  p_aula_id UUID,
  p_chamada JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_aula RECORD;
  v_role public.user_role;
  v_uid UUID;
  v_item JSONB;
  v_aluno_id UUID;
  v_status TEXT;
  v_justificativa TEXT;
  v_obs_pedagogica TEXT;
  v_matricula_id UUID;
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

  SELECT * INTO v_aula FROM public.aulas WHERE id = p_aula_id;
  IF v_aula.id IS NULL THEN
    RAISE EXCEPTION 'AULA_NAO_ENCONTRADA: Aula nao encontrada.';
  END IF;

  IF v_aula.status = 'cancelada' THEN
    RAISE EXCEPTION 'AULA_CANCELADA: Nao e possivel registrar chamada em aula cancelada.';
  END IF;

  IF v_role = 'aluno' THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Aluno nao possui permissao para registrar chamada.';
  END IF;

  IF v_role = 'professor' AND public.get_current_professor_id() != v_aula.professor_id THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: O professor nao pode registrar chamada em aula de outro docente.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_chamada)
  LOOP
    v_aluno_id := (v_item->>'aluno_id')::UUID;
    v_status := v_item->>'status';
    v_justificativa := v_item->>'justificativa';
    v_obs_pedagogica := v_item->>'observacao_pedagogica';

    IF v_status NOT IN ('nao_registrado', 'presente', 'ausente', 'justificado') THEN
      RAISE EXCEPTION 'STATUS_PRESENCA_INVALIDO: Status "%" invalido.', v_status;
    END IF;

    IF v_status = 'justificado' AND (v_justificativa IS NULL OR length(trim(v_justificativa)) = 0) THEN
      RAISE EXCEPTION 'JUSTIFICATIVA_OBRIGATORIA: Presencas justificadas exigem preenchimento de justificativa.';
    END IF;

    -- Localiza matrícula válida para a data da aula (intervalo semiaberto unificado)
    SELECT id INTO v_matricula_id
    FROM public.matriculas_turmas
    WHERE turma_id = v_aula.turma_id
      AND aluno_id = v_aluno_id
      AND matriculado_em <= v_aula.inicio_em
      AND (
        (status = 'ativa' AND encerrado_em IS NULL)
        OR (encerrado_em IS NOT NULL AND v_aula.inicio_em < encerrado_em)
      )
    LIMIT 1;

    IF v_matricula_id IS NULL THEN
      RAISE EXCEPTION 'ALUNO_NAO_MATRICULADO_TEMPORAL: Aluno % nao estava matriculado ativamente no inicio da aula.', v_aluno_id;
    END IF;

    INSERT INTO public.presencas_aulas (
      aula_id, aluno_id, matricula_id, status, justificativa,
      observacao_pedagogica, registrado_por, registrado_em
    ) VALUES (
      p_aula_id, v_aluno_id, v_matricula_id, v_status, v_justificativa,
      v_obs_pedagogica, v_uid, timezone('utc'::text, now())
    )
    ON CONFLICT (aula_id, aluno_id) DO UPDATE SET
      status = EXCLUDED.status,
      justificativa = EXCLUDED.justificativa,
      observacao_pedagogica = EXCLUDED.observacao_pedagogica,
      registrado_por = EXCLUDED.registrado_por,
      registrado_em = EXCLUDED.registrado_em,
      updated_at = timezone('utc'::text, now());
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_chamada_aula(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_chamada_aula(UUID, JSONB) TO authenticated, service_role;


-- 8. RPC CONCLUIR AULA (INTERVALO SEMIABERTO UNIFICADO)
CREATE OR REPLACE FUNCTION public.concluir_aula(
  p_aula_id UUID,
  p_confirmar_pendencias BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_aula RECORD;
  v_role public.user_role;
  v_uid UUID;
  v_pendencias INT;
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

  SELECT * INTO v_aula FROM public.aulas WHERE id = p_aula_id;
  IF v_aula.id IS NULL THEN
    RAISE EXCEPTION 'AULA_NAO_ENCONTRADA: Aula nao encontrada.';
  END IF;

  IF v_aula.status = 'cancelada' THEN
    RAISE EXCEPTION 'AULA_CANCELADA: Nao e possivel concluir uma aula cancelada.';
  END IF;

  IF v_aula.status = 'concluida' THEN
    RETURN;
  END IF;

  IF v_role = 'aluno' THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Aluno nao possui permissao para concluir aula.';
  END IF;

  IF v_role = 'professor' AND public.get_current_professor_id() != v_aula.professor_id THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: O professor nao pode concluir aula de outro docente.';
  END IF;

  -- Conta presenças pendentes (nao_registrado) apenas para alunos temporalmente matriculados
  SELECT COUNT(*) INTO v_pendencias
  FROM public.presencas_aulas pa
  JOIN public.matriculas_turmas m ON m.turma_id = v_aula.turma_id AND m.aluno_id = pa.aluno_id
  WHERE pa.aula_id = p_aula_id
    AND pa.status = 'nao_registrado'
    AND m.matriculado_em <= v_aula.inicio_em
    AND (
      (m.status = 'ativa' AND m.encerrado_em IS NULL)
      OR (m.encerrado_em IS NOT NULL AND v_aula.inicio_em < m.encerrado_em)
    );

  IF v_pendencias > 0 AND NOT COALESCE(p_confirmar_pendencias, false) THEN
    RAISE EXCEPTION 'EXISTEM_PENDENCIAS_PRESENCA: Ha % presenca(s) com status nao_registrado. O encerramento exige confirmacao explicita.', v_pendencias;
  END IF;

  IF v_pendencias > 0 AND COALESCE(p_confirmar_pendencias, false) THEN
    UPDATE public.aulas SET
      status = 'concluida',
      concluida_em = timezone('utc'::text, now()),
      concluida_por = v_uid,
      pendencias_presenca_confirmadas_em = timezone('utc'::text, now()),
      pendencias_presenca_confirmadas_por = v_uid,
      updated_at = timezone('utc'::text, now())
    WHERE id = p_aula_id;

    INSERT INTO public.auditoria_logs (
      ator_id, ator_role, acao, entidade, identificador_entidade,
      valores_anteriores, valores_posteriores, metadados
    ) VALUES (
      v_uid, v_role::text, 'CONCLUSAO_AULA_COM_PENDENCIAS', 'aulas', p_aula_id::text,
      jsonb_build_object('status_anterior', v_aula.status),
      jsonb_build_object('status_novo', 'concluida', 'pendencias_confirmadas', v_pendencias),
      jsonb_build_object('origem', 'rpc_concluir_aula')
    );
  ELSE
    UPDATE public.aulas SET
      status = 'concluida',
      concluida_em = timezone('utc'::text, now()),
      concluida_por = v_uid,
      updated_at = timezone('utc'::text, now())
    WHERE id = p_aula_id;

    INSERT INTO public.auditoria_logs (
      ator_id, ator_role, acao, entidade, identificador_entidade,
      valores_anteriores, valores_posteriores, metadados
    ) VALUES (
      v_uid, v_role::text, 'CONCLUSAO_AULA', 'aulas', p_aula_id::text,
      jsonb_build_object('status_anterior', v_aula.status),
      jsonb_build_object('status_novo', 'concluida'),
      jsonb_build_object('origem', 'rpc_concluir_aula')
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.concluir_aula(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.concluir_aula(UUID, BOOLEAN) TO authenticated, service_role;


-- 9. RPC CALCULAR FREQUÊNCIA ALUNO (INTERVALO SEMIABERTO UNIFICADO)
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
  IF v_role IS NULL AND current_user = 'postgres' THEN
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
  -- Inelegíveis e registros fora da janela da matrícula NÃO contaminam a contagem
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


-- 10. REFORÇO DE PRIVACIDADE E ACL DAS VIEWS DE ALUNOS
-- Revoga expressamente qualquer privilégio residual de escrita herdado em views públicas
REVOKE ALL ON public.vw_aluno_aulas FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.vw_aluno_presencas FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.vw_aluno_aulas TO authenticated, service_role;
GRANT SELECT ON public.vw_aluno_presencas TO authenticated, service_role;

-- Confirmação de privilégios estritos nas RPCs de consulta do aluno
REVOKE ALL ON FUNCTION public.obter_minhas_aulas_aluno() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obter_minhas_aulas_aluno() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.obter_minhas_presencas_aluno() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obter_minhas_presencas_aluno() TO authenticated, service_role;
