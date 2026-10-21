-- ==============================================================================
-- DEMOSTRATIVO MTD — MIGRAÇÃO 12 (ETAPA 10.3B1)
-- Fundação de Banco e Domínio para Agenda, Aulas e Presenças
--
-- Objetivos:
-- 1. Criação das tabelas relacionais public.series_aulas, public.aulas e
--    public.presencas_aulas com integridade referencial e constraints rigorosas.
-- 2. Regra temporal estrita de matrícula para participantes da chamada.
-- 3. Detecção e bloqueio de conflitos de horário para professor e alunos
--    (startA < endB AND startB < endA) com suporte a horários contíguos.
-- 4. Proteção contra exclusão física (REVOKE DELETE + triggers de bloqueio).
-- 5. Imutabilidade de aulas concluídas e canceladas.
-- 6. RPCs transacionais seguras (agendar_aula, agendar_serie_aulas, reagendar_aula,
--    cancelar_aula, iniciar_chamada_aula, salvar_chamada_aula, concluir_aula,
--    calcular_frequencia_aluno).
-- 7. Políticas RLS sem recursão e isolamento de privacidade de presenças
--    (aluno enxerga estritamente a própria linha de presença).
-- 8. Auditoria de operações em public.auditoria_logs.
-- 9. ACL estrita (REVOKE ALL FROM PUBLIC, anon em todas as funções e tabelas).
-- ==============================================================================

-- 1. TABELAS CENTRAIS DA AGENDA

-- 1.1. Séries Recorrentes de Aulas
CREATE TABLE IF NOT EXISTS public.series_aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE RESTRICT,
  professor_id UUID NOT NULL REFERENCES public.professores(id) ON DELETE RESTRICT,
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  horario_local TIME NOT NULL,
  duracao_minutos INT NOT NULL CHECK (duracao_minutos > 0),
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'cancelada', 'concluida')),
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_series_data_fim CHECK (data_fim >= data_inicio)
);

-- 1.2. Aulas
CREATE TABLE IF NOT EXISTS public.aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE RESTRICT,
  serie_id UUID REFERENCES public.series_aulas(id) ON DELETE RESTRICT,
  professor_id UUID NOT NULL REFERENCES public.professores(id) ON DELETE RESTRICT,
  inicio_em TIMESTAMPTZ NOT NULL,
  fim_em TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'concluida', 'cancelada')),
  titulo TEXT NOT NULL,
  meeting_url TEXT CHECK (meeting_url IS NULL OR meeting_url ~* '^https://'),
  topicos_trabalhados TEXT,
  observacoes TEXT,
  motivo_cancelamento TEXT,
  concluida_em TIMESTAMPTZ,
  concluida_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pendencias_presenca_confirmadas_em TIMESTAMPTZ,
  pendencias_presenca_confirmadas_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_aulas_fim_maior_inicio CHECK (fim_em > inicio_em)
);

-- 1.3. Presenças nas Aulas (Normalizado N:N)
CREATE TABLE IF NOT EXISTS public.presencas_aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id UUID NOT NULL REFERENCES public.aulas(id) ON DELETE RESTRICT,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE RESTRICT,
  matricula_id UUID NOT NULL REFERENCES public.matriculas_turmas(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'nao_registrado' CHECK (status IN ('nao_registrado', 'presente', 'ausente', 'justificado')),
  justificativa TEXT,
  observacao_pedagogica TEXT,
  registrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  registrado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_presencas_aulas_aula_aluno UNIQUE (aula_id, aluno_id),
  CONSTRAINT chk_presencas_justificativa CHECK (
    status != 'justificado' OR (justificativa IS NOT NULL AND length(trim(justificativa)) > 0)
  )
);

-- 1.4. Índices para Otimização e Consultas Frequentes
CREATE INDEX IF NOT EXISTS idx_series_aulas_turma ON public.series_aulas(turma_id);
CREATE INDEX IF NOT EXISTS idx_series_aulas_professor ON public.series_aulas(professor_id);
CREATE INDEX IF NOT EXISTS idx_aulas_turma ON public.aulas(turma_id);
CREATE INDEX IF NOT EXISTS idx_aulas_professor ON public.aulas(professor_id);
CREATE INDEX IF NOT EXISTS idx_aulas_serie ON public.aulas(serie_id);
CREATE INDEX IF NOT EXISTS idx_aulas_inicio_fim ON public.aulas(inicio_em, fim_em);
CREATE INDEX IF NOT EXISTS idx_aulas_status ON public.aulas(status);
CREATE INDEX IF NOT EXISTS idx_presencas_aulas_aula ON public.presencas_aulas(aula_id);
CREATE INDEX IF NOT EXISTS idx_presencas_aulas_aluno ON public.presencas_aulas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_presencas_aulas_matricula ON public.presencas_aulas(matricula_id);


-- 2. BLOQUEIO DE EXCLUSÃO FÍSICA E IMUTABILIDADE

-- 2.1. Revogação de DELETE de todos os papéis de cliente
REVOKE DELETE ON public.series_aulas FROM PUBLIC, anon, authenticated;
REVOKE DELETE ON public.aulas FROM PUBLIC, anon, authenticated;
REVOKE DELETE ON public.presencas_aulas FROM PUBLIC, anon, authenticated;

-- 2.2. Função Trigger de Bloqueio Físico
CREATE OR REPLACE FUNCTION public.prevent_agenda_physical_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') OR auth.role() IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'EXCLUSAO_FISICA_PROIBIDA: A exclusao fisica em % e proibida por questoes de rastreabilidade historica e auditoria. Utilize cancelamento ou desativacao.', TG_TABLE_NAME;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_delete_series ON public.series_aulas;
CREATE TRIGGER trg_prevent_delete_series
BEFORE DELETE ON public.series_aulas
FOR EACH ROW EXECUTE FUNCTION public.prevent_agenda_physical_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_aulas ON public.aulas;
CREATE TRIGGER trg_prevent_delete_aulas
BEFORE DELETE ON public.aulas
FOR EACH ROW EXECUTE FUNCTION public.prevent_agenda_physical_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_presencas ON public.presencas_aulas;
CREATE TRIGGER trg_prevent_delete_presencas
BEFORE DELETE ON public.presencas_aulas
FOR EACH ROW EXECUTE FUNCTION public.prevent_agenda_physical_delete();


-- 3. FUNÇÕES DE VERIFICAÇÃO DE CONFLITOS DE HORÁRIO

-- 3.1. Conflito do Professor (intervalos sobrepostos: startA < endB AND startB < endA)
CREATE OR REPLACE FUNCTION public.check_conflito_horario_professor(
  p_professor_id UUID,
  p_inicio TIMESTAMPTZ,
  p_fim TIMESTAMPTZ,
  p_ignorar_aula_id UUID DEFAULT NULL
)
RETURNS TABLE (
  aula_id UUID,
  turma_id UUID,
  turma_nome TEXT,
  inicio_em TIMESTAMPTZ,
  fim_em TIMESTAMPTZ
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT a.id, t.id, t.nome, a.inicio_em, a.fim_em
  FROM public.aulas a
  JOIN public.turmas t ON t.id = a.turma_id
  WHERE a.professor_id = p_professor_id
    AND a.status != 'cancelada'
    AND (p_ignorar_aula_id IS NULL OR a.id != p_ignorar_aula_id)
    AND (a.inicio_em < p_fim AND a.fim_em > p_inicio);
$$;

-- 3.2. Conflito dos Alunos da Turma em Outras Turmas
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
    AND (m1.encerrado_em IS NULL OR m1.encerrado_em > p_inicio)
    AND m2.status != 'cancelada'
    AND m2.matriculado_em <= a2.inicio_em
    AND (m2.encerrado_em IS NULL OR m2.encerrado_em > a2.inicio_em)
    AND a2.status != 'cancelada'
    AND (p_ignorar_aula_id IS NULL OR a2.id != p_ignorar_aula_id)
    AND (a2.inicio_em < p_fim AND a2.fim_em > p_inicio);
$$;


-- 4. TRIGGERS DE INTEGRIDADE E IMUTABILIDADE

-- 4.1. Trigger de Integridade de Aulas (escritas diretas e imutabilidade)
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
  v_conflito_aluno_nome TEXT;
  v_prof_status TEXT;
  v_turma_status TEXT;
BEGIN
  -- Se for UPDATE em aula previamente cancelada:
  IF TG_OP = 'UPDATE' AND OLD.status = 'cancelada' THEN
    RAISE EXCEPTION 'AULA_CANCELADA_IMUTAVEL: Aulas canceladas nao podem ser modificadas.';
  END IF;

  -- Se for UPDATE em aula previamente concluída:
  IF TG_OP = 'UPDATE' AND OLD.status = 'concluida' THEN
    IF NEW.status != 'concluida' THEN
      RAISE EXCEPTION 'AULA_CONCLUIDA_IMUTAVEL: Nao e permitido alterar o status de uma aula ja concluida.';
    END IF;
    IF NEW.turma_id != OLD.turma_id OR NEW.professor_id != OLD.professor_id OR
       NEW.inicio_em != OLD.inicio_em OR NEW.fim_em != OLD.fim_em THEN
      RAISE EXCEPTION 'AULA_CONCLUIDA_IMUTAVEL: Os dados estruturais (turma, professor, inicio e fim) de uma aula concluida sao imutaveis.';
    END IF;
  END IF;

  -- Se a aula for agendada ou concluída, valida integridade de horários e conflitos
  IF NEW.status != 'cancelada' THEN
    -- Validação do intervalo
    IF NEW.fim_em <= NEW.inicio_em THEN
      RAISE EXCEPTION 'INTERVALO_INVALIDO: O horario de termino deve ser posterior ao inicio.';
    END IF;

    -- Validação de meeting_url
    IF NEW.meeting_url IS NOT NULL AND NEW.meeting_url !~* '^https://' THEN
      RAISE EXCEPTION 'URL_INVALIDA: O link da reuniao deve ser uma URL segura iniciando com https://';
    END IF;

    -- Validação de professor ativo
    SELECT status INTO v_prof_status FROM public.professores WHERE id = NEW.professor_id;
    IF v_prof_status != 'ativo' THEN
      RAISE EXCEPTION 'PROFESSOR_INATIVO: O professor deve estar ativo para ser associado a aula.';
    END IF;

    -- Validação de turma ativa
    SELECT status INTO v_turma_status FROM public.turmas WHERE id = NEW.turma_id;
    IF v_turma_status NOT IN ('formacao', 'ativa', 'em_andamento') THEN
      RAISE EXCEPTION 'TURMA_INATIVA: Nao e possivel agendar aulas para turmas com status "%".', v_turma_status;
    END IF;

    -- Verificação de conflito do professor (somente se horário ou professor mudou)
    IF TG_OP = 'INSERT' OR (NEW.inicio_em != OLD.inicio_em OR NEW.fim_em != OLD.fim_em OR NEW.professor_id != OLD.professor_id) THEN
      SELECT c.aula_id, c.turma_nome, c.inicio_em, c.fim_em
      INTO v_conflito_aula_id, v_conflito_turma_nome, v_conflito_inicio, v_conflito_fim
      FROM public.check_conflito_horario_professor(NEW.professor_id, NEW.inicio_em, NEW.fim_em, CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NULL END) c
      LIMIT 1;

      IF v_conflito_aula_id IS NOT NULL THEN
        RAISE EXCEPTION 'CONFLITO_HORARIO_PROFESSOR: Professor ja possui aula agendada na turma "%" entre % e %.',
          v_conflito_turma_nome,
          to_char(v_conflito_inicio AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI'),
          to_char(v_conflito_fim AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');
      END IF;

      -- Verificação de conflito de alunos da turma
      SELECT c.aluno_nome, c.outra_turma_nome, c.inicio_em, c.fim_em
      INTO v_conflito_aluno_nome, v_conflito_turma_nome, v_conflito_inicio, v_conflito_fim
      FROM public.check_conflito_horario_alunos_turma(NEW.turma_id, NEW.inicio_em, NEW.fim_em, CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NULL END) c
      LIMIT 1;

      IF v_conflito_aluno_nome IS NOT NULL THEN
        RAISE EXCEPTION 'CONFLITO_HORARIO_ALUNO: O aluno "%" ja possui aula agendada na turma "%" entre % e %.',
          v_conflito_aluno_nome,
          v_conflito_turma_nome,
          to_char(v_conflito_inicio AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI'),
          to_char(v_conflito_fim AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI');
      END IF;
    END IF;
  END IF;

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_aula_integridade ON public.aulas;
CREATE TRIGGER trg_check_aula_integridade
BEFORE INSERT OR UPDATE ON public.aulas
FOR EACH ROW EXECUTE FUNCTION public.check_aula_integridade();

-- 4.2. Trigger de Integridade e Auditoria de Presenças
CREATE OR REPLACE FUNCTION public.check_presenca_integridade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_aula_status TEXT;
  v_inicio_em TIMESTAMPTZ;
  v_turma_id UUID;
  v_matricula_id UUID;
  v_ator_id UUID;
  v_ator_role TEXT;
BEGIN
  SELECT status, inicio_em, turma_id
  INTO v_aula_status, v_inicio_em, v_turma_id
  FROM public.aulas WHERE id = NEW.aula_id;

  IF v_aula_status IS NULL THEN
    RAISE EXCEPTION 'AULA_NAO_ENCONTRADA: Aula vinculada nao existe.';
  END IF;

  IF v_aula_status = 'cancelada' THEN
    RAISE EXCEPTION 'AULA_CANCELADA: Nao e permitido registrar ou modificar presencas em aula cancelada.';
  END IF;

  -- Regra Temporal Estrita de Matrícula:
  -- O aluno participa da chamada se matrícula iniciada <= início da aula E (ativa OU encerramento > início da aula)
  SELECT id INTO v_matricula_id
  FROM public.matriculas_turmas
  WHERE turma_id = v_turma_id
    AND aluno_id = NEW.aluno_id
    AND status != 'cancelada'
    AND matriculado_em <= v_inicio_em
    AND (encerrado_em IS NULL OR encerrado_em > v_inicio_em)
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

DROP TRIGGER IF EXISTS trg_check_presenca_integridade ON public.presencas_aulas;
CREATE TRIGGER trg_check_presenca_integridade
BEFORE INSERT OR UPDATE ON public.presencas_aulas
FOR EACH ROW EXECUTE FUNCTION public.check_presenca_integridade();


-- 5. FUNÇÕES AUXILIARES DE RLS (SEM RECURSÃO CIRCULAR)

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
      AND (m.encerrado_em IS NULL OR m.encerrado_em > a.inicio_em)
  );
$$;

CREATE OR REPLACE FUNCTION public.professor_can_view_aula(p_aula_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.aulas a
    WHERE a.id = p_aula_id
      AND a.professor_id = public.get_current_professor_id()
  );
$$;


-- 6. POLÍTICAS RLS (ROW LEVEL SECURITY)

ALTER TABLE public.series_aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presencas_aulas ENABLE ROW LEVEL SECURITY;

-- 6.1. RLS public.series_aulas
DROP POLICY IF EXISTS admin_all_series_aulas ON public.series_aulas;
CREATE POLICY admin_all_series_aulas
ON public.series_aulas
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS professor_select_series_aulas ON public.series_aulas;
CREATE POLICY professor_select_series_aulas
ON public.series_aulas
FOR SELECT
TO authenticated
USING (
  public.get_auth_role() = 'professor'
  AND professor_id = public.get_current_professor_id()
);

DROP POLICY IF EXISTS aluno_select_series_aulas ON public.series_aulas;
CREATE POLICY aluno_select_series_aulas
ON public.series_aulas
FOR SELECT
TO authenticated
USING (
  public.get_auth_role() = 'aluno'
  AND public.aluno_has_turma(turma_id)
);

-- 6.2. RLS public.aulas
DROP POLICY IF EXISTS admin_all_aulas ON public.aulas;
CREATE POLICY admin_all_aulas
ON public.aulas
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS professor_select_aulas ON public.aulas;
CREATE POLICY professor_select_aulas
ON public.aulas
FOR SELECT
TO authenticated
USING (
  public.get_auth_role() = 'professor'
  AND professor_id = public.get_current_professor_id()
);

DROP POLICY IF EXISTS professor_update_aulas ON public.aulas;
CREATE POLICY professor_update_aulas
ON public.aulas
FOR UPDATE
TO authenticated
USING (
  public.get_auth_role() = 'professor'
  AND professor_id = public.get_current_professor_id()
  AND status != 'concluida'
)
WITH CHECK (
  public.get_auth_role() = 'professor'
  AND professor_id = public.get_current_professor_id()
);

DROP POLICY IF EXISTS aluno_select_aulas ON public.aulas;
CREATE POLICY aluno_select_aulas
ON public.aulas
FOR SELECT
TO authenticated
USING (
  public.get_auth_role() = 'aluno'
  AND public.aluno_can_view_aula(id)
);

-- 6.3. RLS public.presencas_aulas (Privacidade Total do Aluno)
DROP POLICY IF EXISTS admin_all_presencas ON public.presencas_aulas;
CREATE POLICY admin_all_presencas
ON public.presencas_aulas
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS professor_select_presencas ON public.presencas_aulas;
CREATE POLICY professor_select_presencas
ON public.presencas_aulas
FOR SELECT
TO authenticated
USING (
  public.get_auth_role() = 'professor'
  AND public.professor_can_view_aula(aula_id)
);

DROP POLICY IF EXISTS professor_update_presencas ON public.presencas_aulas;
CREATE POLICY professor_update_presencas
ON public.presencas_aulas
FOR UPDATE
TO authenticated
USING (
  public.get_auth_role() = 'professor'
  AND public.professor_can_view_aula(aula_id)
)
WITH CHECK (
  public.get_auth_role() = 'professor'
  AND public.professor_can_view_aula(aula_id)
);

DROP POLICY IF EXISTS professor_insert_presencas ON public.presencas_aulas;
CREATE POLICY professor_insert_presencas
ON public.presencas_aulas
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_auth_role() = 'professor'
  AND public.professor_can_view_aula(aula_id)
);

DROP POLICY IF EXISTS aluno_select_own_presenca ON public.presencas_aulas;
CREATE POLICY aluno_select_own_presenca
ON public.presencas_aulas
FOR SELECT
TO authenticated
USING (
  public.get_auth_role() = 'aluno'
  AND aluno_id = public.get_current_aluno_id()
  AND public.aluno_can_view_aula(aula_id)
);


-- 7. PROCEDURES E FUNÇÕES TRANSACIONAIS (RPCS)

-- 7.1. Iniciar Chamada da Aula (popula com nao_registrado para todos alunos vigentes)
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
BEGIN
  SELECT turma_id, inicio_em, status, professor_id
  INTO v_turma_id, v_inicio_em, v_status, v_prof_id
  FROM public.aulas WHERE id = p_aula_id;

  IF v_turma_id IS NULL THEN
    RAISE EXCEPTION 'AULA_NAO_ENCONTRADA: Aula nao encontrada.';
  END IF;

  IF v_status = 'cancelada' THEN
    RAISE EXCEPTION 'AULA_CANCELADA: Nao e possivel iniciar chamada em aula cancelada.';
  END IF;

  IF NOT public.is_admin() AND (public.get_auth_role() != 'professor' OR public.get_current_professor_id() != v_prof_id) THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Apenas administradores ou o professor responsavel podem iniciar a chamada.';
  END IF;

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
    AND (m.encerrado_em IS NULL OR m.encerrado_em > v_inicio_em)
  ON CONFLICT (aula_id, aluno_id) DO NOTHING;
END;
$$;

-- 7.2. Agendar Aula Individual
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
BEGIN
  -- Permissão: Admin ou Professor responsável
  IF NOT public.is_admin() AND (public.get_auth_role() != 'professor' OR public.get_current_professor_id() != p_professor_id) THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Apenas administradores ou o professor responsavel podem agendar aulas.';
  END IF;

  -- Lock de concorrência por advisory xact lock
  PERFORM pg_advisory_xact_lock(hashtext('prof_sched_' || p_professor_id::text));
  PERFORM pg_advisory_xact_lock(hashtext('turma_sched_' || p_turma_id::text));

  -- Inserção na tabela aulas (disparará triggers de integridade e conflito)
  INSERT INTO public.aulas (
    turma_id, serie_id, professor_id, inicio_em, fim_em,
    status, titulo, meeting_url, observacoes, criado_por
  ) VALUES (
    p_turma_id, p_serie_id, p_professor_id, p_inicio_em, p_fim_em,
    'agendada', p_titulo, p_meeting_url, p_observacoes, auth.uid()
  ) RETURNING id INTO v_aula_id;

  -- Popula chamada com nao_registrado
  PERFORM public.iniciar_chamada_aula(v_aula_id);

  -- Log de Auditoria
  INSERT INTO public.auditoria_logs (
    ator_id, ator_role, acao, entidade, identificador_entidade,
    valores_anteriores, valores_posteriores, metadados
  ) VALUES (
    auth.uid(), public.get_auth_role(), 'CRIACAO_AULA', 'aulas', v_aula_id::text,
    NULL,
    jsonb_build_object(
      'turma_id', p_turma_id,
      'professor_id', p_professor_id,
      'inicio_em', p_inicio_em,
      'fim_em', p_fim_em,
      'titulo', p_titulo,
      'serie_id', p_serie_id
    ),
    jsonb_build_object('origem', 'rpc_agendar_aula')
  );

  RETURN v_aula_id;
END;
$$;

-- 7.3. Agendar Série Recorrente de Aulas (Rollback All-or-Nothing em Conflito)
CREATE OR REPLACE FUNCTION public.agendar_serie_aulas(
  p_turma_id UUID,
  p_professor_id UUID,
  p_titulo_base TEXT,
  p_dia_semana INT, -- 0 = Domingo, 1 = Segunda, ...
  p_horario_local TIME,
  p_duracao_minutos INT,
  p_quantidade_encontros INT,
  p_data_inicio DATE,
  p_meeting_url TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
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
BEGIN
  -- Validações básicas
  IF p_quantidade_encontros < 1 OR p_quantidade_encontros > 24 THEN
    RAISE EXCEPTION 'QUANTIDADE_INVALIDA: A quantidade de encontros deve ser entre 1 e 24.';
  END IF;

  IF NOT public.is_admin() AND (public.get_auth_role() != 'professor' OR public.get_current_professor_id() != p_professor_id) THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Apenas administradores ou o professor responsavel podem criar series recorrentes.';
  END IF;

  -- Lock de concorrência
  PERFORM pg_advisory_xact_lock(hashtext('prof_sched_' || p_professor_id::text));
  PERFORM pg_advisory_xact_lock(hashtext('turma_sched_' || p_turma_id::text));

  -- Ajusta primeira data para o dia_semana correto, se necessário
  v_diff := (p_dia_semana - extract(dow from p_data_inicio)::int + 7) % 7;
  v_data_atual := p_data_inicio + v_diff;
  v_data_fim := v_data_atual + ((p_quantidade_encontros - 1) * 7);

  -- Pré-validação rigorosa de conflitos para todos os encontros antes de persistir
  FOR i IN 0..(p_quantidade_encontros - 1) LOOP
    v_inicio := ( (v_data_atual + (i * 7)) + p_horario_local ) AT TIME ZONE 'America/Sao_Paulo';
    v_fim := v_inicio + (p_duracao_minutos || ' minutes')::interval;

    -- Conflito professor
    IF EXISTS (
      SELECT 1 FROM public.check_conflito_horario_professor(p_professor_id, v_inicio, v_fim)
    ) THEN
      RAISE EXCEPTION 'CONFLITO_SERIE_PROFESSOR: Conflito detectado no encontro #% (%) para o professor.',
        (i + 1), to_char(v_inicio AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI');
    END IF;

    -- Conflito aluno
    IF EXISTS (
      SELECT 1 FROM public.check_conflito_horario_alunos_turma(p_turma_id, v_inicio, v_fim)
    ) THEN
      RAISE EXCEPTION 'CONFLITO_SERIE_ALUNO: Conflito detectado no encontro #% (%) para alunos da turma.',
        (i + 1), to_char(v_inicio AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI');
    END IF;
  END LOOP;

  -- Cria o registro da série
  INSERT INTO public.series_aulas (
    turma_id, professor_id, dia_semana, horario_local, duracao_minutos,
    timezone, data_inicio, data_fim, status, criado_por
  ) VALUES (
    p_turma_id, p_professor_id, p_dia_semana, p_horario_local, p_duracao_minutos,
    'America/Sao_Paulo', v_data_atual, v_data_fim, 'ativa', auth.uid()
  ) RETURNING id INTO v_serie_id;

  -- Gera cada aula vinculada à série
  FOR i IN 0..(p_quantidade_encontros - 1) LOOP
    v_inicio := ( (v_data_atual + (i * 7)) + p_horario_local ) AT TIME ZONE 'America/Sao_Paulo';
    v_fim := v_inicio + (p_duracao_minutos || ' minutes')::interval;
    v_titulo := p_titulo_base || ' (' || (i + 1) || '/' || p_quantidade_encontros || ')';

    INSERT INTO public.aulas (
      turma_id, serie_id, professor_id, inicio_em, fim_em,
      status, titulo, meeting_url, observacoes, criado_por
    ) VALUES (
      p_turma_id, v_serie_id, p_professor_id, v_inicio, v_fim,
      'agendada', v_titulo, p_meeting_url, p_observacoes, auth.uid()
    ) RETURNING id INTO v_aula_id;

    PERFORM public.iniciar_chamada_aula(v_aula_id);
  END LOOP;

  -- Auditoria
  INSERT INTO public.auditoria_logs (
    ator_id, ator_role, acao, entidade, identificador_entidade,
    valores_anteriores, valores_posteriores, metadados
  ) VALUES (
    auth.uid(), public.get_auth_role(), 'CRIACAO_SERIE_AULAS', 'series_aulas', v_serie_id::text,
    NULL,
    jsonb_build_object(
      'turma_id', p_turma_id,
      'professor_id', p_professor_id,
      'quantidade_encontros', p_quantidade_encontros,
      'data_inicio', v_data_atual,
      'data_fim', v_data_fim
    ),
    jsonb_build_object('origem', 'rpc_agendar_serie_aulas')
  );

  RETURN v_serie_id;
END;
$$;

-- 7.4. Reagendar Aula
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
BEGIN
  SELECT * INTO v_aula FROM public.aulas WHERE id = p_aula_id FOR UPDATE;

  IF v_aula.id IS NULL THEN
    RAISE EXCEPTION 'AULA_NAO_ENCONTRADA: Aula nao encontrada.';
  END IF;

  IF v_aula.status != 'agendada' THEN
    RAISE EXCEPTION 'STATUS_INVALIDO: Apenas aulas agendadas podem ser reagendadas.';
  END IF;

  IF NOT public.is_admin() AND (public.get_auth_role() != 'professor' OR public.get_current_professor_id() != v_aula.professor_id) THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Apenas administradores ou o professor responsavel podem reagendar a aula.';
  END IF;

  -- Atualização (dispara triggers de integridade e conflito)
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
    auth.uid(), public.get_auth_role(), 'REAGENDAMENTO_AULA', 'aulas', p_aula_id::text,
    jsonb_build_object('inicio_em', v_aula.inicio_em, 'fim_em', v_aula.fim_em),
    jsonb_build_object('inicio_em', p_novo_inicio, 'fim_em', p_novo_fim, 'motivo', p_motivo),
    jsonb_build_object('origem', 'rpc_reagendar_aula')
  );
END;
$$;

-- 7.5. Cancelar Aula
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
BEGIN
  IF p_motivo IS NULL OR length(trim(p_motivo)) = 0 THEN
    RAISE EXCEPTION 'MOTIVO_OBRIGATORIO: O motivo do cancelamento deve ser informado.';
  END IF;

  SELECT * INTO v_aula FROM public.aulas WHERE id = p_aula_id FOR UPDATE;

  IF v_aula.id IS NULL THEN
    RAISE EXCEPTION 'AULA_NAO_ENCONTRADA: Aula nao encontrada.';
  END IF;

  IF v_aula.status != 'agendada' THEN
    RAISE EXCEPTION 'STATUS_INVALIDO: Apenas aulas agendadas podem ser canceladas.';
  END IF;

  IF NOT public.is_admin() AND (public.get_auth_role() != 'professor' OR public.get_current_professor_id() != v_aula.professor_id) THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Apenas administradores ou o professor responsavel podem cancelar a aula.';
  END IF;

  UPDATE public.aulas SET
    status = 'cancelada',
    motivo_cancelamento = p_motivo,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_aula_id;

  INSERT INTO public.auditoria_logs (
    ator_id, ator_role, acao, entidade, identificador_entidade,
    valores_anteriores, valores_posteriores, metadados
  ) VALUES (
    auth.uid(), public.get_auth_role(), 'CANCELAMENTO_AULA', 'aulas', p_aula_id::text,
    jsonb_build_object('status', 'agendada'),
    jsonb_build_object('status', 'cancelada', 'motivo', p_motivo),
    jsonb_build_object('origem', 'rpc_cancelar_aula')
  );
END;
$$;

-- 7.6. Salvar Chamada da Aula
CREATE OR REPLACE FUNCTION public.salvar_chamada_aula(
  p_aula_id UUID,
  p_presencas JSONB, -- Array de objetos: [{"aluno_id": UUID, "status": TEXT, "justificativa": TEXT, "observacao_pedagogica": TEXT}]
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
BEGIN
  SELECT * INTO v_aula FROM public.aulas WHERE id = p_aula_id;

  IF v_aula.id IS NULL THEN
    RAISE EXCEPTION 'AULA_NAO_ENCONTRADA: Aula nao encontrada.';
  END IF;

  IF v_aula.status = 'cancelada' THEN
    RAISE EXCEPTION 'AULA_CANCELADA: Nao e possivel registrar chamada em aula cancelada.';
  END IF;

  IF NOT public.is_admin() AND (public.get_auth_role() != 'professor' OR public.get_current_professor_id() != v_aula.professor_id) THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Apenas administradores ou o professor responsavel podem salvar a chamada.';
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
      AND (encerrado_em IS NULL OR encerrado_em > v_aula.inicio_em)
    LIMIT 1;

    IF v_matricula_id IS NULL THEN
      RAISE EXCEPTION 'ALUNO_NAO_MATRICULADO_TEMPORAL: O aluno % nao possui matricula ativa na data da aula.', v_aluno_id;
    END IF;

    -- Upsert na tabela presencas_aulas
    INSERT INTO public.presencas_aulas (
      aula_id, aluno_id, matricula_id, status, justificativa, observacao_pedagogica, registrado_por, registrado_em
    ) VALUES (
      p_aula_id, v_aluno_id, v_matricula_id, v_status, v_justificativa, v_obs_pedagogica, auth.uid(), timezone('utc'::text, now())
    )
    ON CONFLICT (aula_id, aluno_id) DO UPDATE SET
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
    auth.uid(), public.get_auth_role(), 'CHAMADA_SALVA', 'presencas_aulas', p_aula_id::text,
    NULL,
    jsonb_build_object('total_presencas', jsonb_array_length(p_presencas)),
    jsonb_build_object('origem', 'rpc_salvar_chamada_aula')
  );
END;
$$;

-- 7.7. Concluir Aula (com validação estrita de pendências)
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
  v_pendencias INT;
BEGIN
  SELECT * INTO v_aula FROM public.aulas WHERE id = p_aula_id FOR UPDATE;

  IF v_aula.id IS NULL THEN
    RAISE EXCEPTION 'AULA_NAO_ENCONTRADA: Aula nao encontrada.';
  END IF;

  IF v_aula.status = 'cancelada' THEN
    RAISE EXCEPTION 'AULA_CANCELADA: Nao e possivel concluir uma aula cancelada.';
  END IF;

  IF v_aula.status = 'concluida' THEN
    RETURN; -- Idempotente
  END IF;

  IF NOT public.is_admin() AND (public.get_auth_role() != 'professor' OR public.get_current_professor_id() != v_aula.professor_id) THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Apenas administradores ou o professor responsavel podem concluir a aula.';
  END IF;

  -- Conta pendências (alunos na turma com status nao_registrado)
  SELECT count(*) INTO v_pendencias
  FROM public.presencas_aulas
  WHERE aula_id = p_aula_id AND status = 'nao_registrado';

  -- Se existem pendências e não houve confirmação explícita:
  IF v_pendencias > 0 AND (p_confirmar_pendencias IS FALSE OR p_confirmar_pendencias IS NULL) THEN
    RAISE EXCEPTION 'EXISTEM_PENDENCIAS_PRESENCA: Existem % aluno(s) com presenca nao registrada. Confirmacao explicita necessaria.', v_pendencias;
  END IF;

  -- Conclusão
  IF v_pendencias > 0 AND p_confirmar_pendencias IS TRUE THEN
    UPDATE public.aulas SET
      status = 'concluida',
      concluida_em = timezone('utc'::text, now()),
      concluida_por = auth.uid(),
      pendencias_presenca_confirmadas_em = timezone('utc'::text, now()),
      pendencias_presenca_confirmadas_por = auth.uid(),
      updated_at = timezone('utc'::text, now())
    WHERE id = p_aula_id;

    INSERT INTO public.auditoria_logs (
      ator_id, ator_role, acao, entidade, identificador_entidade,
      valores_anteriores, valores_posteriores, metadados
    ) VALUES (
      auth.uid(), public.get_auth_role(), 'CONCLUSAO_AULA_COM_PENDENCIAS', 'aulas', p_aula_id::text,
      jsonb_build_object('status', 'agendada'),
      jsonb_build_object('status', 'concluida', 'pendencias', v_pendencias),
      jsonb_build_object('confirmacao_pendencias', true)
    );
  ELSE
    UPDATE public.aulas SET
      status = 'concluida',
      concluida_em = timezone('utc'::text, now()),
      concluida_por = auth.uid(),
      updated_at = timezone('utc'::text, now())
    WHERE id = p_aula_id;

    INSERT INTO public.auditoria_logs (
      ator_id, ator_role, acao, entidade, identificador_entidade,
      valores_anteriores, valores_posteriores, metadados
    ) VALUES (
      auth.uid(), public.get_auth_role(), 'CONCLUSAO_AULA', 'aulas', p_aula_id::text,
      jsonb_build_object('status', 'agendada'),
      jsonb_build_object('status', 'concluida'),
      jsonb_build_object('pendencias', 0)
    );
  END IF;
END;
$$;

-- 7.8. Cálculo de Frequência do Aluno (Fórmula Oficial Método Paulo)
CREATE OR REPLACE FUNCTION public.calcular_frequencia_aluno(
  p_aluno_id UUID,
  p_turma_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_presentes INT := 0;
  v_ausentes INT := 0;
  v_justificados INT := 0;
  v_nao_registrados INT := 0;
  v_total_concluidas INT := 0;
  v_base INT := 0;
  v_porcentagem NUMERIC := NULL;
BEGIN
  -- Permissão: Admin, Professor, ou o próprio Aluno consultando seus dados
  IF NOT public.is_admin() AND public.get_current_aluno_id() != p_aluno_id AND public.get_auth_role() != 'professor' THEN
    RAISE EXCEPTION 'ACESSO_NEGADO: Voce nao tem permissao para consultar a frequencia deste aluno.';
  END IF;

  -- Considera exclusivamente aulas com status 'concluida'
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
  WHERE pa.aluno_id = p_aluno_id
    AND a.status = 'concluida'
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


-- 8. BLINDAGEM DE ACL EM TODAS AS FUNÇÕES (ZERO EXECUTE PARA PUBLIC E ANON)

REVOKE ALL ON FUNCTION public.prevent_agenda_physical_delete() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prevent_agenda_physical_delete() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_conflito_horario_professor(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_conflito_horario_professor(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_conflito_horario_alunos_turma(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_conflito_horario_alunos_turma(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_aula_integridade() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_aula_integridade() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_presenca_integridade() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_presenca_integridade() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.aluno_can_view_aula(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aluno_can_view_aula(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.professor_can_view_aula(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.professor_can_view_aula(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.iniciar_chamada_aula(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_chamada_aula(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.agendar_aula(UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agendar_aula(UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.agendar_serie_aulas(UUID, UUID, TEXT, INT, TIME, INT, INT, DATE, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agendar_serie_aulas(UUID, UUID, TEXT, INT, TIME, INT, INT, DATE, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.reagendar_aula(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reagendar_aula(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.cancelar_aula(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_aula(UUID, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.salvar_chamada_aula(UUID, JSONB, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_chamada_aula(UUID, JSONB, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.concluir_aula(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.concluir_aula(UUID, BOOLEAN) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.calcular_frequencia_aluno(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calcular_frequencia_aluno(UUID, UUID) TO authenticated, service_role;
