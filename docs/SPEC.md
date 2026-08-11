# Duplica — Software Specification (SPEC)

> **Status documental:** especificação viva do MVP atual. Estrutura espelhada em `docs/specs/SPEC.md` do ForgeHub (mesmo padrão organizacional de spec), adaptada ao domínio deste projeto. Complementa — não substitui — `docs/superpowers/specs/2026-08-10-grafica-design.md` (design) e `docs/superpowers/plans/2026-08-10-grafica-mvp.md` (plano de implementação).

## 1. Scope
Este documento define a especificação funcional e técnica do Duplica, o sistema de controle de cópias da SEMED: solicitações de impressão/cópia originadas por Escolas ou pela Sede SEMED, produção, entrega, histórico de status, ranking de unidades e consolidação mensal.

**Nome do produto (2026-08-10, a pedido explícito):** o sistema passou a se chamar **Duplica** — era "Gráfica" até então. A troca inicial cobriu só o nome visível (título da página, tela de login, sidebar, este documento e os READMEs); identificadores técnicos internos (nome do banco Postgres `grafica`, container Docker `grafica_postgres`, `package.json`, chaves de `localStorage` como `grafica.semed.theme`/`grafica.semed.token`) continuam usando "grafica" deliberadamente, por decisão explícita de manter esse rename de baixo risco (sem mexer em infraestrutura em uso). **Atualização, ainda 2026-08-10, a pedido explícito:** a pasta do projeto também foi renomeada, de `/root/project/grafica` para `/root/project/duplica` — essa foi a única mudança de escopo ampliado; banco/container/`package.json`/chaves de `localStorage` seguem "grafica".

O sistema tem um backend real (`backend/`, Python/FastAPI, ver §3.2) com Postgres — a persistência deixou de ser só `localStorage` do navegador (2026-08-10). O frontend acessa esses dados via `src/domains/<domain>/repository.ts`, que agora chama a API HTTP em vez de ler/escrever `localStorage` diretamente; a camada de repositório continua isolada por domínio, então essa troca não exigiu reescrever `rules.ts` nem as Views.

## 2. Canonical Stack Constraints (Frameworks e Linguagem)

### 2.1 Linguagem
- TypeScript em modo `strict` (`tsconfig.app.json`), `target: ES2022`, `jsx: react-jsx`.
- Sem `allowJs` — todo o código-fonte é TypeScript.
- Idioma da interface: português do Brasil (pt-BR) em todos os textos, rótulos, formatação de número (`Intl.NumberFormat("pt-BR")`) e data (`Intl.DateTimeFormat("pt-BR")`). Não há i18n multi-idioma neste MVP — pt-BR é o único idioma suportado.

### 2.2 Frameworks e Bibliotecas
- React 19 + ReactDOM 19
- Vite 6 (dev server e build)
- Vitest 3 + Testing Library (`@testing-library/react`, `jest-dom`, `user-event`) + jsdom
- lucide-react (ícones)
- Sem framework de UI componentizado (nada de shadcn/Radix/MUI de terceiros) nas telas de conteúdo (dashboard, solicitações, unidades, usuários, relatórios) — decisão deliberada de manter a superfície mínima até a fase de API real. Estilo em CSS global único (`src/styles.css`), com tema claro/escuro controlado por atributo `data-theme` na raiz (ver `src/shell/theme.ts`), sem CSS-in-JS.
- **Padrão formal (2026-08-10, a pedido explícito): tela de login + sidebar + menu de conta usam Tailwind CSS 3 + padrão de componentes "estilo shadcn" feitos à mão** (`class-variance-authority` + `clsx` + `tailwind-merge`, sem dependência de Radix/shadcn CLI), mesmo padrão técnico usado pelo ForgeHub (`frontend/`). Não é mais uma "exceção de escopo único" — foi definido como o padrão de UI para toda a "casca" da aplicação (`src/shell/`): `LoginView.tsx`, `Sidebar.tsx` (colapsável ícone-só ↔ expandida, item ativo como *pill* de fundo — sem borda lateral —, menu de conta/perfil no rodapé com dropdown de tema/sair, espelhando `Sidebar.tsx`/`UserSettingsMenu.tsx` do ForgeHub) e os componentes em `src/shell/ui/` (`button.tsx`, `input.tsx`, `label.tsx`, `modal.tsx`) + `src/lib/utils.ts` (`cn()`). As telas de CONTEÚDO (dashboard, unidades, usuários, relatórios) continuam 100% em `src/styles.css`. **Exceção pontual (2026-08-10, a pedido explícito):** `src/domains/requests/RequestsView.tsx` (tela de Solicitações) também usa Tailwind — ícones de ação por linha (editar/excluir), a tela de formulário em tela cheia e o `ConfirmModal` de exclusão — mantendo o restante do layout (`.requests-layout`, `.panel`, `.data-table` etc.) em `src/styles.css`; os dois sistemas convivem no mesmo arquivo. `tailwind.config.js` tem `corePlugins.preflight: false` e `content` listado arquivo a arquivo (shell + `RequestsView.tsx`), para não vazar reset/estilo para as demais telas de conteúdo. Cores do Tailwind mapeadas para as mesmas CSS custom properties de `src/styles.css` (`var(--accent)`, `var(--surface)`, `var(--sidebar)`, `var(--sidebar-text)`, `var(--sidebar-muted)` etc.) — nenhuma paleta nova, tema claro/escuro continua funcionando em todo o shell. Estado de colapso da sidebar persistido em `localStorage` (`grafica.semed.sidebarCollapsed`).
- Qualquer biblioteca de UI adicional além desse padrão deve ser avaliada antes de adoção (licença, acessibilidade, peso de bundle, manutenção).

## 3. Architecture Overview

### 3.1 Frontend
- React + Vite SPA
- TypeScript
- Regras de negócio como funções puras testáveis em `src/domains/<domain>/rules.ts`
- Camada de acesso a dados isolada em `src/domains/<domain>/repository.ts`, chamando a API (`src/lib/apiClient.ts`) — `units`/`users`/`requests` fazem `fetch` autenticado; `reports` continua sem `repository.ts` próprio, computando client-side sobre `CopyRequest[]` já vindo da API
- Token JWT guardado em `localStorage` (`grafica.semed.token`, só o token — não é mais onde os dados do domínio vivem) via `src/lib/apiClient.ts`

### 3.2 Backend
- **Decisão de stack (2026-08-10, a pedido explícito):** backend real em **Python/FastAPI**, não mais em ASP.NET Core como o plano original deste documento prescrevia. Motivo registrado pelo usuário: "para aplicação pequena vou escolher essa abordagem [Python]; para desenvolvimento grande vou usar o C#" — ou seja, é uma política de stack por porte de projeto, não uma reavaliação técnica de qual é "mais segura" (as duas são equivalentes em segurança quando bem implementadas; ver `backend/README.md` para o comparativo). O Duplica, como MVP pequeno, fica em Python; projetos maiores do mesmo operador continuam candidatos a C#/.NET.
- Implementado em `backend/` (FastAPI + SQLAlchemy 2.0 async + asyncpg + Alembic + passlib/bcrypt + python-jose/JWT + slowapi), mesmo padrão de autenticação do ForgeHub (JWT Bearer + bcrypt), mas com CORS restrito, rate limit no login e sem segredo padrão inseguro (gaps que o ForgeHub tem e este projeto não replica — ver `backend/app/core/`).
- Postgres provisionado via `docker-compose.yml` (porta `5435`), schema versionado via Alembic (`backend/alembic/`), seed em `backend/app/db/seed.py`.
- `src/domains/<domain>/repository.ts` no frontend chama essa API via `src/lib/apiClient.ts` — a "fonte de verdade" deixou de ser o `localStorage` do navegador (ver §9, critério de aceitação atualizado).

### 3.3 Dados e Governança
- Histórico de status por solicitação (`StatusHistoryEntry[]`) como trilha de auditoria mínima
- Perfis de usuário com permissões explícitas (ver 4.4)

### 3.4 Login
Tela de entrada única (`src/shell/LoginView.tsx`, renderizada por `src/shell/AppShell.tsx` quando o estado `user` é `null`), sem rota própria:
- Formulário com `E-mail` e `Senha`, autenticação via `usersRepo.authenticate(email, senha)` (`src/domains/users/repository.ts`) → `POST /api/v1/auth/token` no backend, contra a tabela `users` do Postgres (senha com hash bcrypt, nunca texto puro — ver §3.2).
- Campo de senha com botão de visualizar/ocultar (ícone `Eye`/`EyeOff`, estado local no próprio `LoginView`).
- Erro de credencial inválida exibido inline, sem redirecionamento.
- Sem bloco de "Credenciais demo" na tela (removido a pedido explícito, 2026-08-10) — as contas de teste continuam documentadas no `README.md`.
- Painel de branding (visível em telas ≥ `lg`) com `src/shell/BackgroundChart.tsx`: gráfico de barras + linha em SVG, puramente decorativo (`aria-hidden`), animado só via CSS (`@keyframes` em `tailwind.config.js`, sem framer-motion/dependência de animação nova).
- Autenticação real via JWT (Bearer token) — deixou de ser demonstrativa em 2026-08-10 (ver §3.2). O item de Security Spec da seção 13 permanece como próximo passo para revisão formal (rotação de token, políticas de senha, etc.), mas o mecanismo de autenticação em si já não é mais texto puro em `localStorage`.

### 3.5 Sidebar (Navegação Principal)
Após login, o layout é `<Sidebar>` (`src/shell/Sidebar.tsx`, padrão ForgeHub — ver §2.2) + `main.workspace` (conteúdo), sem roteador (`react-router`) — a view ativa é estado local (`View`) trocado por clique. Itens agrupados por seção (2026-08-10, a pedido explícito, mesmo padrão do ForgeHub — rótulo de grupo em maiúsculas, sem interação própria):

- **Operação** — Dashboard, Solicitações, Unidades (sempre visíveis).
- **Administração** — Usuários e Perfis de Acesso (ambos só quem tem `manageUsers` — ver §3.12), Auditoria (só quem tem `manageAudit`, ver §3.7). Grupo inteiro fica oculto se o usuário não tiver nenhuma das duas permissões (ex.: Operador, Consulta).

Não existe mais item "Relatórios" na sidebar — seu conteúdo (consolidação mensal + ranking completo por unidade) foi incorporado à tela de Dashboard (2026-08-10, a pedido explícito — ver §5.2/§5.5).

Colapsável (ícone-só ↔ expandida, botão no cabeçalho da sidebar, estado em `localStorage`). Item ativo marcado só por *pill* de fundo (`bg-white/15`) — sem borda lateral, sem indicador separado no ícone —, igual ao `bg-accent`/`text-accent-foreground` do ForgeHub. O menu de conta (avatar com iniciais, nome, perfil) fica no **rodapé da sidebar** (não mais na topbar), com dropdown: seção "Perfil" (nome/e-mail/perfil), seção "Configurações" (alternar tema claro/escuro) e "Sair" — mesma estrutura do `UserSettingsMenu` do ForgeHub. A topbar (`header.topbar`, ainda em `src/styles.css`) hoje só exibe o título da view ativa.

**Simplificação assumida vs. o ForgeHub:** sem overlay off-canvas para mobile (o ForgeHub tem um modo específico abaixo de 768px); a sidebar aqui usa a mesma largura colapsável em qualquer tamanho de tela, sem comportamento responsivo automático. Pode ser adicionado depois se necessário.

### 3.6 Organização por domínio (padrão-alvo, espelha o ForgeHub)
O ForgeHub organiza o backend em módulos por domínio, cada um tocando exatamente três camadas (`db/models/<domain>.py`, `api/schemas/<domain>.py`, `api/routes/<domain>.py`). O Duplica não tem backend ainda, mas a **mesma intenção** — cada domínio de negócio isolado em seu próprio módulo, com regras/tipos/dados separados de apresentação — deve ser aplicada ao frontend, trocando as três camadas do backend pelas três camadas equivalentes do frontend-only:

```
tipos + regras puras   →  src/domains/<domain>/types.ts + rules.ts (+ rules.test.ts)
acesso a dados          →  src/domains/<domain>/repository.ts (+ repository.test.ts)
apresentação            →  src/domains/<domain>/<Domain>View.tsx
```

Domínios de negócio: `requests` (solicitações — `src/domains/requests/`), `units` (unidades/setores — `src/domains/units/`), `users` (contas e permissões — `src/domains/users/`), `reports` (métricas + ranking + consolidação mensal, todas exibidas dentro do Dashboard — `src/domains/reports/`, lê `CopyRequest[]` do domínio `requests`, sem `repository.ts`/`types.ts` próprios; não tem `<Domain>View.tsx` de tela própria desde que a antiga tela "Relatórios" foi incorporada ao `DashboardView.tsx`, 2026-08-10). Cada domínio tem sua própria pasta em `src/domains/<domain>/`, nunca lógica de outro domínio. Do lado do backend (`backend/`), o mesmo isolamento existe em Python: `app/db/models/`, `app/schemas/`, `app/api/routes/`, um arquivo por domínio (exceto `reports`, que não tem model/tabela própria — computa sobre `copy_requests`, espelhando o frontend).

Peças que **não** são um domínio de negócio ficam fora de `src/domains/`, em `src/shell/`:
- `AppShell.tsx` — estado da sessão/UI (usuário logado, tema, view ativa, filtros e drafts em trânsito), monta `<Sidebar>` + topbar + roteamento por estado (`View`); chama diretamente os `repository.ts` dos 4 domínios (sem fachada intermediária) e passa dados/callbacks para as Views de cada domínio, sem conter regra de negócio própria.
- `Sidebar.tsx` — navegação lateral + menu de conta/perfil no rodapé, padrão ForgeHub (ver §2.2/§3.5).
- `LoginView.tsx` — tela de login (não é um domínio; é entrada de sessão).
- `theme.ts` — tema claro/escuro é preocupação transversal de UI, não regra de negócio.

Esta reorganização foi aplicada "estrutura igual ao ForgeHub": **domínio por domínio, não em um único passo** (mesmo princípio de adoção incremental que o ForgeHub usa para o padrão ViewModel Hook — "de vagar por tela"). Migração concluída — `App.tsx`, `src/domain/` e `src/services/` foram removidos; ver estrutura final na seção 10.1.

| Domínio | Extraído para `src/domains/` | Status |
|---|---|---|
| `requests` | sim | migrado |
| `units` | sim | migrado |
| `users` | sim | migrado |
| `reports` | sim | migrado |
| `shell` (AppShell/LoginView/theme) | sim | migrado |

### 3.7 Log de auditoria (2026-08-10, a pedido explícito)
Escopo: **só Solicitações** (não cobre Unidades nem Usuários). Toda criação, edição, exclusão e mudança de status de uma `CopyRequest` gera uma entrada de auditoria, gravada na mesma transação da operação que a originou (`record_audit()`, `backend/app/core/audit.py`, chamado pelas rotas de `backend/app/api/routes/requests.py`).
- **Modelo:** `AuditLog` (`backend/app/db/models/audit.py`) — `id`, `action` (`create`|`update`|`delete`|`status_change`), `request_id`, `request_code`, `actor_id`, `actor_name`, `detail`, `created_at`. Deliberadamente **sem foreign key** para `copy_requests`: a trilha de auditoria precisa sobreviver à exclusão da solicitação que a originou.
- **Autoria:** ator e timestamp vêm do usuário autenticado via JWT no backend — nunca de parâmetro enviado pelo frontend (elimina spoofing).
- **Retenção:** 60 dias, expurgo automático via job diário do APScheduler (`backend/app/main.py`, `scheduler.add_job(..., "interval", days=1)`) — não é expurgo "preguiçoso" (só ao ler), roda independente de alguém abrir a tela.
- **Acesso:** só quem tem a permissão `manageAudit` (hoje, Admin) vê `GET /api/v1/audit-log` e pode limpar o log manualmente (`DELETE /api/v1/audit-log`, com confirmação via `window.confirm` — não usa o `ConfirmModal` do §3.8, que ficou restrito ao fluxo de exclusão de solicitação).
- **Frontend:** domínio `src/domains/audit/` (`types.ts` + `repository.ts` + `AuditView.tsx`, sem `rules.ts` — não há regra de negócio pura aqui, só listagem), item "Auditoria" na sidebar (§3.5).

### 3.8 Tela de Solicitações: consulta vs. edição/inclusão (2026-08-10, a pedido explícito)
`src/domains/requests/RequestsView.tsx` deixou de mostrar lista e formulário lado a lado — agora são **duas telas cheias mutuamente exclusivas** dentro da mesma view, controladas por uma prop `mode: "list" | "form"` derivada em `AppShell.tsx` (`isCreatingRequest || editingRequestId`):
- **Consulta** (`mode: "list"`): tabela de solicitações (`RequestTable`, também reaproveitada pelo Dashboard em modo compacto) com ícone de editar e excluir por linha, além do painel de detalhe com as mesmas ações. Botão "Nova solicitação" abre a tela de formulário em modo criação.
- **Edição/Inclusão** (`mode: "form"`): mesmo componente de formulário para os dois casos — só o título ("Nova solicitação" vs. "Editar solicitação") muda, conforme `editingRequestId` estar vazio ou não. Botão "Voltar" retorna à consulta sem salvar.
- **Exclusão:** o ícone/botão "Excluir" não apaga direto — abre `ConfirmModal` (`src/shell/ui/modal.tsx`, Tailwind, `role="alertdialog"`), que substitui o antigo `window.confirm()` nesse fluxo específico. O modal mostra estado de carregamento (`isConfirming`, spinner, botões desabilitados) enquanto a chamada à API está em andamento.
- **Loading/bloqueio em botões:** salvar (formulário), excluir (modal) e mudança de status (painel de detalhe) desabilitam o(s) botão(ões) envolvido(s) e mostram um spinner/rótulo de progresso (`animate-spin`) enquanto a chamada assíncrona correspondente não termina — evita duplo submit/duplo clique.

### 3.9 Upload de foto do usuário (2026-08-10, a pedido explícito)
Segue o mesmo padrão visual do `UserSettingsMenu.tsx` do ForgeHub (avatar circular + botão de câmera sobreposto no canto), mas implementado em CSS simples (`src/styles.css`, classes `.avatar-*`) — não expande o escopo do Tailwind (§2.2) para `UsersView.tsx`.
- **Armazenamento:** disco local do backend (`backend/uploads/avatars/`, fora do controle de versão — ver `.gitignore` na raiz do projeto), não base64 no Postgres. Servido como arquivo estático em `/uploads/...` (`StaticFiles`, montado em `backend/app/main.py`).
- **Upload:** só disponível ao editar um usuário já existente (precisa de `id`), via `POST /api/v1/users/{id}/avatar` (multipart/form-data), restrito a quem tem `manageUsers`. Validação: apenas PNG/JPEG/WEBP, até 2 MB; arquivo antigo é removido do disco ao trocar.
- **Modelo:** coluna `avatar_path` em `users` (relativa a `backend/uploads/`), nunca exposta direto na API — `UserOut` expõe só `avatar_url` (computado) e omite `avatar_path` da serialização.
- **Frontend:** `User.avatarUrl` (`src/domains/users/types.ts`), avatar exibido (imagem ou iniciais como fallback) na lista de contas, no formulário de edição e no menu de conta da sidebar (`Sidebar.tsx`) — os três lugares onde o ForgeHub também mostra o avatar do usuário.

### 3.10 Papel Gerente (2026-08-10, a pedido explícito)
Quarto papel além de Admin/Operador/Consulta, fixo no código (não é configurável via UI — ver §3.12). Tem as mesmas permissões do Admin **exceto** `manageAudit`: `viewDashboard`, `createRequests`, `editRequests`, `updateProduction`, `manageUnits`, `manageUsers`. Motivação explícita do usuário: "somente o usuário com perfil de gerente e administrador tem direito de criar usuário" — ou seja, Gerente e Admin são os dois papéis que podem gerenciar contas; só Admin limpa o log de auditoria. Definido em `backend/app/core/permissions.py` (`ROLE_PERMISSIONS`) e `src/domains/users/rules.ts` (`ROLE_PERMISSIONS`, exportado para a tela de Perfis de Acesso — ver §3.12).

### 3.11 Login por usuário ou e-mail (2026-08-10, a pedido explícito)
Toda conta agora tem um `username` (coluna `users.username`, único, obrigatório, `backend/app/db/models/user.py`) além do `email` — mesmo padrão do ForgeHub. O login (`POST /api/v1/auth/token`) aceita **qualquer um dos dois** no mesmo campo (`identifier`), consultando `User.email == identifier OR User.username == identifier`. O campo de login no frontend (`LoginView.tsx`) mudou de `type="email"` para `type="text"` — obrigatório, já que um username como `admin` não é um e-mail válido para a validação nativa do navegador. Migração `e4687d66643b_add_username_to_users.py` faz backfill de `username` a partir do prefixo do e-mail (`split_part(email, '@', 1)`) antes de aplicar `NOT NULL`/`UNIQUE`, para não quebrar contas já existentes.

### 3.12 Perfis de acesso (2026-08-10, a pedido explícito, padrão ForgeHub)
Item "Perfis de Acesso" no grupo Administração da sidebar (`src/domains/users/AccessProfilesView.tsx`), visível para quem tem `manageUsers`. Mostra uma matriz fixa (papel × permissão, ✓/—) dos 4 papéis — **somente leitura**: não é possível criar papéis novos nem alternar permissões pela UI (decisão explícita do usuário: "fixo no código", não dinâmico via banco — ver também §3.10). Fonte de verdade da matriz é `ROLE_PERMISSIONS` de `src/domains/users/rules.ts`, a mesma usada por `canPerform()`.

### 3.13 Menu de conta: perfil próprio, senha e tema (2026-08-10, a pedido explícito, padrão ForgeHub)
O dropdown de conta na sidebar (`Sidebar.tsx`) segue a mesma estrutura do ForgeHub: seção "Conta" (Minha conta / Alterar senha) + seção "Tema" (Claro/Escuro/Sistema, com check no ativo) + Sair.
- **Minha conta / Alterar senha:** dois modais (`src/shell/AccountModals.tsx`, `AccountModal`/`ChangePasswordModal`, Tailwind), ambos falando com `PATCH /api/v1/auth/me` (autoatendimento — qualquer usuário autenticado edita seu próprio nome/e-mail/senha, sem precisar de `manageUsers`; nunca altera papel/status). Trocar a senha exige a senha atual correta (`current_password`, verificada no backend antes de aceitar a nova) — proteção extra contra sequestro de sessão, que a edição feita por um Admin via tela de Usuários não tem (lá é o Admin que decide a senha de outra conta).
- **Tema em 3 vias:** `ThemeMode` passou de `"light" | "dark"` para `"light" | "dark" | "system"` (`src/shell/theme.ts`). `resolveTheme(mode, prefersDark)` calcula o tema efetivamente aplicado (`data-theme`); no modo `"system"`, a preferência do SO é observada em tempo real via `matchMedia("(prefers-color-scheme: dark)")` (`AppShell.tsx`, listener de `change`), então uma troca de tema do SO com o app aberto reflete sem precisar recarregar.

### 3.14 Sessão persistente ("Permanecer conectado") e restauração ao recarregar (2026-08-10, a pedido explícito)
- **Checkbox na tela de login:** `src/shell/LoginView.tsx`, campo `remember` (marcado por padrão). Controla só **onde** o token JWT é guardado — `usersRepo.authenticate(identifier, password, remember)` repassa para `setToken(token, remember)` (`src/lib/apiClient.ts`): `remember = true` grava em `localStorage` (sobrevive a fechar o navegador); `false` grava em `sessionStorage` (só dura a aba atual). `getToken()` lê de `localStorage` com fallback para `sessionStorage` na inicialização do módulo.
- **Bug corrigido no mesmo pedido:** antes desta mudança, o estado `user` do `AppShell` nunca era restaurado a partir de um token já salvo — qualquer F5/recarregamento de página derrubava a sessão de volta pro login, mesmo com o token ainda válido em `localStorage`. Corrigido com um efeito de bootstrap em `AppShell.tsx` que roda uma vez ao montar: chama `usersRepo.restoreSession()` (`GET /api/v1/auth/me` se houver token salvo; limpa o token e retorna `null` em 401/403), preenche `user` se houver sessão válida, e só então libera a renderização (`isRestoringSession`, evita um flash da tela de login antes da checagem terminar). Vale para qualquer tela — a view ativa (`activeView`) não é persistida entre recarregamentos (sempre volta pro Dashboard), mas a sessão em si não cai mais.
- **Logout agora limpa o token de verdade:** antes, `onLogout` só zerava o estado `user` em memória, sem chamar `setToken(null)` — o JWT continuava em `localStorage` (comportamento pré-existente, ajustado nesta mesma leva por estar diretamente ligado à estratégia de armazenamento do token).

### 3.15 Exclusão de usuário e conta de sistema protegida (2026-08-10, a pedido explícito)
- **Exclusão real** (hard delete, não é o mesmo que desativar — ver §5.6): ícone de lixeira por linha na tela de Usuários (`DELETE /api/v1/users/{id}`, `manageUsers`). Sem FK de `copy_requests`/`status_history_entries`/`audit_log` para `users.id` (todos guardam nome/ator como string solta), então excluir uma conta não quebra histórico de solicitações nem o log de auditoria.
- **Duas proteções, backend e frontend:** (1) ninguém exclui a própria conta autenticada (evita autobloqueio no meio da sessão); (2) contas marcadas `is_system` nunca podem ser excluídas — erro 400 explícito nos dois casos. O ícone de excluir já nem aparece na lista para esses dois casos (`UsersView.tsx`, comparando `account.isSystem` e `account.id !== currentUserId`), mas a checagem real de segurança é sempre no backend.
- **Conta de sistema:** coluna `users.is_system` (boolean, `backend/app/db/models/user.py`), `false` por padrão. Migração `40e91ff86d59` marca a conta seed `id = 'admin'` como `is_system = true` — garante que sempre existe pelo menos uma conta de Admin que não pode sumir do sistema. `UserCreate` (schema de criação/edição) não tem campo `is_system` — não dá pra promover nem despromover uma conta a "sistema" pela tela de Usuários, só via seed/migração.

## 4. Domain Model

### 4.1 Unit (Unidade)
Campos: `id`, `name`, `origin` (Escola | Sede SEMED), `code`, `contact?`, `active`.

### 4.2 CopyRequest (Solicitação de Cópia)
Campos: `id`, `code` (padrão `CP-2026-0001`), `origin`, `unitId`, `unitName`, `requester`, `contact`, `documentDescription`, `pages`, `copies`, `duplex`, `printedFaces`, `consumedSheets`, `paper` (A4 | A3 | Ofício), `colorMode` (P&B | Colorido), `priority` (Normal | Urgente | Institucional), `desiredDeadline`, `status`, `productionOwner`, `requestedAt`, `producedAt`, `deliveredAt`, `pickedUpBy`, `notes`, `history: StatusHistoryEntry[]`.

Status possíveis: `Recebido` → `Em produção` → `Pronto` → `Entregue`, ou `Cancelado` a qualquer momento.

### 4.3 StatusHistoryEntry
Campos: `status`, `date`, `by`.

### 4.4 User (Usuário)
Campos: `id`, `username` (único, usado no login junto com `email` — ver §3.11), `name`, `role` (Admin | Gerente | Operador | Consulta — ver §3.10), `email`, `active`, `isSystem` (não pode ser excluída — ver §3.15), `avatarUrl` (string absoluta para a imagem servida pelo backend, ou `null` — ver §3.9). Senha nunca trafega nem é armazenada em texto puro: o backend guarda só `hashed_password` (bcrypt, `backend/app/db/models/user.py`) e nunca a devolve nas respostas da API (`UserOut`, `backend/app/schemas/user.py`) — por isso o tipo `User` do frontend (`src/domains/users/types.ts`) não tem mais campo `password`. Ao editar uma conta, deixar o campo de senha em branco mantém a senha atual; preencher troca.

Permissões (`Permission`): `viewDashboard`, `createRequests`, `editRequests`, `updateProduction`, `manageUnits`, `manageUsers`, `manageAudit` (ver §3.7).

## 5. Functional Requirements

### 5.1 Autenticação
- Login por usuário ou e-mail (mesmo campo — ver §3.11), quatro papéis (Admin, Gerente, Operador, Consulta — ver §3.10), cinco contas pré-cadastradas (`backend/app/db/seed.py`): `admin`/`ti.semed` (Admin), `gerente` (Gerente), `operador` (Operador), `consulta` (Consulta).
- Cada perfil expõe apenas as permissões que lhe cabem.
- Checkbox "Permanecer conectado" na tela de login (ver §3.14): decide se o token JWT persiste em `localStorage` (sobrevive a fechar o navegador) ou só em `sessionStorage` (dura a aba atual).

### 5.2 Dashboard
- Totais de cópias, solicitações, pendentes, prontas, entregues e consumo estimado de papel.
- Ranking de unidades (top 6, por faces impressas) e últimas solicitações (movimento recente).
- Consolidação mensal (solicitações/faces/folhas por mês) e ranking completo de uso por unidade (2026-08-10, a pedido explícito — conteúdo que antes vivia numa tela "Relatórios" separada, agora incorporado direto ao Dashboard; ver §3.5).

### 5.3 Gestão de Solicitações
- Criar solicitação com origem Escola ou Sede SEMED.
- Calcular automaticamente faces impressas e folhas consumidas.
- Gerar código único no padrão `CP-2026-0001`.
- Atualizar status e registrar histórico a cada transição.
- Filtrar e buscar solicitações.
- Tela de consulta (lista) separada da tela de edição/inclusão (mesmo formulário, tela cheia — ver §3.8), com ações de editar/excluir por linha e confirmação de exclusão via modal.

### 5.4 Unidades e Setores
- Cadastrar e gerenciar unidades escolares e setores (Admin).

### 5.5 Relatórios
Não é mais uma tela própria — ver §5.2 (o ranking de unidades por volume e a consolidação mensal agora vivem no Dashboard).

### 5.6 Gestão de Usuários
- Cadastrar e editar contas de login (usuário, nome, e-mail, senha), com perfil de acesso (Admin | Gerente | Operador | Consulta — ver §3.10). Só Admin e Gerente têm a permissão `manageUsers` necessária para acessar esta tela.
- Tela de consulta (lista) separada da tela de edição/inclusão (mesmo formulário, tela cheia — mesmo padrão de §3.8, aplicado aqui em 2026-08-10 a pedido explícito), com ícones de editar/ativar-desativar/excluir por linha (excluir some para a própria conta logada e para contas de sistema — ver §3.15).
- Upload de foto de perfil (avatar) ao editar uma conta existente — ver §3.9.

### 5.7 Auditoria
- Consultar o histórico de criação, edição, exclusão e mudança de status das solicitações (só Admin — ver §3.7).
- Limpar o log manualmente (só Admin); expurgo automático após 60 dias, independente de limpeza manual.

### 5.8 Perfis de Acesso e conta própria
- Consultar a matriz fixa de permissões por papel (Admin/Gerente/Operador/Consulta), só leitura — ver §3.12.
- Qualquer usuário autenticado edita seu próprio nome/e-mail e troca sua própria senha (com confirmação da senha atual) pelo menu de conta da sidebar — ver §3.13.

## 6. Business Rules

### 6.1 Regras de Cálculo
1. Faces impressas = páginas × cópias (jogos).
2. Folhas consumidas (simplex) = páginas × cópias.
3. Folhas consumidas (frente e verso) = teto(páginas / 2) × cópias.

### 6.2 Regras de Código
1. Todo `CopyRequest` recebe um código único no padrão `CP-2026-NNNN`.
2. O código nunca é reaproveitado, mesmo se a solicitação for cancelada.

### 6.3 Regras de Status
1. Toda mudança de status gera uma entrada em `history` (status, data, autor).
2. Transições esperadas: Recebido → Em produção → Pronto → Entregue.
3. Cancelado é permitido a partir de qualquer status anterior a Entregue.

### 6.4 Regras de Permissão
1. Consulta só visualiza (painéis e listas) — sem criar, editar ou atualizar produção.
2. Operador cria solicitações e atualiza produção/entrega, mas não gerencia unidades/usuários/log de auditoria.
3. Gerente acumula as permissões do Operador mais gestão de unidades e usuários (`manageUnits`, `manageUsers`), mas não gerencia o log de auditoria — ver §3.10.
4. Admin acumula todas as permissões, incluindo gestão de usuários, unidades e log de auditoria (`manageAudit` — ver §3.7). É o único papel, junto do Gerente, que pode criar/editar contas de usuário.

## 7. UI Stack Governance
- Sem biblioteca de componentes de terceiros neste MVP, exceto o padrão Tailwind/shadcn-style isolado na tela de login (ver seção 2.2); qualquer adoção adicional exige avaliação de licença, acessibilidade, impacto de bundle e manutenção antes de entrar em produção.
- Ícones via `lucide-react`.
- **Design system (cores) é próprio do Duplica, não copiado do ForgeHub.** A estrutura/organização de código (seção 3.6) espelha o ForgeHub, e a tela de login (seção 2.2) passou a usar o mesmo padrão técnico de UI do ForgeHub — mas a paleta visual continua independente — tema claro/escuro definido em `src/shell/theme.ts` e tokens em `src/styles.css` continuam com identidade própria do projeto (institucional/SEMED, verde-petróleo), sem herdar as cores do ForgeHub (indigo/âmbar). A reorganização de estrutura (seção 3.6) não alterou paleta, tokens nem `styles.css`.
- **Logomarca:** `src/shell/Logo.tsx` (`LogoMark` = só o ícone, `Logo` = ícone + wordmark "Duplica"), duas folhas sobrepostas com canto dobrado (metáfora de cópia/duplicação) na paleta institucional (`#16715f`/`#135f56`/`#123a43`, os mesmos tons de `--accent`/`--accent-strong`/`--sidebar` de `src/styles.css`). Favicon em `public/favicon.svg` usa o mesmo desenho do `LogoMark`.

## 8. Primary User Flows

### 8.1 Fluxo de Solicitação
1. Operador registra solicitação (origem, unidade, documento, páginas, jogos, frente/verso, papel, cor, prioridade, prazo).
2. Sistema calcula faces impressas e folhas consumidas e gera o código único.
3. Solicitação entra como `Recebido`.
4. Operador avança o status conforme a produção evolui, cada transição registrada no histórico.
5. Solicitação é marcada `Entregue`, com retirada e data registradas.

### 8.2 Fluxo de Gestão de Unidades
1. Admin cadastra unidade (nome, origem, código, contato).
2. Unidade fica disponível para seleção em novas solicitações.
3. Admin pode inativar unidades sem excluir histórico associado.

### 8.3 Fluxo de Relatórios
1. Qualquer perfil com acesso ao Dashboard vê ranking de unidades, consolidação mensal e uso por unidade ali mesmo (não há mais navegação separada para "Relatórios" — ver §3.5/§5.2).
2. Sistema consolida totais mensais e ranking de unidades a partir das solicitações existentes.

## 9. Acceptance Criteria
O sistema é aceitável quando:
- toda solicitação tem código único, cálculos corretos de faces/folhas e histórico de status (agora gerados pelo backend — `backend/app/core/request_rules.py` — não mais no navegador);
- os três perfis respeitam suas permissões declaradas, **aplicadas também no backend** (`backend/app/core/permissions.py` + `require_permission`), não só escondidas na UI;
- dashboard e relatórios refletem os dados reais das solicitações cadastradas no Postgres;
- a camada de dados do frontend permanece isolada no `repository.ts` de cada domínio (`src/domains/<domain>/repository.ts`), que fala com a API real via `src/lib/apiClient.ts` sem expor detalhes HTTP às regras de domínio nem às Views;
- toda criação/edição/exclusão/mudança de status de solicitação fica registrada no log de auditoria, com expurgo automático após 60 dias (§3.7);
- `npm test` e `npm run build` passam no frontend; testes manuais via `curl`/Playwright confirmam o backend (não há suíte `pytest` ainda — ver §13).

## 10. Directory Layout
Raiz do projeto: `/root/project/duplica`

### 10.1 Estrutura atual (migração da seção 3.6 concluída)
```txt
duplica/
├── docs/
│   ├── SPEC.md
│   └── superpowers/
│       ├── specs/
│       └── plans/
├── src/
│   ├── domains/
│   │   ├── requests/
│   │   │   ├── types.ts
│   │   │   ├── rules.ts (+ rules.test.ts)
│   │   │   ├── repository.ts (+ repository.test.ts)
│   │   │   └── RequestsView.tsx   # exporta também RequestTable, reaproveitado pelo Dashboard;
│   │   │                          # tela de consulta e de edição/inclusão em tela cheia (ver §3.8)
│   │   ├── units/       # mesmo padrão: types.ts / rules.ts / repository.ts / UnitsView.tsx
│   │   ├── users/       # mesmo padrão; consulta/edição em tela cheia (ver §5.6); avatar (ver §3.9)
│   │   ├── reports/     # rules.ts (métricas do dashboard, ranking, consolidação) + rules.test.ts +
│   │   │                 # DashboardView.tsx (única tela — sem ReportsView.tsx próprio desde 2026-08-10) —
│   │   │                 # sem repository.ts/types.ts próprios, lê CopyRequest[] do domínio requests
│   │   └── audit/       # types.ts + repository.ts + AuditView.tsx — sem rules.ts (ver §3.7)
│   ├── shell/
│   │   ├── AppShell.tsx   # estado de sessão/UI + monta Sidebar/topbar/troca de view;
│   │   │                   # chama os repository.ts dos 5 domínios direto, sem fachada; sem lógica de domínio
│   │   ├── Sidebar.tsx     # navegação + menu de conta/perfil, padrão ForgeHub (ver §2.2/§3.5)
│   │   ├── LoginView.tsx   # tela de login, padrão ForgeHub (ver §2.2)
│   │   ├── Logo.tsx        # LogoMark + Logo (logomarca, ver §7)
│   │   ├── BackgroundChart.tsx  # SVG decorativo animado (barras + linha) do painel de branding
│   │   ├── theme.ts (+ theme.test.ts)
│   │   └── ui/             # button.tsx, input.tsx, label.tsx, modal.tsx (ConfirmModal, ver §3.8)
│   ├── lib/
│   │   ├── utils.ts        # cn() (clsx + tailwind-merge), usado por shell/ui e Logo.tsx
│   │   └── apiClient.ts    # fetch autenticado (Bearer JWT) + token em localStorage; base em VITE_API_URL
│   ├── tailwind.css        # @tailwind base/components/utilities — importado só em main.tsx
│   ├── test/
│   │   ├── setup.ts
│   │   └── mockApi.ts      # mock de fetch (backend em memória) para os testes de AppShell
│   └── main.tsx
├── backend/                # API real (Python/FastAPI) — ver §3.2
│   ├── app/
│   │   ├── main.py         # FastAPI app, CORS restrito, rate limiter, scheduler de expurgo (§3.7),
│   │   │                    # StaticFiles em /uploads (§3.9), inclui os routers
│   │   ├── core/           # config.py (.env), security.py (bcrypt+JWT), deps.py, permissions.py,
│   │   │                    # request_rules.py, slug.py, limiter.py, audit.py (record_audit(), §3.7)
│   │   ├── db/
│   │   │   ├── base.py     # engine/session async (SQLAlchemy + asyncpg)
│   │   │   ├── models/     # user.py (com avatar_path), unit.py, request.py (CopyRequest +
│   │   │   │                # StatusHistoryEntry), audit.py (AuditLog, sem FK para copy_requests)
│   │   │   └── seed.py     # mesmos dados demo do antigo localStorage, senha já com hash bcrypt
│   │   ├── schemas/        # Pydantic: user.py, unit.py, request.py, report.py, audit.py
│   │   └── api/routes/     # auth.py, units.py, users.py (inclui upload de avatar, §3.9),
│   │                        # requests.py, reports.py, audit.py (§3.7)
│   ├── alembic/            # migrations versionadas (schema do Postgres)
│   ├── uploads/             # avatares enviados (§3.9) — não versionado (.gitignore)
│   ├── requirements.txt
│   └── .venv/               # não versionado
├── data/               # scripts de init do Postgres (docker-entrypoint-initdb.d), ex.: 00-init.sql
├── public/
│   └── favicon.svg     # mesmo desenho do LogoMark
├── docker-compose.yml   # serviço Postgres (porta 5435), em uso ativo pelo backend
├── .gitignore           # backend/uploads/ (avatares enviados, ver §3.9)
├── tailwind.config.js   # content listado arquivo a arquivo: shell + RequestsView.tsx (ver §2.2);
│                         # corePlugins.preflight: false
├── postcss.config.js
├── sources/            # material de referência somente leitura (ChatGPT project sync)
├── index.html
├── package.json
└── vite.config.ts
```

`App.tsx`, `src/domain/` e `src/services/` (a organização anterior, com tudo misturado) foram removidos. Cada domínio do frontend tem seu `repository.ts` chamando a API real (`backend/`); não há mais dado de domínio em `localStorage` (só o token JWT, ver §3.1).

## 11. Metodologia
- Desenvolvimento orientado a testes: regras de negócio e camada de dados de cada domínio (`src/domains/<domain>/rules.ts` e `repository.ts`) recebem teste primeiro, depois implementação, até o teste passar — como já registrado em `docs/superpowers/plans/2026-08-10-grafica-mvp.md` (Task 2 e Task 3: "Write failing tests ... Implement ... until tests pass").
- Regras de negócio isoladas em funções puras (`rules.ts` de cada domínio no frontend; `core/*.py` no backend), sem acoplamento a UI — permite testar cálculo/permissão/geração de código sem montar componentes nem subir servidor.
- Camada de persistência isolada atrás do `repository.ts` de cada domínio no frontend (chamando a API real) e atrás dos models SQLAlchemy no backend.
- Testes do frontend (`src/domains/*/repository.test.ts`, `src/shell/AppShell.test.tsx`) mockam `fetch` (`src/test/mockApi.ts`) — não fazem chamada de rede real, então rodam sem o backend/Postgres no ar.
- Verificação de entrega: `npm test` (Vitest) e `npm run build` (`tsc --noEmit` + `vite build`) devem passar antes de considerar uma mudança de frontend concluída — mesmo padrão do `README.md` ("Validação"). Mudanças de backend foram validadas manualmente via `curl` contra cada rota (sem suíte `pytest` ainda — ver §13).
- Sem monolito modular/DDD tático formal (ao contrário do padrão organizacional de backend `06-BACKEND-ARCHITECTURE-AND-CODING-STANDARD.md`) — a separação por domínio (seção 3.6) já aplica a mesma intenção de isolamento em escala reduzida, espelhada nos dois lados (frontend e backend).

## 12. Delivery Notes
- Implementação incremental e testável (Vitest cobrindo `src/domains/<domain>/rules.ts` e `repository.ts`; backend validado via `curl` rota a rota).
- Qualquer desvio da stack canônica (seção 2) deve ser justificado antes de adotado.
- A troca de ASP.NET Core (plano original) por Python/FastAPI (seção 3.2) não exigiu reescrever regras de domínio do frontend — só a implementação interna de cada `repository.ts`, confirmando a premissa original do isolamento por repositório.

## 13. Next Spec Artifacts
Após este SPEC, os próximos artefatos ainda pendentes são:
- DATA SPEC formal (o schema já existe em `backend/app/db/models/` + `backend/alembic/`, mas não foi escrito como documento separado)
- SECURITY SPEC (revisão formal: rotação de token, política de senha, MFA — a autenticação demonstrativa já foi substituída por JWT+bcrypt reais, mas sem essa revisão)
- Suíte de testes automatizados do backend (`pytest` + `httpx.AsyncClient` contra um Postgres de teste) — hoje a validação do backend é manual via `curl`
