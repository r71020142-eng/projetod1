# MATRIZ DE PERMISSOES (RBAC) • DEMOSTRATIVO MTD
**Versão:** 9.0.0 (Etapa 9 — Especificação de Governança e Segurança)  
**Data:** 18 de Outubro de 2026  
**Princípio Central:** *Menus ocultos não são proteção.* Todas as regras desta matriz devem ser aplicadas pelo backend via Row-Level Security (RLS) e Middlewares de autorização.  

---

## 1. Definição dos Papéis de Acesso

| Papel | Escopo e Responsabilidade Principal |
| :--- | :--- |
| **ADMINISTRADOR** | Gestão institucional plena, configurações de sistema, auditoria de logs, gestão de acessos e parametrizações globais. |
| **COORDENAÇÃO** | Gestão acadêmica e pedagógica, enturmação, supervisão de professores, homologação de marcos de nível e despacho de placas físicas. |
| **PROFESSOR** | Condução das aulas atribuídas, registro de presença/chamada, avaliação de Self Presentation, correção de atividades/provas e suporte pedagógico. |
| **ALUNO** | Aprendizado ativo, consumo de materiais liberados, realização de revisões de flashcards, submissão de entregas e interação na comunidade. |

---

## 2. Matriz Consolidada de Recursos e Operações

**Legenda:**
* `TOTAL`: Ação permitida irrestritamente sobre todos os registros.
* `PROPRIO`: Ação permitida exclusivamente sobre registros vinculados ao usuário (ex: suas próprias turmas, seus próprios envios).
* `APROVADO`: Requer permissão explícita ou validação formal prévia.
* `NAO`: Proibido. Qualquer requisição da API retornará HTTP 403 Forbidden.

| Recurso | Papel | Visualizar | Criar | Editar | Arquivar | Moderar | Avaliar | Publicar | Administrar |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Alunos & Prontuários** | Admin | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL | - | TOTAL |
| | Coordenação | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL | - | TOTAL |
| | Professor | PROPRIO | NÃO | PROPRIO | NÃO | NÃO | PROPRIO | - | NÃO |
| | Aluno | PROPRIO | NÃO | PROPRIO | NÃO | NÃO | NÃO | - | NÃO |
| **Professores** | Admin | TOTAL | TOTAL | TOTAL | TOTAL | - | - | - | TOTAL |
| | Coordenação | TOTAL | TOTAL | TOTAL | TOTAL | - | - | - | TOTAL |
| | Professor | PUBLICO | NÃO | PROPRIO | NÃO | - | - | - | NÃO |
| | Aluno | PUBLICO | NÃO | NÃO | NÃO | - | - | - | NÃO |
| **Turmas & Matrículas** | Admin | TOTAL | TOTAL | TOTAL | TOTAL | - | - | - | TOTAL |
| | Coordenação | TOTAL | TOTAL | TOTAL | TOTAL | - | - | - | TOTAL |
| | Professor | PROPRIO | NÃO | NÃO | NÃO | - | - | - | NÃO |
| | Aluno | PROPRIO | NÃO | NÃO | NÃO | - | - | - | NÃO |
| **Agenda & Aulas** | Admin | TOTAL | TOTAL | TOTAL | TOTAL | - | - | TOTAL | TOTAL |
| | Coordenação | TOTAL | TOTAL | TOTAL | TOTAL | - | - | TOTAL | TOTAL |
| | Professor | PROPRIO | PROPRIO | PROPRIO | PROPRIO | - | - | PROPRIO | NÃO |
| | Aluno | PROPRIO | NÃO | NÃO | NÃO | - | - | NÃO | NÃO |
| **Chamada & Presença** | Admin | TOTAL | TOTAL | TOTAL | TOTAL | - | TOTAL | TOTAL | TOTAL |
| | Coordenação | TOTAL | TOTAL | TOTAL | TOTAL | - | TOTAL | TOTAL | TOTAL |
| | Professor | PROPRIO | PROPRIO | PROPRIO | NÃO | - | PROPRIO | PROPRIO | NÃO |
| | Aluno | PROPRIO | NÃO | NÃO | NÃO | - | NÃO | NÃO | NÃO |
| **Materiais & Práticas** | Admin | TOTAL | TOTAL | TOTAL | TOTAL | - | - | TOTAL | TOTAL |
| | Coordenação | TOTAL | TOTAL | TOTAL | TOTAL | - | - | TOTAL | TOTAL |
| | Professor | TOTAL | PROPRIO | PROPRIO | PROPRIO | - | - | PROPRIO | NÃO |
| | Aluno | PROPRIO | NÃO | NÃO | NÃO | - | - | NÃO | NÃO |
| **Atividades & Entregas**| Admin | TOTAL | TOTAL | TOTAL | TOTAL | - | TOTAL | TOTAL | TOTAL |
| | Coordenação | TOTAL | TOTAL | TOTAL | TOTAL | - | TOTAL | TOTAL | TOTAL |
| | Professor | PROPRIO | PROPRIO | PROPRIO | PROPRIO | - | PROPRIO | PROPRIO | NÃO |
| | Aluno | PROPRIO | PROPRIO | PROPRIO | NÃO | - | NÃO | PROPRIO | NÃO |
| **Self Presentation** | Admin | TOTAL | NÃO | NÃO | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL |
| | Coordenação | TOTAL | NÃO | NÃO | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL |
| | Professor | TOTAL | NÃO | NÃO | NÃO | NÃO | TOTAL | PROPRIO | NÃO |
| | Aluno | PROPRIO | PROPRIO | PROPRIO | NÃO | NÃO | NÃO | PROPRIO | NÃO |
| **Histórico de Nível** | Admin | TOTAL | TOTAL | TOTAL | TOTAL | - | TOTAL | TOTAL | TOTAL |
| | Coordenação | TOTAL | TOTAL | TOTAL | TOTAL | - | TOTAL | TOTAL | TOTAL |
| | Professor | PROPRIO | PROPRIO | NÃO | NÃO | - | PROPRIO | PROPRIO | NÃO |
| | Aluno | PROPRIO | NÃO | NÃO | NÃO | - | NÃO | NÃO | NÃO |
| **Flashcards (Baralhos)**| Admin | TOTAL | TOTAL | TOTAL | TOTAL | - | - | TOTAL | TOTAL |
| | Coordenação | TOTAL | TOTAL | TOTAL | TOTAL | - | - | TOTAL | TOTAL |
| | Professor | TOTAL | PROPRIO | PROPRIO | PROPRIO | - | - | PROPRIO | NÃO |
| | Aluno | PROPRIO | NÃO | NÃO | NÃO | - | - | NÃO | NÃO |
| **Flashcards (Estudos)** | Admin | TOTAL | NÃO | NÃO | - | - | - | - | TOTAL |
| | Coordenação | TOTAL | NÃO | NÃO | - | - | - | - | TOTAL |
| | Professor | PROPRIO | NÃO | NÃO | - | - | - | - | NÃO |
| | Aluno | PROPRIO | PROPRIO | PROPRIO | - | - | - | - | NÃO |
| **Método & Módulos** | Admin | TOTAL | TOTAL | TOTAL | TOTAL | - | TOTAL | TOTAL | TOTAL |
| | Coordenação | TOTAL | TOTAL | TOTAL | TOTAL | - | TOTAL | TOTAL | TOTAL |
| | Professor | TOTAL | NÃO | NÃO | NÃO | - | PROPRIO | PROPRIO | NÃO |
| | Aluno | PROPRIO | NÃO | NÃO | NÃO | - | NÃO | NÃO | NÃO |
| **Avaliações (Testes)** | Admin | TOTAL | TOTAL | TOTAL | TOTAL | - | TOTAL | TOTAL | TOTAL |
| | Coordenação | TOTAL | TOTAL | TOTAL | TOTAL | - | TOTAL | TOTAL | TOTAL |
| | Professor | TOTAL | PROPRIO | PROPRIO | PROPRIO | - | PROPRIO | PROPRIO | NÃO |
| | Aluno | PROPRIO | NÃO | NÃO | NÃO | - | NÃO | NÃO | NÃO |
| **Tentativas de Prova** | Admin | TOTAL | NÃO | NÃO | TOTAL | - | TOTAL | TOTAL | TOTAL |
| | Coordenação | TOTAL | NÃO | NÃO | TOTAL | - | TOTAL | TOTAL | TOTAL |
| | Professor | PROPRIO | NÃO | NÃO | NÃO | - | PROPRIO | PROPRIO | NÃO |
| | Aluno | PROPRIO | PROPRIO | PROPRIO | NÃO | - | NÃO | PROPRIO | NÃO |
| **Comunidade (Espaços)**| Admin | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL | - | TOTAL | TOTAL |
| | Coordenação | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL | - | TOTAL | TOTAL |
| | Professor | TOTAL | NÃO | NÃO | NÃO | TOTAL | - | NÃO | NÃO |
| | Aluno | PROPRIO | NÃO | NÃO | NÃO | NÃO | - | NÃO | NÃO |
| **Publicações & Posts** | Admin | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL | - | TOTAL | TOTAL |
| | Coordenação | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL | - | TOTAL | TOTAL |
| | Professor | TOTAL | TOTAL | PROPRIO | PROPRIO | TOTAL | - | TOTAL | NÃO |
| | Aluno | PROPRIO | PROPRIO | PROPRIO | NÃO | NÃO | - | PROPRIO | NÃO |
| **Moderação de Denúncia**| Admin | TOTAL | - | TOTAL | TOTAL | TOTAL | - | TOTAL | TOTAL |
| | Coordenação | TOTAL | - | TOTAL | TOTAL | TOTAL | - | TOTAL | TOTAL |
| | Professor | NÃO | - | NÃO | NÃO | NÃO | - | NÃO | NÃO |
| | Aluno | NÃO | PROPRIO | NÃO | NÃO | NÃO | - | NÃO | NÃO |
| **Conquistas & Placas** | Admin | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL |
| | Coordenação | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL | TOTAL |
| | Professor | PROPRIO | NÃO | NÃO | NÃO | NÃO | PROPRIO | NÃO | NÃO |
| | Aluno | PROPRIO | PROPRIO | NÃO | NÃO | NÃO | NÃO | NÃO | NÃO |

---

## 3. Diretrizes de Aplicação de Segurança no Servidor

1. **Tokens JWT com Declaração de Papel (`role`):** O token de sessão emitido na autenticação deve conter o ID do usuário (`sub`), o papel (`administrador`, `coordenacao`, `professor`, `aluno`) e a lista de turmas em que está matriculado/leciona.
2. **Políticas RLS no PostgreSQL:** Para qualquer tabela contendo dados do aluno (ex: `entregas`, `tentativas_avaliacoes`, `progresso_cartoes`), aplicar política SQL direta:
   ```sql
   CREATE POLICY aluno_acesso_proprio ON entregas
   FOR ALL TO authenticated
   USING (aluno_id = auth.uid() OR auth.jwt() ->> 'role' IN ('administrador', 'coordenacao', 'professor'));
   ```
3. **Expurgo de Colunas Confidenciais:** O backend deve expurgar colunas como `observacoes_internas` através de DTOs específicos de saída antes do envio da resposta JSON.
