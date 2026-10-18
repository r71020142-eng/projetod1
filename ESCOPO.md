# ESCOPO DO PROJETO — PLATAFORMA DEMOSTRATIVO MTD
**Escola Exclusiva de Inglês Baseada no Método Paulo**

---

> [!NOTE]
> **Status do Documento:** Aprovado e Vigente  
> **Versão:** 9.0.0 (Etapa 9 Concluída — Auditoria Geral, Estabilização e Preparação para Backend)  
> **Data de Atualização:** 18 de Outubro de 2026  
> **Localização:** Raiz do Projeto (`/demonstrativo-mtd/ESCOPO.md`)

---

## 1. Visão Geral do Projeto

A plataforma **DEMOSTRATIVO MTD** é um ecossistema educacional digital de alta performance concebido sob medida para operacionalizar e escalar o **Método Paulo** — uma metodologia exclusiva de ensino de língua inglesa orientada à fluência prática, confiança comunicativa acelerada e imersão estruturada.

Diferente de plataformas convencionais de cursos online com vídeos pré-gravados desengajados, a plataforma MTD integra:
1. **Encontros síncronos e dinâmicos** em turmas exclusivas;
2. **Ciclo contínuo de produção ativa** do aluno (*Self Presentation*);
3. **Fixação cognitiva avançada** por repetição espaçada (*SRS Flashcards*);
4. **Avaliação mista equilibrada** (correção automatizada imediata + tutoria humana criteriosa);
5. **Comunidade segura e colaborativa** de prática contínua de conversação;
6. **Acompanhamento de métricas reais** com distinção estrita entre horas de estudo e proficiência linguística (CEFR).

---

## 2. Perfis de Usuários e Níveis de Acesso

A plataforma adota o princípio de privilégio mínimo e isolamento rigoroso de contexto:

| Perfil | Descrição e Responsabilidades | Escopo de Acesso |
| :--- | :--- | :--- |
| **Aluno (Student)** | Foco na aprendizagem ativa, participação nas aulas, revisões diárias e submissão de desafios orais/escritos. | Acesso restrito e exclusivo aos seus próprios dados, suas turmas, links de aulas autorizados, seus flashcards e à comunidade pública/turma. Não visualiza notas, feedbacks ou dados de outros discentes. |
| **Professor / Tutor Pedagógico** | Responsável pela condução didática, registro de presença, condução de encontros e correção manual de atividades discursivas e de fala. | Acesso ao painel administrativo pedagógico com visão de suas turmas atribuídas, fila de correções pendentes, inserção de notas, envio de feedbacks em áudio/texto e moderação da comunidade. |
| **Administrador (Admin Geral)** | Gestão estratégica, governança acadêmica, configuração de turmas, gestão de acessos e monitoramento global de retenção e métricas. | Acesso irrestrito a todas as áreas administrativas, cadastros globais, auditorias, gestão financeira/pedagógica e relatórios consolidados. |

> [!CAUTION]
> **Aviso Mandatório de Segurança:**
> A autenticação e autorização formais (NextAuth/JWT, RBAC e sessões criptografadas) **precisam ser implementadas antes de utilizar dados reais ou publicar a plataforma para uso da escola**. Nas fases 1 e 2, os dados são estritamente demonstrativos e persistidos no navegador local.

---

## 3. Escopo das Etapas Executadas

### 3.1. ETAPA 1 (Concluída): Estrutura Base, Identidade Visual e Dashboards
- Fundação técnica Next.js 14 App Router, React 18, TypeScript, Tailwind CSS e Lucide Icons.
- Design System MTD fiel às referências: paleta Navy (`#0F172A`, `#0B0826`), roxo institucional (`#5046E5`), cartões elevados e tipografia limpa.
- Dashboard do Aluno (`/aluno`) e Dashboard Administrativo (`/admin`) com alta fidelidade visual.
- Navegação responsiva com Sidebar fixa em desktop e menu gaveta com backdrop em telas móveis.
- Shell de páginas internas com placeholders descritivos.

### 3.2. Ajustes Realizados da Etapa 1
1. **Remoção da regra dos 15 minutos do Zoom:** A regra de liberação prévia de 15 minutos foi removida por não constar na definição do cliente. Quando não houver link de sala cadastrado, a interface exibe: *“Link da aula ainda não disponibilizado”*.
2. **Nomenclatura do Corpo Docente:** Substituição formal de *“Professores certificados”* por *“Professores”* em todos os cards de métricas, headers e cadastros.
3. **Critério Estrito de Verificação:** Documentação limitada exclusivamente às verificações e testes concretamente executados, sem declarações infundadas de conformidade.

### 3.3. ETAPA 2 (Concluída): Módulos de Cadastros de Alunos e Professores

A **ETAPA 2** implementou os módulos operacionais completos de gestão de alunos e corpo docente no ambiente administrativo:

#### 3.3.1. Módulo de Alunos (`/admin/alunos` e `/admin/alunos/[id]`)
- **Listagem Completa:** Tabela desktop com avatar, nome, e-mail, telefone, badges de status e nível pedagógico, data de cadastro e menu de ações rápidas. Em dispositivos móveis, visualização em cards responsivos com botões de toque adequados.
- **Busca e Filtros Combinados:** Busca textual em tempo real por nome e e-mail; filtros combináveis por status (*Todos*, *Ativos*, *Inativos*) e por nível (*Todos*, *Não avaliado*, *A1*, *A2*, *B1*, *B2*, *C1*, *C2*).
- **Formulário de Cadastro e Edição (`AlunoFormModal`):**
  - Campos: ID único (gerado sequencialmente), Nome completo, E-mail, Telefone (opcional), Objetivo com o inglês, Nível pedagógico, Status (ativo/inativo) e Observações pedagógicas.
  - O nível inicial padrão de novos alunos é **"Não avaliado"**.
  - **Aviso de Integridade:** A definição manual do nível é um parâmetro interno de acompanhamento pedagógico e **não representa emissão de certificado formal CEFR**.
  - Validações de campos obrigatórios, formato de e-mail e bloqueio estrito de e-mails duplicados (case-insensitive com trim).
  - Preservação dos valores em caso de erro e proteção contra múltiplos envios simultâneos.
- **Página de Detalhes (`/admin/alunos/[id]`):**
  - Exibição de todos os dados cadastrais e pedagógicos do estudante.
  - Informações de turmas, aulas síncronas, histórico de presença e avaliações aparecem marcadas explicitamente como **indisponíveis**, sem geração de dados inventados.
- **Ciclo de Vida do Registro:** Inativação com modal de confirmação explícito; suporte a reativação imediata. Nenhuma exclusão definitiva (soft delete).

#### 3.3.2. Módulo de Professores (`/admin/professores` e `/admin/professores/[id]`)
- **Listagem Completa:** Tabela e cards mobile com nome, e-mail institucional, telefone, tags de idiomas falados, status e data de cadastro.
- **Busca e Filtros:** Busca por nome, e-mail e idiomas; filtro por status (*Todos*, *Ativos*, *Inativos*).
- **Formulário de Cadastro e Edição (`ProfessorFormModal`):**
  - Campos: ID único, Nome completo, E-mail, Telefone (opcional), Biografia pedagógica curta (mínimo 10 caracteres), Idiomas falados (com seleção rápida e adição de tags personalizadas) e Status.
  - **Aviso Obrigatório de Acesso:** Cadastrar um professor não cria automaticamente uma conta de acesso ao sistema; a vinculação de credenciais será estabelecida na etapa de autenticação (RBAC).
- **Página de Detalhes (`/admin/professores/[id]`):**
  - Ficha completa do instrutor, trajetória e proficiências linguísticas.
  - Seções de turmas atribuídas e histórico de correções indicadas como indisponíveis nesta etapa.

#### 3.3.3. Persistência de Dados e Consistência
- Repositório desacoplado (`alunoRepository` e `professorRepository`) com persistência no `localStorage`.
- Compatibilidade isomórfica total com SSR/Next.js (renderização inicial segura).
- Inicialização dos dados semente uma única vez (`SEED_ALUNOS` e `SEED_PROFESSORES`), preservando qualquer adição ou alteração após recarregar a página.
- Sincronização em tempo real dos contadores no dashboard (`/admin`) refletindo a mesma base de dados.

### 3.4. ETAPA 3 (Concluída): Turmas, Matrículas, Agenda, Aulas e Presença

A **ETAPA 3** transformou os cadastros individuais em uma operação escolar completa e integrada:

#### 3.4.1. Módulo de Turmas (`/admin/turmas` e `/admin/turmas/[id]`)
- **Gestão de Coortes:** Turmas individuais (capacidade fixa em 1 aluno) e em grupo (capacidade planejada configurável, padrão 6 alunos).
- **Regras de Matrícula:** Apenas discentes com cadastro ativo podem ser matriculados. Bloqueio estrito de discente duplicado na mesma turma. Removendo matrícula exige confirmação explícita.
- **Ciclo de Vida da Turma:** Status (*Em formação*, *Ativa*, *Pausada*, *Encerrada*). Alunos e professores inativados posteriormente permanecem visíveis com badge de alerta.
- **Página de Detalhes da Turma:** Ficha com objetivo pedagógico, card do professor responsável, lista de alunos matriculados, próximas aulas, histórico de sessões e frequência consolidada.

#### 3.4.2. Módulo de Agenda e Aulas (`/admin/agenda`)
- **Visualização Dupla:** Alternância dinâmica entre **Lista Cronológica** (agrupada por datas) e **Grade Semanal** (calendário com dias da semana e blocos de horários).
- **Filtros e Busca:** Filtros por turma, professor, status (*Agendada*, *Concluída*, *Cancelada*) e termo de busca.
- **Agendamento Flexível (`AulaFormModal`):** Suporte a agendamento de **Aula Única** ou **Sequência Semanal** (2 a 12 semanas com incremento estrito de 7 dias).
- **Detecção e Bloqueio de Conflitos de Horário:** Algoritmo rigoroso que identifica sobreposição de horários `[start, start + duracao)` tanto para o professor quanto para os alunos da turma. Em caso de conflito, a interface detalha o envolvido, a aula colidente e bloqueia a gravação.

#### 3.4.3. Registro e Cálculo de Presença (`PresencaModal`)
- **Chamada por Aluno:** Registro individual com opções *Presente*, *Ausente* e *Justificado* (com campo para anotação/justificativa).
- **Fórmula de Frequência:** `(Presentes / (Presentes + Ausentes)) * 100`.
- **Regra de Ausência Justificada:** Faltas justificadas são registradas para fins de acompanhamento, mas **não entram no denominador**, preservando o índice de frequência do aluno sem penalização indevida.
- **Tratamento de Base Vazia:** Se não houver aulas concluídas para cálculo, a plataforma exibe expressamente `"—"` ou *"Sem dados suficientes"*.

#### 3.4.4. Área do Aluno (`/aluno/aulas`)
- **Visão do Aluno Demonstrativo (Mariana Oliveira - `alu-001`):**
  - **Próxima Aula em Destaque:** Card de destaque com tema, data, horário, turma e professor.
  - **Link do Zoom:** Botão direto com protocolo seguro HTTPS caso cadastrado, ou mensagem elegante: *“Link da aula ainda não disponibilizado”*.
  - **Grade de Próximas Sessões:** Lista ordenada das próximas aulas síncronas programadas.
  - **Histórico e Presença Individual:** Histórico de aulas com status da sua presença pessoal (*Presente*, *Ausente*, *Justificado*) e tópicos abordados.
  - **Taxa de Frequência do Aluno:** Cálculo em tempo real de assiduidade do estudante.

#### 3.4.5. Atualização das Fichas de Detalhes Existentes
- **Aluno (`/admin/alunos/[id]`):** Exibe as turmas em que está matriculado, próximos horários e histórico consolidado de presença.
- **Professor (`/admin/professores/[id]`):** Exibe turmas sob sua responsabilidade, próximas aulas a ministrar e total de alunos sob sua tutela.
- **Dashboards:** Métricas do `/admin` e card de próxima aula do `/aluno` sincronizados em tempo real via eventos `mtd_storage_updated`.

### 3.5. Correção Obrigatória da Etapa 3: Status de Presença com 4 Estados

A chamada de presença foi reestruturada para suportar 4 estados estritos:
1. `nao_registrado`: Estado padrão de toda nova chamada ou novos registros. Não entra na base de cálculo da taxa de presença. Ao encerrar a aula com registros pendentes, o sistema solicita confirmação explícita e preserva os registros sem transformá-los automaticamente em "ausente".
2. `presente`: Presença confirmada do discente. Entra no numerador e no denominador da fórmula de frequência.
3. `ausente`: Falta não justificada. Entra no denominador da fórmula de frequência, penalizando a assiduidade.
4. `justificado`: Falta com justificativa pedagógica/médica aceita. É exibida separadamente em relatórios e **não penaliza o percentual** (fica fora da base `presentes + ausentes`).

> **Fórmula Oficial Vigente:**  
> $$\text{Frequência (\%)} = \left(\frac{\text{Presentes}}{\text{Presentes} + \text{Ausentes}}\right) \times 100$$

### 3.6. ETAPA 4 (Concluída): Materiais Didáticos, Atividades, Entregas e Feedback

A **ETAPA 4** implementou o ecossistema didático completo do Método Paulo, cobrindo todo o ciclo desde a curadoria pedagógica até a correção orientada pelo professor:

#### 3.6.1. Biblioteca de Materiais Didáticos (`/admin/materiais` e `/aluno/materiais`)
- **Tipos Suportados:** Texto explicativo, PDF, Vídeo, Áudio, Link externo e Documento.
- **Níveis Recomendados:** Todos, Iniciante (A1-A2), Intermediário (B1-B2), Avançado (C1-C2).
- **Destinos Flexíveis:** Acervo geral (disponível a todos os alunos), Turma específica ou Aluno individualizado.
- **Isolamento e Privacidade Estrita:**
  - Materiais em rascunho (`rascunho`) ou arquivados (`arquivado`) nunca são visíveis aos discentes.
  - Materiais agendados (`agendado`) ficam visíveis apenas na data programada ou após ela.
  - Alunos só acessam materiais gerais, da sua turma matriculada ou atribuídos ao seu ID.
  - Observações pedagógicas internas (`observacoesInternas`) são estritamente higienizadas e removidas nas consultas da área do aluno.
- **Aviso de Arquivos Cloud:** Disclaimer explicativo de que downloads diretos de arquivos binários e uploads locais serão ativados após configuração do serviço de armazenamento em nuvem na infraestrutura.

#### 3.6.2. Atividades Práticas e Tarefas de Casa
- **Tipos Implementados:** Resposta em Texto e Link Seguro HTTPS (opções futuras como múltipla escolha, áudio e vídeo mantidas visíveis com badge de roadmap).
- **Prazos e Políticas de Tolerância:**
  - Data limite com suporte a horário de entrega.
  - Parâmetro configurável `permitirAtraso`: quando desativado, o envio após o prazo é rigorosamente bloqueado na interface e no repositório com erro descritivo.
  - Se permitido, o status é registrado como `atrasada`, alertando o professor sem impedir a entrega.

#### 3.6.3. Fluxo de Entrega pelo Aluno (`/aluno/materiais` e `/aluno/materiais/[id]`)
- **Regra de Unicidade:** Apenas 1 entrega ativa por aluno por atividade.
- **Rascunho Seguro (`em_andamento`):** O aluno pode salvar respostas preliminares tantas vezes quanto desejar sem enviar.
- **Bloqueio Pós-Envio:** Ao clicar em submeter, as respostas são congeladas para edição casual, aguardando parecer do professor.
- **Visualização Detalhada:** Página de detalhes do aluno com leitura completa das instruções, consulta do material relacionado, status atual e histórico de envios anteriores.

#### 3.6.4. Correção e Feedback Pedagógico (`CorrecaoEntregaModal`)
- **Fila de Entregas:** Aba administrativa de entregas com filtros por status (`entregue`, `atrasada`, `corrigida`, `reenviar`, `em_andamento`).
- **Avaliação Qualitativa e Quantitativa:**
  - Atribuição de nota numérica (0 a 100) baseada na pontuação máxima da atividade.
  - Feedback textual obrigatório orientando o aluno com base no Método Paulo.
  - Data de correção e identificação do professor corretor.
- **Solicitação de Reenvio com Retenção de Histórico (`historicoEnvios`):**
  - O professor pode solicitar revisão do trabalho, informando o motivo e orientações pedagógicas.
  - O status muda para `reenviar` e a resposta anterior, feedbacks e notas preliminares são arquivados em `historicoEnvios`, permitindo ao aluno e ao professor acompanhar a evolução temporal do trabalho.

#### 3.6.5. Estímulos e Conteúdos Diários Agendados
- **Curadoria Rápida:** Pílulas de vocabulário, phrasal verbs, pronunciation tips e connected speech do Método Paulo.
- **Agendamento por Data:** Publicação automática no dia programado.
- **Card "Prática de Hoje":** Destaque visual no topo do dashboard do aluno (`/aluno`) e na biblioteca (`/aluno/materiais`).

#### 3.6.6. Sincronização em Tempo Real dos Dashboards
- **Dashboard do Administrador (`/admin`):** Card dedicado `PedagogicalIndicatorsCard` com 4 métricas reais sincronizadas com os repositórios locais:
  1. *Atividades publicadas*;
  2. *Entregas aguardando correção*;
  3. *Entregas atrasadas*;
  4. *Conteúdos agendados*.
- **Dashboard do Aluno (`/aluno`):** Card `PendingActivitiesCard` mapeado dinamicamente para as atividades reais pendentes do aluno, com prazos e link direto para a atividade, além do banner de estímulo diário `DailyPracticeBanner`.

### 3.7. ETAPA 5 (Concluída): Self Presentation, Avaliação Pedagógica e Nivelamento Inicial

A **ETAPA 5** implementou o ciclo pedagógico completo de avaliação diagnóstica oral:
```
Aluno submete vídeo (HTTPS) com termo de consentimento registrado
  → Fila administrativa recebe a apresentação (ordenação por mais antigas primeiro)
  → Professor tutor assume a avaliação pedagógica manual
  → Preenchimento da rubrica de 6 critérios analíticos (notas 1 a 5)
  → Média aritmética calcula exclusivamente a Média dos Critérios Orais (sem sugestão CEFR automática)
  → Professor redige feedback qualitativo e define nível operacional com justificativa manual obrigatória
  → Publicação do feedback pedagógico (com notas internas estritamente sanitizadas)
  → Aluno visualiza o parecer completo no portal
  → Ação explícita de aplicação do nível ao perfil com registro no histórico de auditoria
  → Ciclo de reenvio com retenção integral do histórico de versões anteriores
```

#### 3.7.1. Regras do Aluno (`/aluno/self-presentation` e `[id]`)
- **Roteiro Pedagógico Sugerido em 6 Etapas:** Introdução pessoal, formação/ocupação, motivação e objetivo com o inglês, experiência prévia, pontos fortes e desafios percebidos, encerramento.
- **Armazenamento Seguro de Vídeo:** Proibição estrita de salvar vídeos pesados em Base64 no `localStorage`. Submissão por link externo HTTPS (YouTube não listado, Vimeo, Google Drive, etc.) com aviso visual explícito: *"O envio direto de vídeo será habilitado após a configuração do armazenamento em nuvem"*.
- **Termo de Consentimento Obrigatório:** Consentimento formal não pré-marcado com registro de data/hora e versão (`v1.0`).
- **Unicidade de Nivelamento Inicial:** Cada aluno pode ter no máximo uma apresentação ativa de `nivelamento_inicial`. Submissões subsequentes são classificadas como `reavaliacao`.
- **Bloqueio de Edição Pós-Envio:** Ao enviar (`status = 'enviada'`), o registro é congelado para edições casuais pelo discente.
- **Disclaimers Pedagógicos:** Advertência expressa de que o teste avalia a produção oral interna e não substitui uma certificação oficial CEFR, reforçando que erros e pausas são naturais no aprendizado.

#### 3.7.2. Fila Administrativa e Avaliação Pedagógica (`/admin/self-presentation` e `[id]`)
- **4 Métricas Estratégicas:** *Aguardando avaliação*, *Em avaliação*, *Reenvios solicitados*, *Apresentações avaliadas*.
- **Ordenação da Fila:** Padrão "Mais antigas primeiro", garantindo equidade e cumprimento do prazo de resposta pedagógica.
- **Atribuição Individual:** Permite a professores ativos assumirem a responsabilidade pelo parecer.
- **Rubrica Manual de 6 Critérios (Escala 1 a 5 com Comentários):**
  1. *Fluência e Naturalidade*;
  2. *Vocabulário e Precisão Lexical*;
  3. *Gramática Aplicada à Fala*;
  4. *Pronúncia e Inteligibilidade*;
  5. *Coerência e Organização do Discurso*;
  6. *Compreensão Geral e Eficácia Comunicativa*.
- **Média dos Critérios Orais e Desacoplamento CEFR:** A média da rubrica reflete estritamente os critérios orais (1 a 5) e NUNCA sugere nem converte automaticamente a nota para nível CEFR (A1 a C2). A Self Presentation avalia primariamente a produção oral e não representa uma avaliação CEFR completa. O nível operacional é atribuído e justificado exclusivamente de forma manual pelo professor.
- **Feedback Qualitativo Mandatório:** Pontos fortes, pontos a desenvolver e orientação para as próximas aulas.
- **Sanitização Estrita de Observações Internas:** As notas confidenciais da equipe são rigorosamente omitidas e destruídas na camada de dados antes de qualquer resposta para a visualização do discente.
- **Desacoplamento e Aplicação de Nível:** A avaliação não altera o perfil do aluno de forma implícita. Um botão dedicado *"Aplicar este nível ao perfil do aluno"* aciona modal de confirmação explícita (`AplicarNivelModal`), atualiza o cadastro do discente e gera um registro indelével no `historicoNivelRepository`.
- **Ciclo de Reenvio com Versionamento:** Ação de solicitar reenvio arquiva a gravação atual em `historicoVersoes`. O aluno pode submeter nova versão incrementando para `v2`, `v3`, mantendo a trilha histórica acessível.

#### 3.7.3. Sincronização em Tempo Real nos Dashboards
- **Dashboard Aluno (`/aluno`):** Card `SelfPresentationStatusCard` adaptado dinamicamente para os 5 estados da apresentação (sem gravação, enviada/aguardando, em avaliação, reenvio solicitado e avaliada com badge de nível).
- **Dashboard Admin (`/admin`):** Card `PendingSelfPresentationsCard` exibindo métricas da fila e listagem direta das gravações pendentes mais antigas.

### 3.8. ETAPA 6 (Concluída): Flashcards e Repetição Espaçada (SRS)

A **ETAPA 6** implementou um sistema próprio de retenção acelerada e repetição espaçada no ecossistema MTD:

#### 3.8.1. Princípios Algorítmicos e Desacoplamento
- **Algoritmo Determinístico (SM-2 Inspirado):** Função pura sem efeitos colaterais (`src/data/srsAlgorithm.ts`), calculando fatores de facilidade (`fatorFacilidade`), intervalos em dias ou minutos e próximas revisões.
  - *Errei:* lapsos++, fator penalizado em 0.20 (piso mínimo 1.3), estado muda para `aprendendo`, intervalo de 10 minutos com re-enfileiramento imediato no final da mesma sessão de estudo.
  - *Difícil:* fator penalizado em 0.15 (mínimo 1.3), avanço conservador (1 dia para novos, 1.2x para revisões).
  - *Bom:* progressão padrão (1 dia no primeiro acerto, 3 dias no segundo, multiplicação por facilidade nos subsequentes).
  - *Fácil:* bônus de facilidade (+0.15) e avanço acelerado (4 dias para novos, 1.3x do intervalo para revisões).
- **Ausência de Integração com o Anki:** O sistema é inspirado nos princípios universais de repetição espaçada, não declarando nem possuindo qualquer dependência ou integração com o software Anki.

#### 3.8.2. Baralhos e Gestão Administrativa (`/admin/flashcards` e `[id]`)
- **Parâmetros do Baralho:** ID único, nome, descrição pedagógica, categoria, nível recomendado (A1 a C2 ou Geral), idiomas (Inglês para Português), professor responsável, limite diário de novos cartões (1 a 100, padrão 20), tags e status (`publicado`, `rascunho`, `arquivado`).
- **Destinação e Isolamento de Conteúdo:** Suporte a baralhos gerais (biblioteca comum), direcionados a turmas específicas ou individualizados para alunos particulares.
- **Importação CSV no Cliente:** Parser nativo executado 100% no navegador, sem upload de arquivos ou envio a serviços externos. Inclui detecção automática de cabeçalho, relatório de validação prévia com linhas válidas, bloqueio de duplicatas exatas no arquivo ou contra cartões existentes no baralho.

#### 3.8.3. Ambiente de Estudo do Aluno (`/aluno/flashcards`, `[id]` e `[id]/estudar`)
- **Composição da Fila Diária:** Ordenação estrita priorizando:
  1. *Cartões de revisão vencidos* (`proximaRevisao <= agora`);
  2. *Cartões em aprendizado vencidos* (`proximaRevisao <= agora`);
  3. *Cartões novos* limitados à cota diária do baralho (`limiteDiarioNovos`).
- **Bloqueio de Avaliação Pré-Resposta:** Os botões de resposta SRS ficam rigorosamente bloqueados até que o aluno clique em "Mostrar Resposta" ou pressione a barra de espaço.
- **Atalhos de Teclado:** `Espaço` para virar o cartão e teclas `1`, `2`, `3`, `4` para avaliar a retenção.
- **Integridade de Áudio:** Suporte a links externos HTTPS. Sem link configurado, o botão é omitido ou desativado com indicação visual, sem simulação de reprodução de áudio inexistente.
- **Sequência de Dias (Streak):** Monitoramento contínuo de dias únicos estudados, mantendo o streak ativo enquanto a meta diária for cumprida.
- **Sessão Concluída:** Tela de fechamento com estatísticas da sessão, tempo total cronometrado e próximas revisões previstas.

#### 3.8.4. Sincronização em Tempo Real nos Dashboards
- **Dashboard do Aluno (`/aluno`):** Card `FlashcardsSummaryCard` com contador de streak em dias, cartões para hoje, cartões em aprendizado e atalho direto para a prática.
- **Dashboard do Administrador (`/admin`):** Card `FlashcardsAdminCard` com métricas consolidadas (baralhos, cartões ativos, revisões concluídas, discentes ativos) e painel dos cartões com maiores taxas de erro para acompanhamento pedagógico.

### 3.9. ETAPA 7 (Concluída): Estrutura Pedagógica, Avaliações e Progresso

A **ETAPA 7** implementou a espinha dorsal pedagógica do Método Paulo, unificando objetivos acadêmicos, avaliações mistas (objetivas e práticas), critérios de conclusão de módulos com barreira de validação humana e controle minucioso da jornada do aluno:

#### 3.9.1. Correção Obrigatória da Etapa 6 Integrada
- **Algoritmo Inspirado no SM-2:** O algoritmo de repetição espaçada é formalmente documentado e implementado como *“inspirado nos princípios do SM-2”*, sem qualquer alegação de implementação exata ou compatibilidade oficial com o Anki.
- **Reagendamento de 10 minutos após "Errei":** Quando o aluno responde "Errei", o sistema registra `proximaRevisao = dataBase + 10 minutos` e define `reagendadoParaRevisao = true`. O cartão **não é inserido imediatamente no final da mesma sessão**.
- **Avanço e Conclusão Limpa:** A sessão continua com os outros cartões disponíveis. O cartão com erro só é reintegrado à fila se e quando o horário atual for igual ou posterior a `proximaRevisao`. Se todos os outros cartões da sessão terminarem antes de decorridos os 10 minutos, a sessão é finalizada normalmente informando que os cartões foram reagendados, sem prender o aluno em esperas ociosas ou loops infinitos.

#### 3.9.2. Estrutura Configurável do Método Paulo
- **Entidades:** Programa, Etapas e Módulos com relacionamento hierárquico estrito.
- **Estrutura Não Rígida:** Os nomes demonstrativos iniciais (*Diagnóstico, Fundamentos, Desbloqueio, Comunicação prática, Aplicação real*) são explicitamente identificados como exemplos e podem ser editados, reordenados ou substituídos pelos administradores.
- **Reordenação Flexível:** Etapas e Módulos possuem botões de ordenação (Subir/Descer) com recálculo automático da ordem ordinal.
- **Status Operacional:** Suporte a `rascunho`, `ativo` e `arquivado` em todos os níveis.

#### 3.9.3. Critérios de Conclusão e Cálculo de Progresso do Módulo
- **Critérios Configuráveis por Módulo:**
  1. Mínimo de aulas com presença confirmada;
  2. Mínimo de atividades entregues/aprovadas;
  3. Nota mínima na avaliação objetiva (múltipla escolha);
  4. Nota mínima na avaliação prática (rubrica);
  5. Mínimo de flashcards revisados;
  6. Exigência mandatória de validação humana pelo professor (`exigeValidacaoHumana`).
- **Fórmula de Progresso Visual:** O percentual de conclusão do módulo é calculado rigorosamente pela fórmula:  
  $$\text{Progresso (\%)} = \left(\frac{\text{Critérios Cumpridos}}{\text{Total de Critérios Aplicáveis}}\right) \times 100$$
- **Barreira de Validação Humana do Professor:** Quando o módulo exige validação humana, atingir 100% dos critérios matemáticos **não promove o aluno automaticamente para concluído**. O módulo transiciona para o status `aguardando_validacao`. O avanço definitivo para `concluido` exige aprovação explícita do professor através de modal dedicado, registrando nome do avaliador, data e parecer pedagógico.
- **Reabertura de Módulo:** Módulos concluídos podem ser reabertos para reforço pedagógico (`reaberto`), mediante justificativa formal obrigatória arquivada no histórico de mudanças.

#### 3.9.4. Avaliações Objetivas com Correção Automática
- **Estrutura:** Questões de múltipla escolha com 2 a 6 alternativas, indicação mandatória de uma única alternativa correta, pontuação individual e explicação/justificativa pedagógica do gabarito.
- **Correção Instantânea:** Cálculo imediato e proporcional da nota: $(\text{Pontos Obtidos} / \text{Pontos Totais}) \times \text{Nota Máxima}$.
- **Feedback Transparente:** Exibição detalhada de acertos, erros, alternativa selecionada versus correta e comentários explicativos para cada item.

#### 3.9.5. Avaliações Práticas com Rubrica e Avaliação Humana
- **Estrutura:** Desafios de áudio, vídeo ou texto prático baseados em rubricas analíticas multicritério (pontuação máxima e descritores por critério).
- **Submissão Segura:** Envio de texto e links externos HTTPS validados nativamente.
- **Fila de Correção Docente:** Avaliação humana com atribuição de pontos por critério, cálculo proporcional da nota final, e emissão de feedback qualitativo estruturado: *Pontos Fortes*, *Pontos a Desenvolver* e *Orientações para Próximos Passos*.
- **Sanitização de Privacidade:** Observações pedagógicas internas e confidenciais da equipe são rigorosamente destruídas antes de qualquer visualização ou entrega de dados ao aluno.

#### 3.9.6. Versionamento de Avaliações e Gestão de Tentativas
- **Imutabilidade Histórica:** Avaliações com tentativas realizadas são bloqueadas para edições diretas de gabarito e rubrica.
- **Duplicação de Versão:** Administradores podem duplicar uma avaliação como nova versão ($v+1$), permitindo evolução curricular sem corromper as submissões anteriores.
- **Teto de Tentativas:** Configuração de limite máximo por aluno (ex.: 2 tentativas) com suporte a salvamento de rascunhos.
- **Autorização de Tentativa Extra:** Professores e administradores podem autorizar tentativas adicionais mediante justificativa.

#### 3.9.7. Correção Obrigatória da Etapa 7: Políticas de Exibição de Gabarito
- **Três Políticas Configuráveis:**
  1. `nota_imediata`: Exibe pontuação e status (aprovado/reprovado) imediatamente após a submissão, retendo gabarito e explicações.
  2. `gabarito_imediato`: Exibe pontuação, alternativas corretas e explicações pedagógicas logo após o envio.
  3. `gabarito_apos_encerramento`: Exibe a pontuação de imediato, liberando o gabarito detalhado apenas quando a avaliação atingir o status `encerrada`.
- **Regras Rígidas:**
  - Respostas corretas e explicações NUNCA são vazadas durante uma tentativa ativa (`em_andamento`).
  - Tentativas históricas respeitam a política congelada na versão realizada (`politicaGabaritoUtilizada`), sem alterações retroativas silenciosas.
  - Sanitização de privacidade no backend/repositório (`sanitizarTentativaParaAluno`).

#### 3.9.8. Integração e Transparência nos Dashboards
- **Dashboard do Aluno (`/aluno`):** Card `ProgressoJornadaCard` exibindo o módulo em andamento, barra de progresso baseada em critérios reais, checklist visual de pendências e avisos de validação.
- **Dashboard Administrativo (`/admin`):** Card `AdminAvaliacoesCard` consolidando avaliações ativas, fila de correções práticas pendentes, fila de validações de módulo aguardando professor, média objetiva e alertas de reforço.
- **Perfil do Aluno (`/admin/alunos/[id]`):** Painel integrado de Jornada no Método Paulo e histórico completo de tentativas em avaliações.

---

### 3.10. ETAPA 8 (Concluída): Comunidade, Gamificação, Conquistas e Placas

A **ETAPA 8** implementou a camada social e de reconhecimento de mérito acadêmico da plataforma MTD, dividida em dois grandes núcleos:

#### 3.10.1. Módulo da Comunidade Interna (`/admin/comunidade` e `/aluno/comunidade`)
- **Espaços Temáticos Segmentados:**
  - `geral`: Aberto para todos os alunos ativos da escola.
  - `turma`: Restrito e visível exclusivamente aos alunos matriculados na respectiva turma.
  - `nivel`: Segmentado pelo nível operacional do aluno (ex.: espaço de prática A2/B1).
  - `objetivo`: Segmentado pelo objetivo pedagógico cadastrado (ex.: Inglês para Carreira & Negócios).
  - `oportunidades`: Espaço oficial institucional com publicações da coordenação sobre bolsas e programas internacionais.
- **Regras Estritas de Acesso e Publicação:**
  - Permissão de publicação do aluno parametrizada por espaço (`permitirPublicacaoAluno`).
  - Permissão de comentários configurável por espaço (`permitirComentarios`).
  - Espaços arquivados preservam histórico em modo somente leitura (sem novas postagens).
  - Alunos só visualizam espaços aos quais têm direito legítimo (`alunoTemAcessoAoEspaco`).
- **Publicações e Tipos:**
  - Discussão, Comunicado Oficial (exclusivo docentes/admin), Conteúdo & Dicas, Oportunidade (exclusivo coordenação).
  - Suporte a fixação no topo (`fixada`), controle de edição com indicador *(editada)* e moderação.
  - Links externos obrigatoriamente HTTPS validados por parser nativo `URL`, com rejeição estrita de esquemas inseguros (`http://`, `javascript:`, `data:`).
- **Interação Social Sem Distração:**
  - Comentários aninhados em formato thread linear.
  - Reações enriquecidas (*Gostei / Apoio / Parabéns*) com prevenção de duplicidade por usuário.
  - Sistema de denúncias para alunos com seleção de motivo (ofensivo, spam, etc.) e justificativa.
  - Moderação administrativa ativa com ações de ocultar, restaurar e arquivar, acompanhadas de justificativa e histórico sigiloso.
- **Oportunidades de Intercâmbio:**
  - Vitrine de programas internacionais com destino, requisitos pedagógicos de nível e prazos.
  - Botão de manifestação de interesse pelo aluno (`InteresseOportunidade`), com acompanhamento operacional pela equipe administrativa.

#### 3.10.2. Módulo de Gamificação, Conquistas e Placas (`/admin/conquistas` e `/aluno/conquistas`)
- **Tabela Oficial de Pontos Pedagógicos:**
  - Presença em aula (+50 pts), Revisão diária de flashcards (+10 pts), Ofensiva mantida (+20 pts), Módulo concluído (+100 pts), Avaliação prática aprovada (+150 pts), Marco de nível operacional (+300 pts), Participação comunitária (+15 pts).
- **Motores de Cálculo Determinísticos:**
  - `calcularHorasAulasPresenca`: Considera estritamente aulas com status `concluida` e presença confirmada (`presente`). Faltas, ausências justificadas e presenças não registradas geram rigorosamente ZERO minutos. Deduplicação mandatória por ID de aula.
  - `calcularStreakFlashcards`: Cálculo rigoroso de sequência contínua de dias em que o aluno revisou ao menos 1 cartão.
  - `calcularPontosTotaisAluno`: Consolidação transparente com base no histórico de eventos (`EventoPontos`).
- **Desacoplamento Rigoroso de Nível CEFR:**
  - Horas acumuladas, pontuações, streaks ou badges **NUNCA concedem nem alteram o nível CEFR**.
  - Marcos de nível dependem estritamente da avaliação humana do professor e registro oficial em `historicoNivelRepository`.
  - Conquistas de nível são explicitamente rotuladas como *"Marco de nível operacional"* e **nunca** *"Certificação oficial CEFR"*.
- **Catálogo de Conquistas e Gestão:**
  - Modelos configuráveis por categoria, ícone, cor, tipo de critério, meta de progresso e tipo de prêmio (`badge_digital`, `placa_digital`, `elegibilidade_placa_fisica`).
  - Concessão automática avaliada pelo motor ou concessão manual pelo professor/admin com justificativa pedagógica obrigatória.
- **Placas Digitais e Físicas de Reconhecimento:**
  - **Placa Digital Comemorativa:** Rota dedicada e modal de exibição com selo de honra, nome gravado, data de concessão e código de autenticidade no padrão formal `MTD-PLK-XXXX`.
  - **Placa Física (Ciclo de 8 Estágios):** Máquina de estados completa:
    1. `elegivel` (desbloqueada pelo aluno)
    2. `interesse_registrado` (aluno manifestou interesse)
    3. `em_analise` (coordenação checa pré-requisitos)
    4. `aprovado` (autorizada confecção)
    5. `em_producao` (gravação a laser / fabricação)
    6. `pronta` (inspecionada para envio)
    7. `enviada` (código de rastreio opcional inserido manualmente pela equipe)
    8. `entregue` (conclusão) / `cancelado` (se houver impedimento).
  - **Aviso Obrigatório de Logística Offline:** O sistema não realiza integração com transportadoras ou serviços de frete; a confecção e remessa são coordenadas privadamente pela equipe da escola.
  - **Privacidade Sigilosa:** `observacoesInternas` da produção da placa e histórico de moderação nunca são transmitidos ao discente.
- **Central de Notificações Internas:**
  - Ícone de sino com contador de novas notificações no cabeçalho geral (`Header`).
  - Drawer lateral interativo (`NotificacoesDrawer`) com leitura de conquistas, atualizações de status de placa e avisos de moderação.
- **Integração aos Painéis:**
  - Dashboard do Aluno com card `AlunoConquistasSummaryCard` (pontos, sequência de estudos, horas e badges).
  - Dashboard Admin com cards `AdminComunidadeCard` e `AdminGamificacaoCard`.

### 3.10. ETAPA 9 (Concluída): Auditoria Geral, Estabilização e Preparação para Backend
- **Correções Obrigatórias da Etapa 8:**
  1. *Remoção de Pontos por Participação na Comunidade:* Nenhuma ação na comunidade (publicações, comentários, curtidas, reações, denúncias) gera pontos pedagógicos no sistema.
  2. *Revisão Terminológica:* O termo "Ofensiva" foi integralmente substituído por "Sequência de estudos" e "Sequência de flashcards" em toda a interface em português.
  3. *Identificador Demonstrativo:* Substituído "Código de autenticidade" por "Identificador demonstrativo" na pré-visualização de placas com disclaimer explícito de que a autenticação pública dependerá de backend.
  4. *Reações Únicas:* Cada usuário possui no máximo 1 reação por publicação, com alternância inteligente (toggle off) e substituição direta.
- **Configuração de Modo Demonstrativo:**
  - Chave explícita `NEXT_PUBLIC_DEMO_MODE=true` com fallback seguro `ModoProducaoAviso` quando desativado, bloqueando acessos não autenticados por simples troca de URL e sem simulação de logins falsos.
- **Documentação de Transição Arquitetural Produzida:**
  - `MAPA_DO_SISTEMA.md`: Inventário exaustivo de 100% das rotas, entidades, repositórios, origens de dados e comprovação de 0 arquivos órfãos.
  - `AUDITORIA_ETAPA_9.md`: Relatório de consistência e severidade classificando e corrigindo itens críticos, altos e médios.
  - `PLANO_MIGRACAO_BACKEND.md`: Roteiro de migração repositório por repositório em 6 fases de integridade.
  - `MODELO_DE_DADOS.md`: Schema DDL PostgreSQL completo com constraints, índices B-Tree, soft delete e auditoria.
  - `MATRIZ_DE_PERMISSOES.md`: Matriz RBAC para 4 papéis (Admin, Coordenação, Professor e Aluno) sobre 8 operações.
  - `DECISAO_DE_INFRAESTRUTURA.md`: Análise comparativa imparcial dos 14 critérios entre Vercel+Supabase e OneX VPS.
  - `.env.example`: Modelo de variáveis de ambiente sem exposição de credenciais ou segredos.
- **Validação E2E e Jornadas Integradas:**
  - `scripts/test-etapa9.mjs` validando com 100% de sucesso as 7 jornadas completas entre módulos e os filtros de permissão demonstrativa.

### 3.11. Reorganização do Dashboard Inicial do Aluno (`/aluno`)
- **Central Personalizada do Dia (Anti-Scroll):** Transformação da página inicial do aluno em um hub diário focado e compacto, eliminando duplicações de progresso e módulos gigantes empilhados.
- **Estrutura Desktop em Grade de 12 Colunas:**
  1. *Boas-vindas Compactas:* Saudação horária dinâmica (Bom dia / Boa tarde / Boa noite), nome do aluno, frase personalizada com contagem real de pendências, sequência de estudos compacta e data formatada.
  2. *Próxima Aula e Meu Plano de Hoje:*
     - *Próxima Aula (~7 colunas):* Título, data, horário, duração, turma, professor em thumbnail compacto (`w-11 h-11`), status do Zoom e link verificado, ou estado vazio inteligente quando não houver aula.
     - *Meu Plano de Hoje (~5 colunas):* Motor pedagógico determinístico (`planoDiarioMotor.ts`) com até 3 ações prioritárias (1. Item atrasado/reenvio, 2. Aula em 24h, 3. Prazo em 3-5 dias, 4. Flashcards vencidos, 5. Prática diária, 6. Feedback/conquista) e link para `/aluno/atividades`.
  3. *Resumo Rápido (4 cards compactos na mesma linha / 2 colunas no celular):* Progresso do módulo, Atividades pendentes, Flashcards para revisar e Pontos acumulados de dedicação.
  4. *Continue Sua Jornada:* Módulo atual, percentual, até 2 critérios concluídos + próximo critério pendente destacado, sem poluição de critérios na home.
  5. *Atualizações Recentes (2 cards lado a lado):*
     - *Feedback Recente:* Nivelamento oral concluído, nível formatado como "B1 — Intermediário", parecer do docente e link para detalhes.
     - *Conquista Recente:* Marco recente desbloqueado, pontos e link para galeria de conquistas.
  6. *Minha Semana:* Tempo dedicado, entregas concluídas, dias de prática e gráfico de evolução semanal com resumo textual claro.
### 3.12. Reorganização Executiva do Dashboard Inicial do Administrador (`/admin`)
- **Central de Governança e Decisão Rápida do Dia (Anti-Scroll):** Transformação do painel administrativo em um centro executivo de comando diário, eliminando verticalidade desnecessária, cards gigantes empilhados e indicadores financeiros inventados.
- **Barra Lateral Fixa (Sticky Desktop):** Navegação lateral mantida fixa no desktop (`sticky top-0 h-screen overflow-y-auto`), impedindo que o menu suma durante a rolagem ou deixe vazios à esquerda.
- **Motor Determinístico de Fila de Pendências (`adminPendenciasMotor.ts`):** Motor puro, tipado e testável com 7 níveis de prioridade acadêmica:
  1. Denúncia na comunidade pendente de moderação (Urgência máxima de segurança).
  2. Nivelamento oral / Self Presentation aguardando avaliação docente.
  3. Aula agendada nas próximas 24h sem link Zoom verificado.
  4. Módulo com 100% dos critérios aguardando validação pedagógica humana.
  5. Avaliação prática enviada aguardando correção do professor.
  6. Atividade prática submetida aguardando feedback.
  7. Placa de reconhecimento físico pronta para solicitação/envio logístico.
- **Estrutura Desktop em Grade de 12 Colunas:**
  1. *Cabeçalho Executivo Compacto:* Saudação horária profissional, contador dinâmico de itens pendentes de atenção imediata, mês de referência (Outubro de 2026) e botões de atalho rápido.
  2. *Grid de KPIs Operacionais (4 cards na mesma linha):* Alunos ativos (com taxa de retenção), Professores ativos, Turmas ativas e Frequência média consolidada.
  3. *Fila de Pendências & Próximas Aulas:*
     - *Fila de Pendências (~7 colunas):* Lista priorizada com badges de urgência, contexto curto, papel responsável e link de ação direta (limite de 4 itens + atalho para visão completa).
     - *Próximas Aulas (~5 colunas):* Aulas imediatas com avatar de professor/turma, horário, duração e badge visual do status do Zoom (Disponível vs. Pendente).
  4. *Esteira Pedagógica Integrada (4 cards compactos):* Self Presentation, Avaliações & Módulos, Flashcards SRS e Comunidade & Reconhecimento Físico.
  5. *Acompanhamento Pedagógico & Evolução Escolar:*
     - *Alunos em Acompanhamento (~6 colunas):* Alunos que necessitam de intervenção ou apoio pedagógico, com taxa de frequência, progresso e link para prontuário individual.
     - *Evolução de Alunos (~6 colunas):* Gráfico SVG limpo com gradiente roxo, tooltips interativos e resumo de novos alunos e retenção em 2026.
- **Consistência Curricular e Temporal:** Purga definitiva de menções legadas a disciplinas estranhas à escola ("Matemática", "Português", "Ciências") e datas de 2025, garantindo total alinhamento com a identidade de escola exclusiva de inglês do Método Paulo.

---

## 4. Decisões Estratégicas de Negócio e Regras Futuras Formalizadas

### 4.1. Gestão Manual de Links do Zoom
- **Diretriz:** Os links de encontros ao vivo (Zoom) serão cadastrados e atualizados manualmente pela equipe pedagógica. Sem link cadastrado, a interface exibe *“Link da aula ainda não disponibilizado”*.

### 4.2. Transcrições e Gravações de Aulas
- **Diretriz:** Inseridas ou anexadas pela equipe pedagógica após a aula síncrona.

### 4.3. Self Presentation (Apresentação Pessoal em Áudio/Vídeo)
- **Diretriz:** Toda submissão é obrigatoriamente avaliada e comentada por um professor. Não há aprovação automática.

### 4.4. Flashcards com Repetição Espaçada (SRS)
- **Diretriz:** Vocabulário cadastrado exclusivamente pela equipe; agendamento das revisões calculado pelo sistema com base no feedback do discente.

### 4.5. Bifurcação das Atividades Pedagógicas
- Testes objetivos possuem correção automática com políticas configuráveis de gabarito (`nota_imediata`, `gabarito_imediato`, `gabarito_apos_encerramento`).
- Exercícios práticos e discursivos entram em fila de correção pedagógica humana.

### 4.6. Controle de Presença e Frequência
- Presença registrada pelo professor na lista de chamada da aula.

### 4.7. Gamificação com Propósito
- Badges e conquistas regidas por marcos determinísticos e mérito real. Horas ou pontuações jamais atribuem nível CEFR automaticamente.

### 4.8. Comunidade Exclusiva com Moderação Ativa
- Ambiente seguro de conversação com moderação ativa por tutores. Sem chat em tempo real ou mensagens privadas (DMs).

### 4.9. Princípio de Estabilidade: Zero Integrações Externas no Core v1
- Foco absoluto na solidez das regras pedagógicas internas.

### 4.10. Diferenciação Conceitual: Horas de Estudo vs. Nível CEFR
- **Horas de Estudo:** Métrica quantitativa de dedicação acumulada.
- **Nível CEFR:** Métrica qualitativa de proficiência baseada em nivelamento e avaliações formais.

---

## 5. Limites do Escopo Atual (O Que NÃO Faz Parte do Escopo)

- ❌ Autenticação e gestão de senhas/tokens (armazenamento estritamente proibido no localStorage).
- ❌ Conexão com bancos de dados externos nesta fase (planejada para etapas futuras).
- ❌ Inteligência Artificial ou correção automática de fala/vídeo sem supervisão pedagógica.
- ❌ Chat em tempo real ou mensagens privadas individuais (DMs).
- ❌ Integração com APIs logísticas ou correios externos (gestão de placas é estritamente manual).
- ❌ Emissão de certificados oficiais CEFR externos.
- ❌ Pagamentos, WhatsApp ou integrações financeiras.
- ❌ Exclusão definitiva de registros (apenas ativação e inativação são permitidas).
- ❌ Integração direta com API do Zoom.
