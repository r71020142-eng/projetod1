-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 13 (AUDITORIA FINAL E CORREÇÃO ETAPA 10.3B1)
-- Blindagem de Matrícula Temporal, Concorrência de Alunos Compartilhados,
-- Privacidade de Colunas, Validação de Meeting URL e ACL Estrita
-- ==============================================================================

-- 1. VALIDAÇÃO DE MEETING URL NO BANCO (REJEIÇÃO DE HTTP, JAVASCRIPT, DATA E ESPAÇOS)
ALTER TABLE public.aulas DROP CONSTRAINT IF EXISTS check_aulas_meeting_url;
ALTER TABLE public.aulas ADD CONSTRAINT check_aulas_meeting_url
CHECK (
  meeting_url IS NULL
  OR (
    meeting_url ~* '^https:\/\/[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+(\/[^ ]*)?$'
    AND meeting_url !~* '^(http|javascript|data):'
  )
);

-- 2. FUNÇÃO AUXILIAR RLS COM INTERVALO TEMPORAL SEMIABERTO PADRONIZADO
-- Intervalo: matriculado_em <= aula.inicio_em AND (encerrado_em IS NULL OR aula.inicio_em < encerrado_em)
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
      AND m.status != 'cancelada'
      AND m.matriculado_em <= a.inicio_em
      AND (m.encerrado_em IS NULL OR a.inicio_em < m.encerrado_em)
  );
$$;

-- 3. DETECÇÃO DE CONFLITOS DE ALUNOS COM INTERVALO TEMPORAL SEMIABERTO
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
    AND m1.status != 'cancelada'
    AND m1.matriculado_em <= p_inicio
    AND (m1.encerrado_em IS NULL OR p_inicio < m1.encerrado_em)
    AND m2.status != 'cancelada'
    AND m2.matriculado_em <= a2.inicio_em
    AND (m2.encerrado_em IS NULL OR a2.inicio_em < m2.encerrado_em)
    AND a2.status != 'cancelada'
    AND (p_ignorar_aula_id IS NULL OR a2.id != p_ignorar_aula_id)
    AND (a2.inicio_em < p_fim AND a2.fim_em > p_inicio);
$$;

-- 4. TRIGGER DE INTEGRIDADE DE AULAS COM SERIALIZAÇÃO DETERMINÍSTICA DE ALUNOS E URL
CREATE OR REPLACE FUNCTION public.check_aula_integridade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_conflito_aula_id UUID;
  v_conflito_turma_nome TEXT;
  v_conflito_inicio TIMESTAMPTZ;
  v_conflito_fim TIMESTAMPTZ;
  v_aluno_conflito RECORD;
  v_aluno_lock_id UUID;
  v_prof_status TEXT;
  v_turma_status TEXT;
BEGIN
  -- 1. Imutabilidade de aula concluída
  IF TG_OP = 'UPDATE' AND OLD.status = 'concluida' THEN
    IF NEW.status != 'concluida' THEN
      RAISE EXCEPTION 'AULA_CONCLUIDA_IMUTAVEL: Nao e permitido alterar o status de uma aula ja concluida.';
    END IF;
    IF NEW.turma_id != OLD.turma_id OR NEW.professor_id != OLD.professor_id OR NEW.inicio_em != OLD.inicio_em OR NEW.fim_em != OLD.fim_em THEN
      RAISE EXCEPTION 'AULA_CONCLUIDA_IMUTAVEL: Os dados estruturais (turma, professor, inicio e fim) de uma aula concluida sao imutaveis.';
    END IF;
  END IF;

  -- 2. Imutabilidade de aula cancelada
  IF TG_OP = 'UPDATE' AND OLD.status = 'cancelada' THEN
    IF NEW.status != 'cancelada' THEN
      RAISE EXCEPTION 'AULA_CANCELADA_IMUTAVEL: Nao e permitido alterar o status de uma aula cancelada.';
    END IF;
    IF NEW.turma_id != OLD.turma_id OR NEW.professor_id != OLD.professor_id OR NEW.inicio_em != OLD.inicio_em OR NEW.fim_em != OLD.fim_em THEN
      RAISE EXCEPTION 'AULA_CANCELADA_IMUTAVEL: Os dados estruturais de uma aula cancelada sao imutaveis.';
    END IF;
  END IF;

  -- 3. Validação de horário
  IF NEW.fim_em <= NEW.inicio_em THEN
    RAISE EXCEPTION 'HORARIO_INVALIDO: O termino da aula deve ser posterior ao inicio.';
  END IF;

  -- 2. Normalização e Validação de Meeting URL
  IF NEW.meeting_url IS NOT NULL THEN
    NEW.meeting_url := trim(NEW.meeting_url);
    IF NEW.meeting_url = '' THEN
      NEW.meeting_url := NULL;
    ELSE
      IF NEW.meeting_url !~* '^https:\/\/[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+(\/[^ ]*)?$'
         OR NEW.meeting_url ~* '^(http|javascript|data):' THEN
        RAISE EXCEPTION 'URL_MEETING_INVALIDA: A URL da reuniao deve ser um endereco HTTPS valido sem espacos (ex: https://zoom.us/j/...).';
      END IF;
    END IF;
  END IF;

  -- 3. Aulas canceladas não geram conflitos
  IF NEW.status = 'cancelada' THEN
    RETURN NEW;
  END IF;

  -- 4. Validação de status ativo de professor e turma
  SELECT status INTO v_prof_status FROM public.professores WHERE id = NEW.professor_id;
  IF v_prof_status IS NULL OR v_prof_status != 'ativo' THEN
    RAISE EXCEPTION 'PROFESSOR_INATIVO: O professor deve estar com status ativo.';
  END IF;

  SELECT status INTO v_turma_status FROM public.turmas WHERE id = NEW.turma_id;
  IF v_turma_status IS NULL OR v_turma_status NOT IN ('formacao', 'ativa', 'em_andamento') THEN
    RAISE EXCEPTION 'TURMA_INATIVA: A turma deve estar em status formacao, ativa ou em andamento.';
  END IF;

  -- 5. ADVISORY LOCKS DETERMINÍSTICOS CONTRA CONCORRÊNCIA REAL:
  -- Lock 1: Professor
  PERFORM pg_advisory_xact_lock(hashtext('lock_professor_' || NEW.professor_id::text));

  -- Lock 2: Turma
  PERFORM pg_advisory_xact_lock(hashtext('lock_turma_' || NEW.turma_id::text));

  -- Lock 3: Todos os alunos temporalmente ativos na turma na data da aula
  -- Ordenação determinística (aluno_id ASC) para eliminar qualquer risco de deadlock
  FOR v_aluno_lock_id IN
    SELECT aluno_id
    FROM public.matriculas_turmas
    WHERE turma_id = NEW.turma_id
      AND status != 'cancelada'
      AND matriculado_em <= NEW.inicio_em
      AND (encerrado_em IS NULL OR NEW.inicio_em < encerrado_em)
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
    RAISE EXCEPTION 'CONFLITO_HORARIO_PROFESSOR: O professor ja possui outra aula no mesmo horario na turma "%" (de % ate %).',
      v_conflito_turma_nome,
      to_char(v_conflito_inicio AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI'),
      to_char(v_conflito_fim AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');
  END IF;

  -- 7. Validação de conflito dos alunos matriculados
  SELECT * INTO v_aluno_conflito
  FROM public.check_conflito_horario_alunos_turma(
    NEW.turma_id,
    NEW.inicio_em,
    NEW.fim_em,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NULL END
  )
  LIMIT 1;

  IF v_aluno_conflito.aluno_id IS NOT NULL THEN
    RAISE EXCEPTION 'CONFLITO_HORARIO_ALUNO: O aluno % possui outra aula agendada no mesmo horario na turma "%" (de % ate %).',
      v_aluno_conflito.aluno_nome,
      v_aluno_conflito.outra_turma_nome,
      to_char(v_aluno_conflito.inicio_em AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI'),
      to_char(v_aluno_conflito.fim_em AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');
  END IF;

  RETURN NEW;
END;
$$;

-- 5. TRIGGER DE INTEGRIDADE DE PRESENÇAS COM REGRA TEMPORAL SEMIABERTA
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
    AND status != 'cancelada'
    AND matriculado_em <= v_inicio_em
    AND (encerrado_em IS NULL OR v_inicio_em < encerrado_em)
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

-- 6. PRIVACIDADE ESTRITA DE COLUNAS — REMOÇÃO DE SELECT DIRETO DO ALUNO NAS TABELAS BASE
-- RLS protege linhas, não colunas. Portanto, o SELECT direto em public.aulas e public.presencas_aulas
-- é exclusivo para administradores e professores. O aluno acessa apenas pelas Views Sanitizadas.
DROP POLICY IF EXISTS aluno_select_aulas ON public.aulas;
DROP POLICY IF EXISTS aluno_select_own_presenca ON public.presencas_aulas;

-- 7. VIEWS SANITIZADAS DE PROJEÇÃO SEGURA (CAMPO OBSERVACAO E PEDAGOGICA OCULTOS)
-- 7.1. View de Aulas do Aluno (Sem observações internas, cancelada_por, concluida_por)
DROP VIEW IF EXISTS public.vw_aluno_aulas CASCADE;
CREATE OR REPLACE VIEW public.vw_aluno_aulas
WITH (security_invoker = false)
AS
SELECT
  a.id,
  a.turma_id,
  a.professor_id,
  a.serie_id,
  a.inicio_em,
  a.fim_em,
  a.titulo,
  a.meeting_url,
  a.topicos_trabalhados,
  a.status,
  a.created_at,
  a.updated_at
FROM public.aulas a
WHERE (
  public.is_admin()
  OR (public.get_auth_role() = 'professor' AND a.professor_id = public.get_current_professor_id())
  OR (public.get_auth_role() = 'aluno' AND public.aluno_can_view_aula(a.id))
);

-- 7.2. View de Presenças do Aluno (Sem observacao_pedagogica e registrado_por)
DROP VIEW IF EXISTS public.vw_aluno_presencas CASCADE;
CREATE OR REPLACE VIEW public.vw_aluno_presencas
WITH (security_invoker = false)
AS
SELECT
  pa.id,
  pa.aula_id,
  pa.aluno_id,
  pa.matricula_id,
  pa.status,
  pa.justificativa,
  pa.created_at,
  pa.updated_at
FROM public.presencas_aulas pa
WHERE (
  public.is_admin()
  OR (public.get_auth_role() = 'professor' AND public.professor_can_view_aula(pa.aula_id))
  OR (public.get_auth_role() = 'aluno' AND pa.aluno_id = public.get_current_aluno_id() AND public.aluno_can_view_aula(pa.aula_id))
);

GRANT SELECT ON public.vw_aluno_aulas TO authenticated;
GRANT SELECT ON public.vw_aluno_presencas TO authenticated;
REVOKE ALL ON public.vw_aluno_aulas FROM PUBLIC, anon;
REVOKE ALL ON public.vw_aluno_presencas FROM PUBLIC, anon;

-- 8. RPCS SANITIZADAS DE LEITURA DO ALUNO
CREATE OR REPLACE FUNCTION public.obter_minhas_aulas_aluno()
RETURNS SETOF public.vw_aluno_aulas
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT * FROM public.vw_aluno_aulas
  WHERE public.get_auth_role() = 'aluno'
  ORDER BY inicio_em ASC;
$$;

CREATE OR REPLACE FUNCTION public.obter_minhas_presencas_aluno()
RETURNS SETOF public.vw_aluno_presencas
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT * FROM public.vw_aluno_presencas
  WHERE public.get_auth_role() = 'aluno';
$$;

REVOKE ALL ON FUNCTION public.obter_minhas_aulas_aluno() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obter_minhas_aulas_aluno() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.obter_minhas_presencas_aluno() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obter_minhas_presencas_aluno() TO authenticated, service_role;

-- 9. RPCS TRANSACIONAIS COM AUTORIZAÇÃO INTERNA RIGOROSA, TIMEZONE IANA E CICLO DA CHAMADA

-- 9.1. Iniciar Chamada Aula (Regra Semiaberta de Matrícula)
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
    AND m.status != 'cancelada'
    AND m.matriculado_em <= v_inicio_em
    AND (m.encerrado_em IS NULL OR v_inicio_em < m.encerrado_em)
  ON CONFLICT (aula_id, aluno_id) DO UPDATE
    SET matricula_id = EXCLUDED.matricula_id
    WHERE presencas_aulas.status = 'nao_registrado';
END;
$$;

-- 9.2. Agendar Aula Individual
CREATE OR REPLACE FUNCTION public.agendar_aula(
  p_turma_id UUID,
  p_professor_id UUID,
  p_titulo TEXT,
  p_inicio_em TIMESTAMPTZ,
  p_fim_em TIMESTAMPTZ,
  p_meeting_url TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_serie_id UUID DEFAULT NULL
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

  -- Inserção atômica (triggers realizam locks e validação de URL/conflitos)
  INSERT INTO public.aulas (
    turma_id, professor_id, serie_id, titulo,
    inicio_em, fim_em, meeting_url, observacoes,
    status, criado_por
  ) VALUES (
    p_turma_id, p_professor_id, p_serie_id, p_titulo,
    p_inicio_em, p_fim_em, p_meeting_url, p_observacoes,
    'agendada', v_uid
  ) RETURNING id INTO v_aula_id;

  -- Inicializa chamada sincronizada com os alunos temporalmente matriculados
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
      'titulo', p_titulo
    ),
    jsonb_build_object('origem', 'rpc_agendar_aula')
  );

  RETURN v_aula_id;
END;
$$;

-- 9.3. Agendar Série de Aulas Recorrentes com Timezone IANA Válido (sem offset fixo)
DROP FUNCTION IF EXISTS public.agendar_serie_aulas(UUID, UUID, TEXT, INT, TIME, INT, INT, DATE, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.agendar_serie_aulas(
  p_turma_id UUID,
  p_professor_id UUID,
  p_titulo_base TEXT,
  p_dia_semana INT,
  p_horario_local TIME,
  p_duracao_minutos INT,
  p_quantidade_encontros INT,
  p_data_inicio DATE,
  p_meeting_url TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT 'America/Sao_Paulo'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_serie_id UUID;
  v_aula_id UUID;
  v_data_atual DATE;
  v_data_fim DATE;
  v_inicio TIMESTAMPTZ;
  v_fim TIMESTAMPTZ;
  v_titulo TEXT;
  i INT;
  v_diff INT;
  v_role public.user_role;
  v_uid UUID;
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
    RAISE EXCEPTION 'ACESSO_NEGADO: Aluno nao possui permissao para agendar series.';
  END IF;

  IF v_role = 'professor' AND public.get_current_professor_id() != p_professor_id THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: O professor nao pode agendar serie para outro docente.';
  END IF;

  IF p_quantidade_encontros < 1 OR p_quantidade_encontros > 24 THEN
    RAISE EXCEPTION 'QUANTIDADE_INVALIDA: A quantidade de encontros deve ser entre 1 e 24.';
  END IF;

  -- Validação estrita do timezone IANA no catálogo do PostgreSQL
  IF p_timezone IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN
    RAISE EXCEPTION 'TIMEZONE_INVALIDO: O fuso horario "%" nao e valido ou reconhecido pelo sistema.', p_timezone;
  END IF;

  -- Ajusta primeira data para o dia_semana correto, se necessário
  v_diff := (p_dia_semana - extract(dow from p_data_inicio)::int + 7) % 7;
  v_data_atual := p_data_inicio + v_diff;
  v_data_fim := v_data_atual + ((p_quantidade_encontros - 1) * 7);

  -- Pré-validação rigorosa de conflitos para todos os encontros antes de persistir
  FOR i IN 0..(p_quantidade_encontros - 1) LOOP
    -- Conversão dinâmica IANA do horário civil local sem offset numérico fixo
    v_inicio := ( (v_data_atual + (i * 7)) + p_horario_local ) AT TIME ZONE p_timezone;
    v_fim := v_inicio + (p_duracao_minutos || ' minutes')::interval;

    -- Conflito professor
    IF EXISTS (
      SELECT 1 FROM public.check_conflito_horario_professor(p_professor_id, v_inicio, v_fim)
    ) THEN
      RAISE EXCEPTION 'CONFLITO_SERIE_PROFESSOR: Conflito detectado no encontro #% (%) para o professor.',
        (i + 1), to_char(v_inicio AT TIME ZONE p_timezone, 'YYYY-MM-DD HH24:MI');
    END IF;

    -- Conflito alunos da turma
    IF EXISTS (
      SELECT 1 FROM public.check_conflito_horario_alunos_turma(p_turma_id, v_inicio, v_fim)
    ) THEN
      RAISE EXCEPTION 'CONFLITO_SERIE_ALUNO: Conflito detectado no encontro #% (%) para alunos da turma.',
        (i + 1), to_char(v_inicio AT TIME ZONE p_timezone, 'YYYY-MM-DD HH24:MI');
    END IF;
  END LOOP;

  -- Cria o registro da série
  INSERT INTO public.series_aulas (
    turma_id, professor_id, dia_semana, horario_local, duracao_minutos,
    timezone, data_inicio, data_fim, status, criado_por
  ) VALUES (
    p_turma_id, p_professor_id, p_dia_semana, p_horario_local, p_duracao_minutos,
    p_timezone, v_data_atual, v_data_fim, 'ativa', v_uid
  ) RETURNING id INTO v_serie_id;

  -- Gera cada aula vinculada à série
  FOR i IN 0..(p_quantidade_encontros - 1) LOOP
    v_inicio := ( (v_data_atual + (i * 7)) + p_horario_local ) AT TIME ZONE p_timezone;
    v_fim := v_inicio + (p_duracao_minutos || ' minutes')::interval;
    v_titulo := p_titulo_base || ' (' || (i + 1) || '/' || p_quantidade_encontros || ')';

    INSERT INTO public.aulas (
      turma_id, serie_id, professor_id, inicio_em, fim_em,
      status, titulo, meeting_url, observacoes, criado_por
    ) VALUES (
      p_turma_id, v_serie_id, p_professor_id, v_inicio, v_fim,
      'agendada', v_titulo, p_meeting_url, p_observacoes, v_uid
    ) RETURNING id INTO v_aula_id;

    PERFORM public.iniciar_chamada_aula(v_aula_id);
  END LOOP;

  -- Auditoria
  INSERT INTO public.auditoria_logs (
    ator_id, ator_role, acao, entidade, identificador_entidade,
    valores_anteriores, valores_posteriores, metadados
  ) VALUES (
    v_uid, v_role::text, 'AGENDAMENTO_SERIE_AULAS', 'series_aulas', v_serie_id::text,
    NULL,
    jsonb_build_object(
      'turma_id', p_turma_id,
      'professor_id', p_professor_id,
      'quantidade_encontros', p_quantidade_encontros,
      'timezone', p_timezone,
      'data_inicio', v_data_atual,
      'data_fim', v_data_fim
    ),
    jsonb_build_object('origem', 'rpc_agendar_serie_aulas')
  );

  RETURN v_serie_id;
END;
$$;

-- 9.4. Reagendar Aula (Permitido estritamente para status 'agendada')
CREATE OR REPLACE FUNCTION public.reagendar_aula(
  p_aula_id UUID,
  p_novo_inicio TIMESTAMPTZ,
  p_novo_fim TIMESTAMPTZ,
  p_motivo TEXT DEFAULT NULL
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

  SELECT * INTO v_aula FROM public.aulas WHERE id = p_aula_id FOR UPDATE;

  IF v_aula.id IS NULL THEN
    RAISE EXCEPTION 'AULA_NAO_ENCONTRADA: Aula nao encontrada.';
  END IF;

  -- Aulas em andamento, concluídas ou canceladas não podem ser reagendadas
  IF v_aula.status != 'agendada' THEN
    RAISE EXCEPTION 'STATUS_INVALIDO: Apenas aulas no status agendada podem ser reagendadas. Aulas em andamento, concluidas ou canceladas nao podem ser reagendadas.';
  END IF;

  IF v_role = 'aluno' THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Aluno nao possui permissao para reagendar aulas.';
  END IF;

  IF v_role = 'professor' AND public.get_current_professor_id() != v_aula.professor_id THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: O professor nao pode reagendar aula de outro docente.';
  END IF;

  -- Atualização (dispara triggers de integridade, lock de alunos e conflito)
  UPDATE public.aulas SET
    inicio_em = p_novo_inicio,
    fim_em = p_novo_fim,
    observacoes = CASE
      WHEN p_motivo IS NOT NULL AND length(trim(p_motivo)) > 0 THEN
        COALESCE(observacoes || E'\n', '') || 'Reagendada: ' || p_motivo
      ELSE observacoes
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_aula_id;

  -- Re-alinha participantes da chamada de acordo com a nova data
  PERFORM public.iniciar_chamada_aula(p_aula_id);

  -- Auditoria
  INSERT INTO public.auditoria_logs (
    ator_id, ator_role, acao, entidade, identificador_entidade,
    valores_anteriores, valores_posteriores, metadados
  ) VALUES (
    v_uid, v_role::text, 'REAGENDAMENTO_AULA', 'aulas', p_aula_id::text,
    jsonb_build_object('inicio_em', v_aula.inicio_em, 'fim_em', v_aula.fim_em),
    jsonb_build_object('inicio_em', p_novo_inicio, 'fim_em', p_novo_fim, 'motivo', p_motivo),
    jsonb_build_object('origem', 'rpc_reagendar_aula')
  );
END;
$$;

-- 9.5. Cancelar Aula
CREATE OR REPLACE FUNCTION public.cancelar_aula(
  p_aula_id UUID,
  p_motivo TEXT
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

  IF p_motivo IS NULL OR length(trim(p_motivo)) = 0 THEN
    RAISE EXCEPTION 'MOTIVO_OBRIGATORIO: O motivo do cancelamento deve ser informado.';
  END IF;

  SELECT * INTO v_aula FROM public.aulas WHERE id = p_aula_id FOR UPDATE;

  IF v_aula.id IS NULL THEN
    RAISE EXCEPTION 'AULA_NAO_ENCONTRADA: Aula nao encontrada.';
  END IF;

  IF v_aula.status = 'cancelada' THEN
    RAISE EXCEPTION 'AULA_JA_CANCELADA: Esta aula ja se encontra cancelada.';
  END IF;

  IF v_aula.status = 'concluida' THEN
    RAISE EXCEPTION 'AULA_JA_CONCLUIDA: Nao e possivel cancelar uma aula concluida.';
  END IF;

  IF v_role = 'aluno' THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Aluno nao possui permissao para cancelar aulas.';
  END IF;

  IF v_role = 'professor' AND public.get_current_professor_id() != v_aula.professor_id THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: O professor nao pode cancelar aula de outro docente.';
  END IF;

  UPDATE public.aulas SET
    status = 'cancelada',
    motivo_cancelamento = p_motivo,
    cancelada_em = timezone('utc'::text, now()),
    cancelada_por = v_uid,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_aula_id;

  INSERT INTO public.auditoria_logs (
    ator_id, ator_role, acao, entidade, identificador_entidade,
    valores_anteriores, valores_posteriores, metadados
  ) VALUES (
    v_uid, v_role::text, 'CANCELAMENTO_AULA', 'aulas', p_aula_id::text,
    jsonb_build_object('status', v_aula.status),
    jsonb_build_object('status', 'cancelada', 'motivo', p_motivo),
    jsonb_build_object('origem', 'rpc_cancelar_aula')
  );
END;
$$;

-- 9.6. Salvar Chamada Aula
CREATE OR REPLACE FUNCTION public.salvar_chamada_aula(
  p_aula_id UUID,
  p_presencas JSONB,
  p_topico_trabalhado TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_aula RECORD;
  v_item JSONB;
  v_aluno_id UUID;
  v_status TEXT;
  v_justificativa TEXT;
  v_obs_pedagogica TEXT;
  v_matricula_id UUID;
  v_role public.user_role;
  v_uid UUID;
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
    RAISE EXCEPTION 'ACESSO_NEGADO: Aluno nao possui permissao para salvar chamada.';
  END IF;

  IF v_role = 'professor' AND public.get_current_professor_id() != v_aula.professor_id THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: O professor nao pode salvar chamada de aula de outro docente.';
  END IF;

  -- Processa cada presença do payload
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_presencas) LOOP
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

    -- Localiza matrícula válida para a data da aula
    SELECT id INTO v_matricula_id
    FROM public.matriculas_turmas
    WHERE turma_id = v_aula.turma_id
      AND aluno_id = v_aluno_id
      AND status != 'cancelada'
      AND matriculado_em <= v_aula.inicio_em
      AND (encerrado_em IS NULL OR v_aula.inicio_em < encerrado_em)
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
      matricula_id = EXCLUDED.matricula_id,
      status = EXCLUDED.status,
      justificativa = EXCLUDED.justificativa,
      observacao_pedagogica = EXCLUDED.observacao_pedagogica,
      registrado_por = EXCLUDED.registrado_por,
      registrado_em = EXCLUDED.registrado_em,
      updated_at = timezone('utc'::text, now());
  END LOOP;

  -- Atualiza anotações pedagógicas da aula
  UPDATE public.aulas SET
    topicos_trabalhados = COALESCE(p_topico_trabalhado, topicos_trabalhados),
    observacoes = COALESCE(p_observacoes, observacoes),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_aula_id;

  -- Auditoria
  INSERT INTO public.auditoria_logs (
    ator_id, ator_role, acao, entidade, identificador_entidade,
    valores_anteriores, valores_posteriores, metadados
  ) VALUES (
    v_uid, v_role::text, 'REGISTRO_CHAMADA', 'aulas', p_aula_id::text,
    NULL,
    jsonb_build_object('total_registros', jsonb_array_length(p_presencas)),
    jsonb_build_object('origem', 'rpc_salvar_chamada_aula')
  );
END;
$$;

-- 9.7. Concluir Aula
CREATE OR REPLACE FUNCTION public.concluir_aula(
  p_aula_id UUID,
  p_confirmar_pendencias BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_aula RECORD;
  v_pendencias INT;
  v_role public.user_role;
  v_uid UUID;
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

  SELECT * INTO v_aula FROM public.aulas WHERE id = p_aula_id FOR UPDATE;

  IF v_aula.id IS NULL THEN
    RAISE EXCEPTION 'AULA_NAO_ENCONTRADA: Aula nao encontrada.';
  END IF;

  IF v_aula.status = 'cancelada' THEN
    RAISE EXCEPTION 'AULA_CANCELADA: Nao e possivel concluir uma aula cancelada.';
  END IF;

  IF v_aula.status = 'concluida' THEN
    RETURN; -- Idempotência
  END IF;

  IF v_role = 'aluno' THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Aluno nao possui permissao para concluir aulas.';
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
    AND m.status != 'cancelada'
    AND m.matriculado_em <= v_aula.inicio_em
    AND (m.encerrado_em IS NULL OR v_aula.inicio_em < m.encerrado_em);

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

-- 9.8. Calcular Frequência Aluno (Autorização Interna e Regra Temporal Rigorosa)
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
  -- Inelegíveis e registros de matrículas canceladas NÃO contaminam a contagem
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
    AND m.status != 'cancelada'
    AND m.matriculado_em <= a.inicio_em
    AND (m.encerrado_em IS NULL OR a.inicio_em < m.encerrado_em)
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

-- 10. ACL ESTREITA DE FUNÇÕES (REVOGAÇÕES E CONCESSÕES RIGOROSAS)
-- 10.1. Funções de trigger NÃO devem possuir grant direto para authenticated
REVOKE ALL ON FUNCTION public.prevent_agenda_physical_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_aula_integridade() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_presenca_integridade() FROM PUBLIC, anon, authenticated;

-- 10.2. RPCs expostas recebem EXECUTE exclusivamente para authenticated e service_role
REVOKE ALL ON FUNCTION public.agendar_aula(UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agendar_aula(UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.agendar_serie_aulas(UUID, UUID, TEXT, INT, TIME, INT, INT, DATE, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agendar_serie_aulas(UUID, UUID, TEXT, INT, TIME, INT, INT, DATE, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.reagendar_aula(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reagendar_aula(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.cancelar_aula(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_aula(UUID, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.iniciar_chamada_aula(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_chamada_aula(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.salvar_chamada_aula(UUID, JSONB, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_chamada_aula(UUID, JSONB, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.concluir_aula(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.concluir_aula(UUID, BOOLEAN) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.calcular_frequencia_aluno(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calcular_frequencia_aluno(UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.aluno_can_view_aula(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aluno_can_view_aula(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_conflito_horario_alunos_turma(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_conflito_horario_alunos_turma(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated, service_role;
