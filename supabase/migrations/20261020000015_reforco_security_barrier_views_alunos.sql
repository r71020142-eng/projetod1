-- ==============================================================================
-- MIGRAÇÃO: 20261020000015_reforco_security_barrier_views_alunos.sql
-- ETAPA 10.3B1.3: REFORÇO DE SECURITY BARRIER NAS VIEWS DE ALUNOS
--
-- Objetivos:
-- 1. Habilitar o atributo "security_barrier = true" em public.vw_aluno_aulas e
--    public.vw_aluno_presencas.
--    No PostgreSQL, views sanitizadas que atuam como barreiras de segurança
--    e proteção de colunas (com owner postgres e security_invoker = false)
--    devem possuir security_barrier = true para impedir que o otimizador
--    de consultas realize o push-down de funções ou operadores definidos
--    pelo usuário antes da avaliação dos predicados de segurança da view.
--
-- 2. Manutenção estrita dos privilégios de acesso:
--    SELECT exclusivo para authenticated e service_role; revogado de PUBLIC e anon.
-- ==============================================================================

ALTER VIEW public.vw_aluno_aulas SET (security_barrier = true);
ALTER VIEW public.vw_aluno_presencas SET (security_barrier = true);

-- Revalida revogação para anon e PUBLIC
REVOKE ALL ON public.vw_aluno_aulas FROM PUBLIC, anon;
REVOKE ALL ON public.vw_aluno_presencas FROM PUBLIC, anon;

-- Revalida concessão exclusiva de leitura para authenticated e service_role
GRANT SELECT ON public.vw_aluno_aulas TO authenticated, service_role;
GRANT SELECT ON public.vw_aluno_presencas TO authenticated, service_role;
