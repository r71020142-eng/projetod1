# MODELO DE DADOS RELACIONAL (POSTGRESQL) • DEMOSTRATIVO MTD
**Versão:** 9.0.0 (Etapa 9 — Especificação de Arquitetura de Banco de Dados)  
**SGBD Alvo:** PostgreSQL 15+ (compatível com Supabase, AWS RDS, Neon ou VPS OneX)  
**Data:** 18 de Outubro de 2026  

---

## 1. Visão Geral do Modelo

O modelo de dados relacional foi concebido para suportar com máxima integridade, performance e segurança todas as operações do **Método Paulo**. O schema adota:
* **Chaves Primárias UUIDv4:** Para desacoplamento, segurança e facilidade de sincronização offline.
* **Integridade Referencial Forte:** Chaves estrangeiras com `ON DELETE RESTRICT` em dados com valor histórico e `CASCADE` apenas em composições fracas (ex: itens de chamada de uma aula cancelada).
* **Campos Padrão de Auditoria:** `criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `criado_por UUID REFERENCES usuarios(id)`.
* **Estratégia de Exclusão Lógica (Soft Delete):** Campo `excluido_em TIMESTAMPTZ NULL` em todas as entidades mestres para auditoria e recuperação de desastres.
* **Armazenamento de Mídia:** Somente metadados (URL HTTPS assinada, mime-type, tamanho e bucket) são salvos no banco; nenhum arquivo binário em Base64.
* **Desacoplamento e Segurança:** Observações confidenciais e notas da coordenação são isoladas por colunas e políticas de segurança em nível de linha (RLS).

---

## 2. Esquema DDL Consolidado

```sql
-- =============================================================================
-- EXTENSÕES E CONFIGURAÇÕES
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- =============================================================================
-- DOMÍNIO 1: NÚCLEO INSTITUCIONAL E USUÁRIOS
-- =============================================================================

CREATE TYPE papel_usuario_enum AS ENUM ('administrador', 'coordenacao', 'professor', 'aluno');
CREATE TYPE nivel_cefr_enum AS ENUM ('nao_avaliado', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- Tabela central de usuários (integrável ao auth.users)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email CITEXT NOT NULL UNIQUE,
    nome_completo VARCHAR(255) NOT NULL,
    papel papel_usuario_enum NOT NULL DEFAULT 'aluno',
    avatar_url VARCHAR(1024),
    telefone VARCHAR(30),
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    excluido_em TIMESTAMPTZ
);

-- Perfil do Aluno
CREATE TABLE alunos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE RESTRICT,
    nivel_operacional nivel_cefr_enum NOT NULL DEFAULT 'nao_avaliado',
    objetivo_ingles VARCHAR(255),
    professor_responsavel_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    observacoes_internas TEXT, -- Confidencial: nunca exposto ao aluno
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    excluido_em TIMESTAMPTZ
);

-- Perfil do Professor
CREATE TABLE professores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE RESTRICT,
    biografia TEXT,
    idiomas_ministrados VARCHAR(100)[] NOT NULL DEFAULT '{"Inglês"}',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    excluido_em TIMESTAMPTZ
);

-- =============================================================================
-- DOMÍNIO 2: GESTÃO ACADÊMICA E AGENDA
-- =============================================================================

CREATE TYPE tipo_turma_enum AS ENUM ('individual', 'grupo');
CREATE TYPE status_aula_enum AS ENUM ('agendada', 'confirmada', 'em_andamento', 'concluida', 'cancelada');
CREATE TYPE status_presenca_enum AS ENUM ('nao_registrado', 'presente', 'ausente', 'justificado');

CREATE TABLE turmas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    tipo tipo_turma_enum NOT NULL DEFAULT 'grupo',
    capacidade_maxima INT NOT NULL DEFAULT 6,
    professor_id UUID NOT NULL REFERENCES professores(id) ON DELETE RESTRICT,
    nivel_recomendado nivel_cefr_enum NOT NULL DEFAULT 'A1',
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    dias_semana INT[] NOT NULL, -- 0=Domingo, 1=Segunda, etc.
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    excluido_em TIMESTAMPTZ
);

-- Matrículas de Alunos em Turmas
CREATE TABLE turma_alunos (
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE RESTRICT,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
    data_matricula TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ativo BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (turma_id, aluno_id)
);

CREATE TABLE aulas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE RESTRICT,
    professor_id UUID NOT NULL REFERENCES professores(id) ON DELETE RESTRICT,
    titulo VARCHAR(255) NOT NULL,
    data_hora_inicio TIMESTAMPTZ NOT NULL,
    duracao_minutos INT NOT NULL DEFAULT 60,
    status status_aula_enum NOT NULL DEFAULT 'agendada',
    meeting_url VARCHAR(1024), -- Link HTTPS validado da reunião
    meeting_id VARCHAR(100),
    anotacoes_docente TEXT, -- Anotações pedagógicas da aula
    chamada_encerrada BOOLEAN NOT NULL DEFAULT false,
    chamada_encerrada_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE aula_chamadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aula_id UUID NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
    presenca status_presenca_enum NOT NULL DEFAULT 'nao_registrado',
    justificativa TEXT,
    registrado_em TIMESTAMPTZ,
    registrado_por UUID REFERENCES usuarios(id),
    UNIQUE(aula_id, aluno_id)
);

-- =============================================================================
-- DOMÍNIO 3: MATERIAIS, ATIVIDADES E CONTEÚDOS DIÁRIOS
-- =============================================================================

CREATE TYPE tipo_material_enum AS ENUM ('pdf', 'video_link', 'audio_link', 'texto', 'link_externo');
CREATE TYPE destino_conteudo_enum AS ENUM ('geral', 'turma', 'aluno');
CREATE TYPE status_entrega_enum AS ENUM ('rascunho', 'entregue', 'atrasada', 'corrigida', 'reenvio_solicitado');

CREATE TABLE materiais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo tipo_material_enum NOT NULL,
    url_arquivo VARCHAR(1024) NOT NULL,
    destino_tipo destino_conteudo_enum NOT NULL DEFAULT 'geral',
    turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
    aluno_id UUID REFERENCES alunos(id) ON DELETE SET NULL,
    nivel_sugerido nivel_cefr_enum,
    observacoes_internas TEXT, -- Confidencial
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    excluido_em TIMESTAMPTZ
);

CREATE TABLE atividades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_vinculado_id UUID REFERENCES materiais(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    enunciado TEXT NOT NULL,
    destino_tipo destino_conteudo_enum NOT NULL DEFAULT 'geral',
    turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
    aluno_id UUID REFERENCES alunos(id) ON DELETE SET NULL,
    prazo_entrega TIMESTAMPTZ,
    observacoes_internas TEXT, -- Confidencial
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    excluido_em TIMESTAMPTZ
);

CREATE TABLE entregas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    atividade_id UUID NOT NULL REFERENCES atividades(id) ON DELETE RESTRICT,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
    status status_entrega_enum NOT NULL DEFAULT 'rascunho',
    resposta_texto TEXT,
    link_externo_anexo VARCHAR(1024),
    nota NUMERIC(4,2), -- Ex: 8.50
    feedback_docente TEXT,
    avaliador_id UUID REFERENCES professores(id) ON DELETE SET NULL,
    data_entrega TIMESTAMPTZ,
    data_correcao TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(atividade_id, aluno_id)
);

CREATE TABLE entrega_versoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entrega_id UUID NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
    numero_versao INT NOT NULL,
    resposta_texto TEXT,
    link_externo_anexo VARCHAR(1024),
    submetido_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conteudos_diarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(255) NOT NULL,
    conteudo_pratico TEXT NOT NULL,
    data_publicacao DATE NOT NULL,
    destino_tipo destino_conteudo_enum NOT NULL DEFAULT 'geral',
    turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
    aluno_id UUID REFERENCES alunos(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- DOMÍNIO 4: SELF PRESENTATION E REPETIÇÃO ESPAÇADA (SRS)
-- =============================================================================

CREATE TYPE status_sp_enum AS ENUM ('pendente', 'em_analise', 'avaliada', 'regravacao_solicitada');

CREATE TABLE self_presentations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
    video_url VARCHAR(1024) NOT NULL, -- URL em nuvem
    duracao_segundos INT,
    status status_sp_enum NOT NULL DEFAULT 'pendente',
    termo_consentimento_aceito BOOLEAN NOT NULL DEFAULT true,
    data_consentimento TIMESTAMPTZ NOT NULL,
    criterio_fluencia INT CHECK (criterio_fluencia BETWEEN 1 AND 5),
    criterio_pronuncia INT CHECK (criterio_pronuncia BETWEEN 1 AND 5),
    criterio_vocabulario INT CHECK (criterio_vocabulario BETWEEN 1 AND 5),
    criterio_gramatica INT CHECK (criterio_gramatica BETWEEN 1 AND 5),
    criterio_compreensao INT CHECK (criterio_compreensao BETWEEN 1 AND 5),
    criterio_confianca INT CHECK (criterio_confianca BETWEEN 1 AND 5),
    media_criterios_orais NUMERIC(3,2), -- Somente média, NÃO gera nível CEFR
    nivel_atribuido_manual nivel_cefr_enum,
    justificativa_docente TEXT, -- Obrigatória ao atribuir nível
    observacoes_internas TEXT, -- Confidencial
    avaliador_id UUID REFERENCES professores(id) ON DELETE SET NULL,
    avaliado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE self_presentation_versoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    self_presentation_id UUID NOT NULL REFERENCES self_presentations(id) ON DELETE CASCADE,
    video_url VARCHAR(1024) NOT NULL,
    submetido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    motivo_regravacao TEXT
);

CREATE TABLE historico_niveis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
    nivel_anterior nivel_cefr_enum NOT NULL,
    nivel_novo nivel_cefr_enum NOT NULL,
    justificativa_pedagogica TEXT NOT NULL,
    responsavel_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SRS Flashcards
CREATE TABLE baralhos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    nivel_recomendado nivel_cefr_enum NOT NULL DEFAULT 'A1',
    idioma_origem VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    idioma_destino VARCHAR(10) NOT NULL DEFAULT 'en-US',
    limite_diario_novos INT NOT NULL DEFAULT 20,
    destino_tipo destino_conteudo_enum NOT NULL DEFAULT 'geral',
    turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
    aluno_id UUID REFERENCES alunos(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cartoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    baralho_id UUID NOT NULL REFERENCES baralhos(id) ON DELETE CASCADE,
    frente TEXT NOT NULL,
    verso TEXT NOT NULL,
    contexto_exemplo TEXT,
    audio_url VARCHAR(1024),
    dica TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE progresso_cartoes (
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
    cartao_id UUID NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
    intervalo_dias INT NOT NULL DEFAULT 0,
    fator_facilidade NUMERIC(4,2) NOT NULL DEFAULT 2.50 CHECK (fator_facilidade >= 1.30),
    repeticoes_consecutivas INT NOT NULL DEFAULT 0,
    proxima_revisao_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_revisoes INT NOT NULL DEFAULT 0,
    PRIMARY KEY (aluno_id, cartao_id)
);

CREATE TABLE historico_revisoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
    cartao_id UUID NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
    resposta VARCHAR(20) NOT NULL, -- 'errei', 'dificil', 'bom', 'facil'
    tempo_resposta_ms INT,
    data_revisao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- DOMÍNIO 5: ESTRUTURA DO MÉTODO PAULO E AVALIAÇÕES
-- =============================================================================

CREATE TABLE programas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    duracao_meses INT NOT NULL DEFAULT 6,
    ativo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE etapas_pedagogicas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    programa_id UUID NOT NULL REFERENCES programas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    ordem INT NOT NULL,
    UNIQUE(programa_id, ordem)
);

CREATE TABLE modulos_pedagogicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    etapa_id UUID NOT NULL REFERENCES etapas_pedagogicas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    ordem INT NOT NULL,
    horas_aulas_requeridas NUMERIC(4,1) NOT NULL DEFAULT 10.0,
    atividades_minimas INT NOT NULL DEFAULT 3,
    avaliacao_pratica_obrigatoria BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(etapa_id, ordem)
);

CREATE TYPE status_modulo_aluno_enum AS ENUM ('bloqueado', 'em_andamento', 'aguardando_validacao', 'concluido');

CREATE TABLE progresso_modulos_alunos (
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
    modulo_id UUID NOT NULL REFERENCES modulos_pedagogicos(id) ON DELETE RESTRICT,
    status status_modulo_aluno_enum NOT NULL DEFAULT 'bloqueado',
    percentual_conclusao NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    validado_por_id UUID REFERENCES professores(id) ON DELETE SET NULL,
    parecer_docente TEXT,
    validado_em TIMESTAMPTZ,
    PRIMARY KEY (aluno_id, modulo_id)
);

CREATE TYPE politica_gabarito_enum AS ENUM ('nota_imediata', 'gabarito_imediato', 'gabarito_apos_encerramento');
CREATE TYPE tipo_avaliacao_enum AS ENUM ('objetiva', 'pratica');

CREATE TABLE avaliacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    modulo_id UUID NOT NULL REFERENCES modulos_pedagogicos(id) ON DELETE RESTRICT,
    titulo VARCHAR(255) NOT NULL,
    tipo tipo_avaliacao_enum NOT NULL,
    politica_gabarito politica_gabarito_enum NOT NULL DEFAULT 'gabarito_imediato',
    nota_aprovacao NUMERIC(4,2) NOT NULL DEFAULT 7.00,
    encerrada BOOLEAN NOT NULL DEFAULT false,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tentativas_avaliacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    avaliacao_id UUID NOT NULL REFERENCES avaliacoes(id) ON DELETE RESTRICT,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
    numero_tentativa INT NOT NULL DEFAULT 1,
    nota_final NUMERIC(4,2),
    aprovado BOOLEAN,
    feedback_docente TEXT,
    observacoes_internas TEXT, -- Confidencial
    status VARCHAR(30) NOT NULL DEFAULT 'em_andamento', -- 'em_andamento', 'submetida', 'aguardando_correcao', 'corrigida'
    iniciado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalizado_em TIMESTAMPTZ
);

-- =============================================================================
-- DOMÍNIO 6: COMUNIDADE E GAMIFICAÇÃO
-- =============================================================================

CREATE TABLE espacos_comunidade (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(30) NOT NULL, -- 'geral', 'turma', 'nivel', 'objetivo'
    turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
    nivel_requerido nivel_cefr_enum,
    ativo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE publicacoes_comunidade (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    espaco_id UUID NOT NULL REFERENCES espacos_comunidade(id) ON DELETE RESTRICT,
    autor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    titulo VARCHAR(255),
    conteudo TEXT NOT NULL,
    link_externo_url VARCHAR(1024),
    link_externo_titulo VARCHAR(255),
    fixada BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'publicada', -- 'publicada', 'oculta', 'denunciada'
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reacoes_publicacoes (
    publicacao_id UUID NOT NULL REFERENCES publicacoes_comunidade(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    tipo_reacao VARCHAR(20) NOT NULL, -- 'curtidas', 'apoio', 'parabens'
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(publicacao_id, usuario_id) -- Garante no máximo 1 reação por usuário por post
);

CREATE TABLE denuncias_comunidade (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publicacao_id UUID NOT NULL REFERENCES publicacoes_comunidade(id) ON DELETE CASCADE,
    denunciante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    motivo VARCHAR(50) NOT NULL,
    descricao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente', -- 'pendente', 'analisada', 'descartada'
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conquistas e Placas
CREATE TABLE modelos_conquistas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(150) NOT NULL,
    descricao TEXT NOT NULL,
    icone VARCHAR(50) NOT NULL,
    tipo_criterio VARCHAR(50) NOT NULL,
    meta_valor NUMERIC(6,2),
    meta_nivel nivel_cefr_enum,
    tipo_premio VARCHAR(30) NOT NULL, -- 'badge', 'placa_digital', 'placa_fisica'
    pontos_recompensa INT NOT NULL DEFAULT 0,
    elegivel_placa_fisica BOOLEAN NOT NULL DEFAULT false,
    ativo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE conquistas_concedidas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    modelo_id UUID NOT NULL REFERENCES modelos_conquistas(id) ON DELETE RESTRICT,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
    codigo_validacao_digital VARCHAR(50) NOT NULL UNIQUE, -- 'MTD-PLK-XXXX'
    concedido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    justificativa_docente TEXT,
    UNIQUE(modelo_id, aluno_id)
);

CREATE TYPE status_placa_fisica_enum AS ENUM (
    'solicitada', 'em_analise', 'aprovada', 'em_producao', 'pronta', 'enviada', 'entregue', 'cancelada'
);

CREATE TABLE solicitacoes_placas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
    conquista_concedida_id UUID NOT NULL REFERENCES conquistas_concedidas(id) ON DELETE RESTRICT,
    status status_placa_fisica_enum NOT NULL DEFAULT 'solicitada',
    codigo_validacao VARCHAR(50) NOT NULL,
    codigo_rastreio VARCHAR(100),
    observacoes_internas TEXT, -- Confidencial
    solicitado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ledger Imutável de Pontos Pedagógicos
CREATE TABLE eventos_pontos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
    tipo_acao VARCHAR(50) NOT NULL, -- 'presenca_aula', 'revisao_flashcards_diaria', 'manutencao_streak', etc.
    pontos INT NOT NULL CHECK (pontos > 0),
    descricao TEXT NOT NULL,
    referencia_id VARCHAR(100), -- Garante idempotência (ex: id da aula, dia de streak)
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(aluno_id, tipo_acao, referencia_id)
);

-- =============================================================================
-- ÍNDICES DE ALTA PERFORMANCE RECOMENDADOS
-- =============================================================================
CREATE INDEX idx_alunos_usuario ON alunos(usuario_id);
CREATE INDEX idx_aulas_turma_data ON aulas(turma_id, data_hora_inicio);
CREATE INDEX idx_aula_chamadas_aluno ON aula_chamadas(aluno_id, presenca);
CREATE INDEX idx_entregas_aluno ON entregas(aluno_id, status);
CREATE INDEX idx_progresso_cartoes_revisao ON progresso_cartoes(aluno_id, proxima_revisao_em);
CREATE INDEX idx_historico_revisoes_aluno_data ON historico_revisoes(aluno_id, data_revisao);
CREATE INDEX idx_publicacoes_espaco_criado ON publicacoes_comunidade(espaco_id, criado_em DESC);
CREATE INDEX idx_eventos_pontos_aluno ON eventos_pontos(aluno_id);
```

---

## 3. Resumo dos Índices e Restrições de Integridade

1. **Unicidade de Reação por Usuário:** `reacoes_publicacoes(publicacao_id, usuario_id)` garante rigorosamente no banco que um usuário não pode ter mais de uma reação na mesma publicação.
2. **Idempotência de Pontos:** `eventos_pontos(aluno_id, tipo_acao, referencia_id)` impede duplicidade de atribuição de pontos por uma mesma aula assistida ou módulo validado.
3. **Piso de SM-2:** `progresso_cartoes.fator_facilidade CHECK (fator_facilidade >= 1.30)` impede matematicamente que o fator de facilidade caia abaixo do limiar cognitivo recomendado.
4. **Proteção de Chamada Duplicada:** `aula_chamadas(aula_id, aluno_id)` garante que cada aluno possui exatamente um registro de presença por aula.
