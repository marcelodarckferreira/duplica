# Contrato de UX — Duplica

## Contexto do produto

- Público: equipe administrativa e operadores da SEMED, em português do Brasil.
- Tarefas principais: controlar solicitações de cópia, cadastros e parque de impressão da sede.
- Localidade e tempo: `pt-BR`, calendário gregoriano e fuso `America/Sao_Paulo`.
- Acessibilidade-alvo: WCAG 2.2 AA.

## Fontes de negócio

| Escopo | Fonte autoritativa | Revisado em |
|---|---|---|
| Regras do produto | `docs/SPEC.md` | 2026-08-27 |
| Parque de impressão | `docs/superpowers/specs/2026-08-27-print-fleet-discovery-design.md` | 2026-08-27 |
| Permissões | `backend/app/core/permissions.py` e banco `role_permissions` | 2026-08-27 |
| Retenção operacional | `backend/app/print_fleet/monitoring.py` | 2026-08-27 |

## Contrato visual e componentes canônicos

- `DESIGN.md` registra a direção visual; os tokens reais de tema em `src/app/styles/styles.css` são canônicos.
- Temas suportados: claro, escuro e preferência do sistema.
- Botões, campos, select/listbox, diálogo, badge, switch e cards devem reutilizar `src/shared/ui`.
- Formulários usam `noValidate`, mensagens textuais e bloqueio do submit enquanto a mutação estiver pendente.
- Segredos ficam mascarados, podem ser revelados deliberadamente e nunca são preenchidos com o valor salvo.
- Estado nunca depende apenas de cor: badges, insumos e progresso têm texto acessível.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Table Selection | Sem seleção em massa | `UX-CONTRACT.md` | página | E2E |
| Select/Listbox | Plataforma nativa ou Radix Select compartilhado | `src/shared/ui/select.tsx` | native / authored | teclado + popup |
| Date | Plataforma nativa | componentes de domínio existentes | native | locale + teclado |
| Form | React Hook Form ou formulário manual controlado | schemas de cada domínio | create / edit | componente + E2E |
| Scrollbar | CSS global | `src/app/styles/styles.css` | geometria compacta | navegador |
| Toast | Mensagem contextual na superfície | views de domínio | success / warning / error | live region |
| CRUD | View do domínio + repository/query | `src/features/*` | return / stay | fluxo E2E |

## Navegação e conjuntos de dados

- O shell atual não utiliza roteador. Por isso, estado de aba, busca, filtro e expansão é transitório e não entra na URL; uma futura adoção de rotas deverá promover esses estados a parâmetros compartilháveis.
- Tabelas administrativas usam busca explícita, estado vazio, sem resultados, carregamento e erro distintos.
- O backend é responsável por paginação. A primeira entrega do parque consulta até 100 impressoras e exibe a contagem total; a adoção de controles de página é obrigatória antes de ultrapassar esse limite na sede.
- Em telas estreitas, tabelas preservam colunas e recebem rolagem horizontal; nenhuma informação crítica é truncada sem alternativa.

## Fluxos do parque de impressão

| Operação | Pendente | Sucesso | Falha/recuperação |
|---|---|---|---|
| Cadastrar rede | submit desabilitado | fecha diálogo, mensagem e recarrega dados | preserva formulário e mostra erro |
| Iniciar descoberta | confirmação explícita, sobretudo para rede grande | entra na fila e atualiza histórico | diálogo permanece recuperável |
| Confirmar impressora | exige nome e setor ativo da sede | fecha revisão e atualiza inventário | preserva os valores informados |
| Cadastrar manualmente | submit desabilitado | fecha diálogo e atualiza inventário | preserva formulário |
| Ativar monitoramento | switch representa o estado | atualiza impressora e insumos | mantém estado anterior após invalidação |

## Permissão, assincronismo e resiliência

- Leitura aceita `viewPrintFleet` ou `managePrintFleet`; mutações e controles de escrita exigem `managePrintFleet`.
- Sem permissão de leitura, o item do menu fica oculto; revogação em tempo real retorna à visão geral.
- Mutações são pessimistas e impedem envio duplicado. O cliente invalida apenas o domínio do parque após sucesso.
- Descobertas em fila ou execução atualizam o histórico a cada 3 segundos; leituras antigas continuam identificadas pela data quando a impressora fica sem comunicação.
- Expiração de sessão usa o tratamento global existente e volta ao login.

## Verificação

- Estática: `npm test`, `npm run build` e auditoria premium estrita.
- Backend: `cd backend && PYTHONPATH=. .venv/bin/pytest -q`.
- Infraestrutura: `docker compose config`.
- Navegadores-alvo: Chromium desktop e viewport móvel; temas claro e escuro; teclado e leitor de tela nos fluxos críticos.
- Homologação física HP/Epson e varredura integral da rede da sede são evidências externas pendentes e não podem ser substituídas por simulação.
