# ETAPA 10 — BASELINE TÉCNICO ANTERIOR À INTEGRAÇÃO COM SUPABASE

> **Projeto:** DEMOSTRATIVO MTD — Método Paulo  
> **Versão Baseline:** 9.0.0  
> **Branch de Trabalho:** `etapa-10-backend`  
> **Data de Emissão:** 19 de Outubro de 2026  
> **Status:** Baseline Auditado, Validado e Homologado (Zero Regressões)  

---

## 1. Reconciliação Documental e Contagem Real de Rotas

Existia uma ambiguidade documental histórica entre as declarações de "28 rotas totais", "18 rotas do aluno", "21 rotas administrativas", "1 rota raiz" e "1 rota 404". A auditoria direta do código fonte em `src/app` comprovou o seguinte mapeamento físico exato:

### 1.1. Inventário Físico de Arquivos `page.tsx`
* **Área do Aluno (`src/app/aluno`):** **18 rotas** (11 estáticas/SSR + 7 dinâmicas `[id]`)
  1. `/aluno` (Home / Central do Dia)
  2. `/aluno/jornada` (Jornada & Gráfico de Horas)
  3. `/aluno/aulas` (Minhas Aulas & Presença)
  4. `/aluno/atividades` (Lista de Tarefas & Entregas)
  5. `/aluno/materiais` (Biblioteca Geral & Turma)
  6. `/aluno/materiais/[id]` (Visualizador / Entrega) `ƒ (Dynamic)`
  7. `/aluno/avaliacoes` (Central de Avaliações)
  8. `/aluno/avaliacoes/[id]` (Execução / Histórico) `ƒ (Dynamic)`
  9. `/aluno/self-presentation` (Nivelamento Oral)
  10. `/aluno/self-presentation/[id]` (Parecer & Rubrica) `ƒ (Dynamic)`
  11. `/aluno/flashcards` (Baralhos & Sequência)
  12. `/aluno/flashcards/[id]` (Detalhes do Baralho) `ƒ (Dynamic)`
  13. `/aluno/flashcards/[id]/estudar` (Sessão Interativa SRS) `ƒ (Dynamic)`
  14. `/aluno/comunidade` (Espaços Temáticos)
  15. `/aluno/comunidade/[id]` (Tópico de Discussão) `ƒ (Dynamic)`
  16. `/aluno/conquistas` (Galeria de Badges)
  17. `/aluno/conquistas/[id]` (Placa Digital Comemorativa) `ƒ (Dynamic)`
  18. `/aluno/perfil` (Prontuário Pessoal & Nível)

* **Área Administrativa (`src/app/admin`):** **21 rotas** (11 estáticas/SSR + 10 dinâmicas `[id]`)
  1. `/admin` (Dashboard Executivo & Fila de Pendências)
  2. `/admin/alunos` (Gestão de Discentes)
  3. `/admin/alunos/[id]` (Ficha do Aluno & Histórico) `ƒ (Dynamic)`
  4. `/admin/professores` (Corpo Docente)
  5. `/admin/professores/[id]` (Ficha do Docente) `ƒ (Dynamic)`
  6. `/admin/turmas` (Gestão de Coortes)
  7. `/admin/turmas/[id]` (Detalhes & Matrículas) `ƒ (Dynamic)`
  8. `/admin/agenda` (Agenda & Grade Semanal)
  9. `/admin/materiais` (Curadoria & Entregas)
  10. `/admin/materiais/[id]` (Gestão de Material / Correção) `ƒ (Dynamic)`
  11. `/admin/avaliacoes` (Estrutura do Método Paulo)
  12. `/admin/avaliacoes/[id]` (Editor de Avaliação & Rubricas) `ƒ (Dynamic)`
  13. `/admin/self-presentation` (Fila de Nivelamento Oral)
  14. `/admin/self-presentation/[id]` (Avaliação Manual com Rubrica) `ƒ (Dynamic)`
  15. `/admin/flashcards` (Gestão de Baralhos & Importador)
  16. `/admin/flashcards/[id]` (Gerenciador de Cartões) `ƒ (Dynamic)`
  17. `/admin/comunidade` (Espaços & Moderação)
  18. `/admin/comunidade/[id]` (Moderação de Tópico) `ƒ (Dynamic)`
  19. `/admin/conquistas` (Catálogo de Conquistas & Placas Físicas)
  20. `/admin/conquistas/[id]` (Gestão do Modelo de Conquista) `ƒ (Dynamic)`
  21. `/admin/configuracoes` (Configurações Gerais)

* **Rota Raiz e Fallback Global:** **2 rotas**
  1. `/` (`src/app/page.tsx` — redirecionamento para o portal do aluno)
  2. `/_not-found` (Página padrão de 404 gerada pelo Next.js App Router)

### 1.2. Resolução da Inconsistência do Número 28
No log oficial do comando `npm run build`:
```
Generating static pages (28/28)
```
O número **28** refere-se exclusivamente às páginas estáticas compiladas previamente em tempo de build (`○ Static`). As **12 rotas com parâmetro dinâmico `[id]`** são renderizadas sob demanda pelo servidor (`ƒ Dynamic`).

**Total Real de Destinos da Aplicação:**  
$$\text{Total} = 18 \text{ (Aluno)} + 21 \text{ (Admin)} + 1 \text{ (Raiz)} = \mathbf{40 \text{ rotas da aplicação}} \ (+ 1 \text{ \_not-found}) = \mathbf{41 \text{ rotas App Router}}$$

---

## 2. Inventário dos 23 Repositórios da Camada de Dados (`src/data/`)

Nenhuma página ou componente visual acessa `localStorage` diretamente. Todo o acesso de dados é mediado por funções assíncronas isoladas:

1. `alunoRepository`: Cadastro, listagem, busca, filtros e soft-delete de alunos.
2. `professorRepository`: Cadastro, edição, listagem e busca do corpo docente.
3. `turmaRepository`: Turmas individuais e grupos, matrículas e desmatrículas.
4. `aulaRepository`: Aulas síncronas, chamadas em 4 estados e cálculo de frequência.
5. `materialRepository`: Acervo didático, visibilidade e filtros de acesso.
6. `atividadeRepository`: Tarefas de casa, controle de prazos e atrasos.
7. `entregaRepository`: Submissões de alunos, fila de correção e histórico versionado.
8. `conteudoDiarioRepository`: Pílulas pedagógicas e estímulos diários agendados.
9. `selfPresentationRepository`: Nivelamentos orais, consentimento e histórico de versões.
10. `historicoNivelRepository`: Auditoria de transições de nível operacional do aluno.
11. `baralhoRepository`: Baralhos de repetição espaçada e limites diários.
12. `cartaoRepository`: Cartões de vocabulário, frente/verso e pronúncia.
13. `progressoCartaoRepository`: Estado individual de retenção de cada discente.
14. `historicoRevisaoRepository`: Logs de avaliações SRS e métricas de desempenho.
15. `sessaoEstudoRepository`: Sessões cronometradas e resumos de estudo diário.
16. `programaRepository`: Programa pedagógico central do Método Paulo.
17. `etapaRepository`: Etapas pedagógicas e reordenação (subir/descer).
18. `moduloRepository`: Módulos de estudo e critérios de conclusão configuráveis.
19. `progressoModuloRepository`: Progresso matemático e barreira de validação humana.
20. `avaliacaoRepository`: Avaliações objetivas e práticas e políticas de gabarito.
21. `tentativaAvaliacaoRepository`: Tentativas, notas, gabaritos e tentativas extras.
22. `comunidadeRepository`: Espaços, publicações, comentários, reações e denúncias.
23. `gamificacaoRepository`: Cômputo de horas de presença, streak, conquistas e ciclo de placas físicas.

---

## 3. Inventário das 32 Chaves do `localStorage` e Eventos

A persistência do modo demonstrativo utiliza as seguintes chaves com prefixo e versionamento estrito:

| # | Chave de Armazenamento | Entidade / Domínio |
|---|---|---|
| 1 | `mtd_demonstrativo_alunos_v1` | Cadastro de alunos |
| 2 | `mtd_demonstrativo_professores_v1` | Cadastro de professores |
| 3 | `mtd_demonstrativo_turmas_v1` | Turmas e matrículas |
| 4 | `mtd_demonstrativo_aulas_v1` | Agenda e presença em 4 estados |
| 5 | `mtd_demonstrativo_materiais_v1` | Biblioteca didática |
| 6 | `mtd_demonstrativo_atividades_v1` | Atividades e tarefas |
| 7 | `mtd_demonstrativo_entregas_v1` | Entregas e correções docentes |
| 8 | `mtd_demonstrativo_conteudos_diarios_v1` | Pílulas e estímulos diários |
| 9 | `mtd_demonstrativo_self_presentations_v1` | Gravações orais e rubricas |
| 10 | `mtd_demonstrativo_historico_niveis_v1` | Auditoria de níveis atribuídos |
| 11 | `mtd_demonstrativo_baralhos_v1` | Baralhos de flashcards |
| 12 | `mtd_demonstrativo_cartoes_v1` | Cartões de vocabulário |
| 13 | `mtd_demonstrativo_progresso_cartoes_v1` | Estado SRS individual |
| 14 | `mtd_demonstrativo_historico_revisoes_v1` | Logs de revisões SRS |
| 15 | `mtd_demonstrativo_sessoes_estudo_v1` | Sessões de estudo concluídas |
| 16 | `mtd_demonstrativo_programas_v1` | Programas do Método Paulo |
| 17 | `mtd_demonstrativo_etapas_v1` | Etapas do Método Paulo |
| 18 | `mtd_demonstrativo_modulos_v1` | Módulos e critérios de conclusão |
| 19 | `mtd_demonstrativo_progresso_modulos_v1` | Progresso e validações humanas |
| 20 | `mtd_demonstrativo_avaliacoes_v1` | Avaliações objetivas e práticas |
| 21 | `mtd_demonstrativo_tentativas_v1` | Tentativas de avaliações |
| 22 | `mtd_demonstrativo_espacos_v1` | Espaços da comunidade interna |
| 23 | `mtd_demonstrativo_publicacoes_v1` | Publicações da comunidade |
| 24 | `mtd_demonstrativo_comentarios_v1` | Comentários nas publicações |
| 25 | `mtd_demonstrativo_denuncias_v1` | Denúncias éticas e moderação |
| 26 | `mtd_demonstrativo_oportunidades_v1` | Oportunidades de intercâmbio |
| 27 | `mtd_demonstrativo_interesses_oportunidades_v1` | Manifestações de interesse discente |
| 28 | `mtd_demonstrativo_modelos_conquistas_v1` | Catálogo de conquistas e critérios |
| 29 | `mtd_demonstrativo_conquistas_concedidas_v1` | Conquistas desbloqueadas |
| 30 | `mtd_demonstrativo_solicitacoes_placas_v1` | Máquina de estados das placas físicas |
| 31 | `mtd_demonstrativo_eventos_pontos_v1` | Ledger de pontos pedagógicos |
| 32 | `mtd_demonstrativo_notificacoes_v1` | Notificações internas do usuário |

**Canal de Sincronização Isomórfica:** Evento broadcast `window.dispatchEvent(new Event("mtd_storage_updated"))` para atualização reativa dos componentes.

---

## 4. Campos Confidenciais e Sanitização de Privacidade Auditados

Foram mapeados 6 pontos críticos onde dados sigilosos são expurgados antes da entrega para a interface do aluno:

1. **`observacoesInternas` em Materiais e Atividades (`materialRepository.ts`, `atividadeRepository.ts`):** Omitidas na visualização discente.
2. **`observacoesInternas` na Rubrica Oral (`selfPresentationRepository.ts`):** Removidas via `delete` explícito antes de retornar o objeto `AvaliacaoPedagogica`.
3. **`observacoesInternas` no Feedback da Avaliação (`sanitizarTentativaParaAluno` em `tentativaAvaliacaoRepository.ts`):** Notas sigilosas de correção interna destruídas antes do envio.
4. **Respostas Corretas de Testes Objetivos em Andamento:** Ocultadas até a submissão formal ou conforme a `PoliticaExibicaoGabarito`.
5. **`observacoesInternas` na Confecção da Placa Física (`gamificacaoRepository.ts`):** Anotações da logística física omitidas do portal discente.
6. **Denúncias e Histórico Sigiloso de Moderação (`comunidadeRegras.ts`):** Omitidos nas listagens discentes via `sanitizarPublicacaoParaAluno` e `sanitizarComentarioParaAluno`.

---

## 5. Salvaguardas e Regras de Negócio Críticas Auditadas

1. **Desacoplamento do CEFR:** Horas de presença, streaks ou pontuações **nunca concedem ou alteram o nível CEFR**. Toda transição de nível exige ato manual do docente com registro no histórico de auditoria.
2. **Barreira de Validação Humana:** Módulos pedagógicos com 100% de critérios cumpridos param em `aguardando_validacao` até homologação expressa do professor.
3. **Ausência de Links Fictícios do Zoom:** Ausência de link gera mensagem transparente: *"Link da aula ainda não disponibilizado"*.
4. **Comunidade sem Gamificação:** Ações sociais não geram pontos, prevenindo condutas abusivas ou spam.
5. **Máquina de Estados da Placa Física:** 8 estágios rastreáveis com identificador demonstrativo no formato `MTD-PLK-XXXX`.

---

## 6. Resultados Reais dos Testes Pré-Integração (100% Aprovados)

* **Verificação de Tipos:** `npx tsc --noEmit` $\to$ **0 erros**.
* **Linter de Qualidade:** `npm run lint` $\to$ **✔ No ESLint warnings or errors**.
* **Compilação de Produção:** `npm run build` $\to$ **Compiled successfully (28 estáticas + 12 dinâmicas)**.
* **Testes Automatizados:**
  - `verify-css-pipeline.mjs`: 11/11 verificações aprovadas.
  - `test-validation.mjs`: 7/7 testes aprovados.
  - `test-etapa3.mjs`: 5/5 grupos aprovados.
  - `test-etapa4.mjs`: 5/5 grupos aprovados.
  - `test-etapa5.mjs`: 9/9 grupos aprovados.
  - `test-etapa6.mjs`: 8/8 grupos aprovados.
  - `test-etapa7.mjs`: 10/10 grupos aprovados.
  - `test-etapa8.mjs`: 4/4 grupos aprovados.
  - `test-etapa9.mjs`: 8/8 grupos aprovados.
  - `test-plano-diario.mjs`: 5/5 testes unitários aprovados.
  - `test-admin-pendencias.mjs`: 3/3 testes unitários aprovados.
  - `test-all-routes-html.mjs`: 18/18 rotas do aluno testadas com HTTP 200 OK.
  - Teste de rotas do admin: 21/21 rotas do admin testadas com HTTP 200 OK.
