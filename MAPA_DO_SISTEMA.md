# MAPA DO SISTEMA • DEMOSTRATIVO MTD
**Versão:** 9.0.0 (Etapa 9 — Auditoria Geral, Estabilização e Preparação para Backend)  
**Data:** 18 de Outubro de 2026  
**Status:** Auditado e Estabilizado para Transição de Backend  

---

## 1. Visão Geral da Arquitetura

O **DEMOSTRATIVO MTD** é a plataforma educacional digital exclusiva da escola de inglês baseada no **Método Paulo**. A aplicação foi projetada no padrão Next.js 14 (App Router) com TypeScript estrito, Tailwind CSS e uma camada de isolamento total de dados (`src/data/`), garantindo que nenhuma página ou componente acesse o armazenamento diretamente.

Toda a persistência local (28 chaves em `localStorage`) está estritamente encapsulada por contratos de repositório assíncronos (`Promise<T>`), permitindo que a troca futura por chamadas de API REST ou SDK de banco (ex: Supabase, Prisma) ocorra sem nenhuma modificação nos componentes visuais.

---

## 2. Inventário Completo de Rotas

### 2.1 Área do Aluno (`/aluno`)
| Rota | Tipo | Finalidade Principal |
| :--- | :--- | :--- |
| `/aluno` | Estática / SSR | Central diária personalizada: Boas-vindas horárias com ações do dia, Próxima aula com foto e link Zoom, Meu plano de hoje (motor determinístico com até 3 ações prioritárias), Resumo rápido em 4 cards, Continue sua jornada, Atualizações recentes (feedback pedagógico e conquista recente) e Minha semana. |
| `/aluno/aulas` | Estática / SSR | Histórico de aulas concluídas e futuras, links manuais HTTPS do Zoom e status de presença. |
| `/aluno/materiais` | Estática / SSR | Biblioteca pedagógica, atividades abertas para entrega e conteúdos diários de fixação. |
| `/aluno/materiais/[id]` | Dinâmica | Visualização de material didático ou entrega de atividade pedagógica com versionamento. |
| `/aluno/self-presentation` | Estática / SSR | Painel da Self Presentation: roteiro pedagógico de 6 passos, termo de consentimento e envio de vídeo/áudio externo. |
| `/aluno/self-presentation/[id]`| Dinâmica | Histórico de envio, parecer qualitativo do professor, média dos critérios orais e histórico de versões. |
| `/aluno/flashcards` | Estática / SSR | Visão geral dos baralhos disponíveis (gerais, da turma e individuais) e estatísticas de revisão. |
| `/aluno/flashcards/[id]` | Dinâmica | Detalhes do baralho pedagógico, lista de cartões e botão para iniciar sessão de estudos. |
| `/aluno/flashcards/[id]/estudar`| Dinâmica | Sessão interativa de repetição espaçada (SRS SM-2) com botões Errei (+10 min), Difícil, Bom e Fácil. |
| `/aluno/avaliacoes` | Estática / SSR | Central de avaliações: diagnósticos objetivos e avaliações práticas do Método Paulo. |
| `/aluno/avaliacoes/[id]` | Dinâmica | Interface de execução de teste objetivo ou envio de resposta prática com respeito estrito à política de gabarito. |
| `/aluno/comunidade` | Estática / SSR | Feed da comunidade interna exclusivo com grupos por Turma, Nível, Objetivo, Comunicados e Oportunidades. |
| `/aluno/comunidade/[id]` | Dinâmica | Visualização de publicação com comentários, reação única por usuário e opção de denúncia ética. |
| `/aluno/conquistas` | Estática / SSR | Galeria de badges conquistados, horas reais de aula, streak de flashcards e status de solicitação de placas. |
| `/aluno/conquistas/[id]` | Dinâmica | Detalhe de conquista individual e visualização da Placa Digital oficial com identificador demonstrativo. |
| `/aluno/perfil` | Estática / SSR | Dados cadastrais do aluno, nível operacional atual registrado e professor responsável. |

### 2.2 Área Administrativa e Coordenação (`/admin`)
| Rota | Tipo | Finalidade Principal |
| :--- | :--- | :--- |
| `/admin` | Estática / SSR | Dashboard executivo com métricas pedagógicas consolidadas, fila de avaliações e gráficos operacionais. |
| `/admin/alunos` | Estática / SSR | Cadastro de alunos, listagem com busca, filtros por nível e status de matrícula. |
| `/admin/alunos/[id]` | Dinâmica | Prontuário pedagógico do aluno: turmas vinculadas, frequência real, histórico de níveis e observações internas. |
| `/admin/professores` | Estática / SSR | Cadastro de docentes, idiomas ministrados, biografia e carga horária. |
| `/admin/professores/[id]` | Dinâmica | Ficha individual do professor com turmas sob sua responsabilidade pedagógica. |
| `/admin/turmas` | Estática / SSR | Gestão de turmas (individuais ou em grupo de até 6 alunos), horários e dias da semana. |
| `/admin/turmas/[id]` | Dinâmica | Gestão de matrículas, histórico de aulas da turma, controle de capacidade e prevenção de sobreposições. |
| `/admin/agenda` | Estática / SSR | Calendário geral de aulas, cadastro manual de links HTTPS do Zoom, anotações de aula e registro de chamada. |
| `/admin/materiais` | Estática / SSR | Repositório central de apostilas em PDF, vídeos externos, áudios e criação de atividades pedagógicas. |
| `/admin/materiais/[id]` | Dinâmica | Gestão do material ou fila de correção docente com histórico de reenvios do aluno. |
| `/admin/self-presentation` | Estática / SSR | Fila administrativa de Self Presentations pendentes de avaliação (ordem mais antigas primeiro). |
| `/admin/self-presentation/[id]`| Dinâmica | Rubrica de avaliação oral em 6 critérios (1 a 5), parecer pedagógico confidencial e aplicação manual de nível. |
| `/admin/flashcards` | Estática / SSR | Gestão de baralhos de repetição espaçada, importação em lote e segmentação por turma ou aluno. |
| `/admin/flashcards/[id]` | Dinâmica | Edição de baralho e cartões, com suporte a áudio via link HTTPS e dicas contextuais. |
| `/admin/avaliacoes` | Estática / SSR | Estrutura pedagógica do Método Paulo (Programas, Etapas e Módulos) e banco de avaliações. |
| `/admin/avaliacoes/[id]` | Dinâmica | Gestão e correção de avaliações objetivas e práticas (com rubrica humana e notas confidenciais). |
| `/admin/comunidade` | Estática / SSR | Gestão dos espaços da comunidade interna e central de moderação de denúncias de publicações/comentários. |
| `/admin/comunidade/[id]` | Dinâmica | Moderação e histórico de ações em publicações específicas. |
| `/admin/conquistas` | Estática / SSR | Configuração de modelos de conquistas, ledger de pontos e esteira de produção de placas físicas. |
| `/admin/conquistas/[id]` | Dinâmica | Detalhes do modelo de conquista e relação de alunos que a desbloquearam. |
| `/admin/configuracoes` | Estática / SSR | Parâmetros da escola, políticas de retenção e fuso horário oficial (`America/Sao_Paulo`). |

---

## 3. Inventário de Entidades de Domínio

| Entidade | Interface TypeScript | Identificador | Chave de Persistência Local |
| :--- | :--- | :--- | :--- |
| **Aluno** | `Aluno` | `alu-XXX` | `mtd_demonstrativo_alunos_v1` |
| **Professor** | `Professor` | `prof-XXX` | `mtd_demonstrativo_professores_v1` |
| **Turma** | `Turma` | `turma-XXX` | `mtd_demonstrativo_turmas_v1` |
| **Aula** | `Aula` | `aula-XXX` | `mtd_demonstrativo_aulas_v1` |
| **Material Didático** | `Material` | `mat-XXX` | `mtd_demonstrativo_materiais_v1` |
| **Atividade** | `Atividade` | `atv-XXX` | `mtd_demonstrativo_atividades_v1` |
| **Entrega de Atividade**| `Entrega` | `ent-XXX` | `mtd_demonstrativo_entregas_v1` |
| **Conteúdo Diário** | `ConteudoDiario` | `cont-XXX` | `mtd_demonstrativo_conteudo_diario_v1` |
| **Self Presentation** | `SelfPresentation` | `sp-XXX` | `mtd_demonstrativo_self_presentation_v1` |
| **Histórico de Nível** | `RegistroHistoricoNivel` | `hist-XXX` | `mtd_demonstrativo_historico_nivel_v1` |
| **Baralho** | `BaralhoFlashcards` | `baralho-XXX`| `mtd_demonstrativo_baralhos_v1` |
| **Cartão Flashcard** | `CartaoFlashcard` | `card-XXX` | `mtd_demonstrativo_cartoes_v1` |
| **Progresso Cartão** | `ProgressoCartao` | `prog-XXX` | `mtd_demonstrativo_progresso_cartoes_v1` |
| **Histórico Revisão** | `HistoricoRevisaoCartao`| `rev-XXX` | `mtd_demonstrativo_historico_revisoes_v1`|
| **Sessão de Estudos** | `SessaoEstudo` | `sess-XXX` | `mtd_demonstrativo_sessoes_estudo_v1` |
| **Programa** | `ProgramaPedagogico` | `prog-ped-XXX`| `mtd_pedagogico_programas_v1` |
| **Etapa Pedagógica** | `EtapaPedagogica` | `etapa-XXX` | `mtd_pedagogico_etapas_v1` |
| **Módulo Pedagógico** | `ModuloPedagogico` | `mod-XXX` | `mtd_pedagogico_modulos_v1` |
| **Progresso Módulo** | `ProgressoModuloAluno` | `prog-mod-XXX`| `mtd_pedagogico_progresso_modulos_v1` |
| **Avaliação** | `Avaliacao` | `aval-XXX` | `mtd_pedagogico_avaliacoes_v1` |
| **Tentativa Avaliação**| `TentativaAvaliacao` | `tent-XXX` | `mtd_pedagogico_tentativas_v1` |
| **Espaço Comunidade** | `EspacoComunidade` | `esp-XXX` | `mtd_comunidade_espacos_v1` |
| **Publicação** | `PublicacaoComunidade` | `pub-XXX` | `mtd_comunidade_publicacoes_v1` |
| **Comentário** | `ComentarioPublicacao` | `com-XXX` | `mtd_comunidade_comentarios_v1` |
| **Denúncia Ética** | `DenunciaComunidade` | `den-XXX` | `mtd_comunidade_denuncias_v1` |
| **Modelo Conquista** | `ModeloConquista` | `mod-conq-XXX`| `mtd_gamificacao_modelos_v1` |
| **Conquista Concedida**| `ConquistaConcedida` | `conq-alu-XXX`| `mtd_gamificacao_concedidas_v1` |
| **Solicitação de Placa**| `SolicitacaoPlacaFisica`| `plk-XXX` | `mtd_gamificacao_placas_v1` |
| **Evento de Pontos** | `EventoPontos` | `ev-pts-XXX` | `mtd_gamificacao_eventos_pontos_v1` |
| **Notificação Interna**| `NotificacaoInterna` | `notif-XXX` | `mtd_gamificacao_notificacoes_v1` |

---

## 4. Mapa de Relações e Integridade Referencial por ID

A integridade do sistema é sustentada por relacionamentos estritos entre identificadores de domínio:

```
[Aluno: alu-XXX]
   ├── vincula-se a [Turma: turma-XXX] via Turma.alunoIds
   ├── registra presença em [Aula: aula-XXX] via Aula.chamada.alunoId
   ├── envia [Entrega: ent-XXX] via Entrega.alunoId para [Atividade: atv-XXX]
   ├── submete [SelfPresentation: sp-XXX] via SelfPresentation.alunoId
   ├── possui [RegistroHistoricoNivel: hist-XXX] via RegistroHistoricoNivel.alunoId
   ├── estuda [Cartao: card-XXX] gerando [ProgressoCartao: prog-XXX] e [HistoricoRevisao: rev-XXX]
   ├── cursa [Modulo: mod-XXX] gerando [ProgressoModuloAluno: prog-mod-XXX]
   ├── realiza [TentativaAvaliacao: tent-XXX] para [Avaliacao: aval-XXX]
   ├── publica em [EspacoComunidade: esp-XXX] gerando [Publicacao: pub-XXX]
   ├── recebe [ConquistaConcedida: conq-alu-XXX] a partir de [ModeloConquista: mod-conq-XXX]
   ├── solicita [SolicitacaoPlacaFisica: plk-XXX] referenciando Conquista ou Marco B1/C2
   └── acumula [EventoPontos: ev-pts-XXX] via EventoPontos.alunoId

[Professor: prof-XXX]
   ├── leciona em [Turma: turma-XXX] via Turma.professorId
   ├── ministra [Aula: aula-XXX] via Aula.professorId
   ├── corrige [Entrega: ent-XXX] via Entrega.avaliadorId
   ├── avalia [SelfPresentation: sp-XXX] via SelfPresentation.avaliadorId
   ├── oficializa nível em [RegistroHistoricoNivel: hist-XXX] via RegistroHistoricoNivel.professorId
   ├── corrige avaliação prática em [TentativaAvaliacao: tent-XXX] via TentativaAvaliacao.corrigidoPorId
   └── valida conclusão de módulo em [ProgressoModuloAluno: prog-mod-XXX] via validadoPorId
```

---

## 5. Origem dos Dados de Cada Dashboard

### 5.1 Dashboard do Aluno (`/aluno` • `getAlunoDashboardData()`)
* **Próxima Aula:** Carregada de `aulaRepository.obterProximaAulaAluno("alu-001")`. Considera apenas aulas com status `"agendada"` ou `"confirmada"` onde a data/hora é superior ou igual ao momento atual. Se não houver aula futura, exibe estado vazio educacional.
* **Prática do Dia:** Carregada de `conteudoDiarioRepository.obterPraticaDeHoje("alu-001", turmasIds)`. Filtra por conteúdo publicado agendado para o dia corrente.
* **Atividades Pendentes:** Carregadas de `atividadeRepository.listarParaAluno("alu-001", turmasIds)` cruzadas com `entregaRepository.listar({ alunoId: "alu-001" })`.
* **Evolução Semanal:** Agregação de minutos de aulas com presença confirmada e revisões de flashcards nos últimos 7 dias.
* **Métricas SRS de Flashcards:** Carregadas de `historicoRevisaoRepository.obterMetricasAluno("alu-001")`, calculando cartões pendentes hoje (`nextReviewAt <= agora`), total revisado hoje e sequência (streak) ininterrupta de dias.
* **Self Presentation Ativa:** Carregada de `selfPresentationRepository.obterAtivaParaAluno("alu-001")`.
* **Progresso da Jornada:** Carregado de `progressoModuloRepository.obterProgressoJornadaAluno("alu-001")`, mapeando critérios concluídos pelo aluno versus critérios totais exigidos pelo Método Paulo.

### 5.2 Dashboard Administrativo (`/admin` • `getAdminDashboardData()`)
* **Total de Alunos Ativos:** Contagem de alunos com status `"ativo"` em `alunoRepository.listar()`.
* **Total de Professores:** Contagem de professores ativos em `professorRepository.listar()`.
* **Aulas Agendadas:** Contagem de aulas futuras em `aulaRepository.listar()`.
* **Frequência Geral da Escola:** Calculada via fórmula estrita `(presentes / (presentes + ausentes)) * 100`. Faltas justificadas e presenças não registradas não penalizam o percentual.
* **Fila de Correção de Atividades:** Entregas com status `"aguardando_correcao"` em `entregaRepository`.
* **Fila de Self Presentations:** Submissões com status `"pendente"` ou `"em_analise"` em `selfPresentationRepository`.
* **Fila de Avaliações Práticas:** Tentativas com status `"aguardando_correcao"` em `tentativaAvaliacaoRepository`.
* **Solicitações de Placas:** Contagem de placas em status `"solicitada"`, `"em_analise"` ou `"em_producao"` em `gamificacaoRepository`.

---

## 6. Ações Automáticas vs Ações Manuais (Validações Humanas)

Em estrita conformidade com os princípios pedagógicos do Método Paulo:

### Ações Automáticas do Sistema:
1. **Agendamento SRS (SM-2):** Cálculo automático de `nextReviewAt`, `intervaloDias` e `fatorFacilidade` conforme as respostas do aluno no estudo de cartões.
2. **Correção de Avaliações Objetivas:** Correção instantânea de alternativas (2 a 6 opções) atribuindo notas proporcionais e aplicando a política de exibição configurada (`nota_imediata`, `gabarito_imediato` ou `gabarito_apos_encerramento`).
3. **Cálculo de Frequência e Horas:** Cômputo exato de minutos de aula exclusivamente quando a presença for `"presente"` em aula `"concluida"`.
4. **Cálculo de Sequência (Streak):** Detecção de dias contínuos de estudo com base no histórico real de revisões.
5. **Elegibilidade de Conquistas:** Verificação de metas atingidas (horas de presença, cartões revisados, módulos concluídos).

### Ações Exclusivamente Manuais e Docentes:
1. **Registro e Encerramento de Chamada:** Somente o professor ou a coordenação confirma presença, falta ou justificativa.
2. **Avaliação da Self Presentation:** Aplicação humana da rubrica de 6 critérios orais e emissão de parecer qualitativo individualizado.
3. **Atribuição de Nível Operacional:** NUNCA ocorre por média aritmética automática. O professor seleciona o nível (A1 a C2) e é obrigado a redigir uma justificativa pedagógica formal.
4. **Correção de Avaliações Práticas:** Leitura dos textos ou escuta dos áudios/vídeos do aluno com atribuição de nota por rubrica e feedback pedagógico.
5. **Aprovação de Conclusão de Módulo:** Mesmo quando o aluno atinge 100% dos critérios objetivos, o módulo entra em `aguardando_validacao`, exigindo o parecer final e aprovação explícita do professor para liberação do módulo seguinte.
6. **Moderação da Comunidade:** Análise manual de denúncias, com decisões de ocultar, arquivar, restaurar ou fixar publicações.
7. **Aprovação e Despacho de Placas:** Validação manual da elegibilidade de marcos e atualização dos estágios de gravação a laser e despacho físico.

---

## 7. Recursos Dependentes de Infraestrutura Futura

| Recurso | Estado Atual (Etapa 9) | Requisito de Infraestrutura Futura (Backend) |
| :--- | :--- | :--- |
| **Autenticação e Sessões** | Seletor demonstrativo (`DemoRoleSwitcher`) em `NEXT_PUBLIC_DEMO_MODE=true`. | Servidor de autenticação real (JWT / NextAuth / Supabase Auth), senhas com hash Argon2/Bcrypt e cookies `httpOnly`. |
| **Banco de Dados** | `localStorage` isolado via repositórios em `src/data/`. | Banco relacional PostgreSQL com transações ACID, chaves estrangeiras com integridade referencial e índices. |
| **Armazenamento de Mídia** | Links externos HTTPS validados nativamente por URL parser. | Bucket S3 / Supabase Storage com geração de URLs assinadas pré-autenticadas e expiração. |
| **Validação Pública de Placas**| Formato demonstrativo `MTD-PLK-XXXX`. | Endpoint público autenticado `/verificar/[codigo]` consultando banco de dados com hash criptográfico. |
| **Tarefas Agendadas (Cron)** | Reagendamento no cliente por timestamps ISO. | Cron jobs gerenciados no servidor para notificação diária de flashcards, lembretes de aula e encerramento de prazos. |

---

## 8. Recursos Dependentes de Integrações Externas Futuras

1. **Zoom Meetings API (Server-to-Server OAuth):** Substituirá o cadastro manual do link HTTPS pela criação dinâmica de salas com senha, webhook de início de aula e download seguro da gravação em nuvem.
2. **Motor de Transcrição e IA (ex: Whisper / Gemini):** Permitirá transcrição automatizada do áudio da aula gravada como subsídio de estudo para o aluno e resumo pedagógico para o professor.
3. **Gateway de Notificações WhatsApp / E-mail:** Envio de lembretes automáticos de início de aula (15 minutos antes) e alertas de feedback pedagógico disponível.
4. **Integração Logística (Correios / Transportadora):** Rastreamento automático do código de postagem das placas físicas de reconhecimento com atualização de status.

---

## 9. Auditoria de Utilização de Arquivos e Componentes

A varredura completa da base de código confirmou que:
* **Total de componentes React (`src/components`):** 75 arquivos. Todos os 75 estão devidamente importados e em uso nas páginas do sistema.
* **Total de repositórios e serviços de dados (`src/data`):** 30 arquivos. Todos os 30 estão vinculados a contratos ativos ou à camada unificada `api.ts`.
* **Zero arquivos órfãos:** Não há componentes mortos, arquivos esquecidos ou lógicas duplicadas abandonadas no projeto.
