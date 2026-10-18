# ANÁLISE COMPARATIVA DE INFRAESTRUTURA • DEMOSTRATIVO MTD
**Versão:** 9.0.0 (Etapa 9 — Estudo de Arquitetura e Decisão de Infraestrutura)  
**Data:** 18 de Outubro de 2026  
**Finalidade:** Comparativo técnico e operacional objetivo entre as duas principais rotas de implantação da plataforma.  
**Princípio:** Apresentação imparcial sem escolha automática prévia, permitindo à liderança da escola e da equipe técnica deliberar com clareza.  

---

## 1. Visão Geral das Opções Avaliadas

* **OPÇÃO A (Serverless / Managed Cloud PaaS):**
  - **Frontend & SSR:** Next.js hospedado na Vercel.
  - **Dados & Auth:** PostgreSQL gerenciado, Supabase Auth e Supabase Storage.
* **OPÇÃO B (Dedicated Managed Server / OneX):**
  - **Aplicação, Banco & Storage:** Servidor dedicado ou VPS de alta performance gerenciado pela equipe técnica da OneX (Docker, PostgreSQL nativo, MinIO/S3 local ou anexo e autenticação própria com NextAuth/Keycloak).

---

## 2. Comparativo Detalhado pelos 14 Critérios de Decisão

| Critério | Opção A: Vercel + Supabase | Opção B: Servidor Gerenciado OneX |
| :--- | :--- | :--- |
| **1. Administração** | Painéis web prontos (dashboards da Vercel e Supabase Studio). Curva de aprendizado mínima para gestão básica de tabelas, logs e usuários. | Administração via painel OneX / Portainer / SSH. Exige maior conhecimento de sysadmin e governança de servidores Linux. |
| **2. Deploy e CI/CD** | Deploy automático a cada git push com preview branches e rollbacks instantâneos de frontend. Migrações de banco via Supabase CLI. | Deploy orquestrado via GitHub Actions / Webhooks OneX para containers Docker. Rollbacks dependem de versionamento de imagens. |
| **3. Banco de Dados** | PostgreSQL gerenciado de alta disponibilidade com extensões pré-instaladas (`uuid-ossp`, `pgvector`), backups diários automáticos e pooler integrado (PgBouncer). | PostgreSQL dedicado nativo com controle irrestrito de parâmetros de memória (`shared_buffers`, `work_mem`), tuning fino de conexões e sem limites de pool serverless. |
| **4. Autenticação** | Supabase Auth nativo (JWT, OAuth Google/Apple, magic links, RLS integrado ao banco no nível do SQL). Menor esforço de desenvolvimento inicial. | NextAuth.js / Auth.js / Keycloak integrado diretamente à aplicação. Controle absoluto sobre o ciclo de vida dos tokens e esquemas de senha. |
| **5. Armazenamento** | Supabase Storage com CDN global (Cloudflare), políticas de acesso por bucket e geração de URLs assinadas com tempo de expiração nativo. | Armazenamento de arquivos no disco do servidor dedicado ou em bucket MinIO local/anexo. Sem custos de tráfego por gigabyte externo. |
| **6. Backups e Retenção** | Backups automáticos diários gerenciados pelo provedor com Point-In-Time Recovery (PITR) disponível nos planos Pro/Enterprise. | Rotinas customizadas de `pg_dump` e snapshot diário de disco com replicação remota em storage externo (S3/Wasabi/B2). |
| **7. Escalabilidade** | Escalabilidade horizontal automática em Serverless Edge para o frontend. O banco requer upgrade de camada (compute add-ons) conforme o volume de alunos cresce. | Escalabilidade vertical com recursos dedicados garantidos (CPUs e RAM exclusivas, sem contenção de vizinhos ruidosos). Suporta picos de uso simultâneo de turmas. |
| **8. Monitoramento** | Métricas nativas de requisições, Web Vitals, Edge latency (Vercel Analytics) e métricas de CPU/RAM/IOPS do banco (Supabase Studio). | Monitoramento de métricas de servidor (Prometheus, Grafana, Node Exporter, Uptime Kuma) sob medida e logs centralizados. |
| **9. Custos** | Modelo freemium / pay-as-you-grow. Custo previsível inicial (Vercel Pro $20/mês + Supabase Pro $25/mês = ~$45/mês base). Pode aumentar com tráfego e banco grande. | Custo fixo mensal de infraestrutura e gestão acordado com a OneX. Independe do volume de tráfego ou quantidade de requisições de alunos. |
| **10. Dependência de Fornecedor** | Alto acoplamento com o ecossistema Vercel e Supabase (funções serverless proprietárias e RLS do Supabase). | Baixo acoplamento (Open Source total). A stack Docker + PostgreSQL + Next.js roda em qualquer servidor dedicado ou nuvem pública. |
| **11. Migração Futura** | Migração do banco é simples (dump PostgreSQL padrão). Migração de arquivos requer exportação via API do bucket. | Migração imediata: basta mover os volumes Docker e o dump SQL para outro provedor a qualquer momento. |
| **12. Responsabilidade Técnica** | Compartilhada: a infraestrutura física, patches de segurança do SO e atualizações do PostgreSQL são mantidos pelos fornecedores PaaS. | Centralizada na equipe da OneX: segurança de borda, firewall, patches de kernel Linux, certificados SSL e manutenção preventiva. |
| **13. Compatibilidade Zoom API** | Totalmente compatível: endpoints serverless e webhooks do Zoom (Server-to-Server OAuth) recebem eventos de criação e encerramento de aulas. | Totalmente compatível: serviço Node.js / Next.js recebe webhooks com IP estático dedicado, facilitando liberação de firewalls corporativos. |
| **14. Processamento de IA** | Funções serverless têm timeout máximo (15s a 60s nos planos padrão), exigindo filas assíncronas externas (ex: Inngest, QStash) para transcrições longas. | Excelente para IA: o servidor dedicado pode rodar processos em segundo plano de longa duração (ex: transcrição local via Whisper, filas BullMQ). |

---

## 3. Síntese dos Cenários de Decisão

### Quando optar pela OPÇÃO A (Vercel + Supabase):
* Se a prioridade for **velocidade de lançamento da versão 1.0** com o menor esforço de configuração de infraestrutura.
* Se a equipe interna for enxuta e não desejar alocar tempo para administração de servidores Linux, patches de kernel ou tuning de banco de dados.
* Se o modelo de pagamento internacional em dólar via cartão de crédito corporativo for aceito e viável para a gestão da escola.

### Quando optar pela OPÇÃO B (Servidor Gerenciado OneX):
* Se a escola exigir **previsibilidade total de custos em moeda nacional (BRL)** sem surpresas de cobrança por tráfego ou picos de uso.
* Se a soberania e privacidade dos dados dos alunos exigirem ambiente de hospedagem dedicado e sob controle direto da parceria tecnológica.
* Se houver planos de rodar **modelos locais de transcrição e IA (Whisper)** diretamente no servidor sem dependência de APIs externas por minuto.
* Se a OneX já possuir equipe de DevOps com SLA ativo e suporte técnico 24/7 estabelecido.

---

## 4. Próximo Passo

A decisão formal de infraestrutura deve ser ratificada pela liderança antes do início da **Etapa 10 (Backend e Banco de Dados)**, momento em que os scripts de provisionamento de tabelas (`MODELO_DE_DADOS.md`) e os adaptadores de repositório (`PLANO_MIGRACAO_BACKEND.md`) serão conectados ao ambiente escolhido.
