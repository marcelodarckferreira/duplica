# Duplica — Software Specification (SPEC)

> **Status documental:** especificação viva do MVP atual. Estrutura espelhada em `docs/specs/SPEC.md` do ForgeHub (mesmo padrão organizacional de spec), adaptada ao domínio deste projeto. Complementa — não substitui — `docs/superpowers/specs/2026-08-10-grafica-design.md` (design) e `docs/superpowers/plans/2026-08-10-grafica-mvp.md` (plano de implementação).

## 1. Scope
Este documento define a especificação funcional e técnica do Duplica, um sistema de controle de cópias institucional (não vinculado a uma organização específica — 2026-08-20: valores de origem generalizados de `"Escola"`/`"Setor SEMED"` para `ESCOLA`/`SEDE`, ver `docs/version/v01/13_98d763f27206_rename_origin_values_to_escola_and_sede.py`; a SEMED, secretaria municipal de educação, é uma usuária do sistema, não sua dona/homônima): solicitações de impressão/cópia originadas por Escolas ou pela Sede, produção, entrega, histórico de status, ranking de unidades e consolidação mensal.

**Nome do produto (2026-08-10, a pedido explícito):** o sistema passou a se chamar **Duplica** — era "Gráfica" até então. A troca inicial cobriu só o nome visível (título da página, tela de login, sidebar, este documento e os READMEs); identificadores técnicos internos (nome do banco Postgres `grafica`, container Docker `grafica_postgres`, `package.json`, chaves de `localStorage` como `grafica.semed.theme`/`grafica.semed.token`) continuam usando "grafica" deliberadamente, por decisão explícita de manter esse rename de baixo risco (sem mexer em infraestrutura em uso). **Atualização, ainda 2026-08-10, a pedido explícito:** a pasta do projeto também foi renomeada, de `/root/project/grafica` para `/root/project/duplica` — essa foi a única mudança de escopo ampliado; banco/container/`package.json`/chaves de `localStorage` seguem "grafica".

O sistema tem um backend real (`backend/`, Python/FastAPI, ver §3.2) com Postgres — a persistência deixou de ser só `localStorage` do navegador (2026-08-10). O frontend acessa esses dados via `src/features/<feature>/api/repository.ts`, que agora chama a API HTTP em vez de ler/escrever `localStorage` diretamente; a camada de repositório continua isolada por domínio, então essa troca não exigiu reescrever `rules.ts` nem as Views.

## 2. Canonical Stack Constraints (Frameworks e Linguagem)

### 2.1 Linguagem
- TypeScript em modo `strict` (`tsconfig.app.json`), `target: ES2022`, `jsx: react-jsx`.
- Sem `allowJs` — todo o código-fonte é TypeScript.
- Idioma da interface: português do Brasil (pt-BR) em todos os textos, rótulos, formatação de número (`Intl.NumberFormat("pt-BR")`) e data (`Intl.DateTimeFormat("pt-BR")`). Não há i18n multi-idioma neste MVP — pt-BR é o único idioma suportado.

### 2.2 Frameworks e Bibliotecas
- React 19 + ReactDOM 19
- Vite 6 (dev server e build)
- Vitest 3 + Testing Library (`@testing-library/react`, `jest-dom`, `user-event`) + jsdom, mais um projeto Storybook rodando em Chromium real via `@storybook/addon-vitest` (ver §2.3)
- Playwright (`@playwright/test`) para a suíte E2E (`tests/e2e/`) e `@axe-core/playwright` para os testes de acessibilidade (ver §11.3)
- lucide-react (ícones)
- **Adoção completa do padrão de arquitetura frontend (2026-08-11, a pedido explícito: "aplique na Duplica, que vai servir de padrão de desenvolvimento e segurança dos sistemas")** — o Duplica passou a seguir integralmente `05-FRONTEND-ARCHITECTURE-AND-CODING-STANDARD.md` e `02-UI-DESIGN-SYSTEM-AND-TECHNOLOGY-SPEC.md` da base de conhecimento do operador, não mais um subconjunto isolado na tela de login. Isso substituiu, em ordem:
  - **Estado do servidor:** TanStack Query (`@tanstack/react-query`) — cache, invalidação, loading/error, em vez do `snapshot`/`refresh()` manual que existia antes. Um `queryKeys`/`queries.ts` por feature (`useRequestsQuery`, `useCreateRequestMutation` etc. — ver §3.1).
  - **Estado de formulário:** React Hook Form + Zod (`@hookform/resolvers/zod`) — todo formulário do sistema (Solicitações, Unidades, Usuários, Minha conta, Alterar senha) tem um `schema.ts` próprio com validação Zod, espelhando as mesmas regras já aplicadas no backend (não as substitui — ver §5.3 do princípio "autorização visual ≠ autorização definitiva").
  - **Componentes de UI:** Radix UI real (`@radix-ui/react-dialog`, `-select`, `-checkbox`, `-dropdown-menu`, `-label`) por trás de wrappers "estilo shadcn" em `src/shared/ui/` (`dialog.tsx`, `select.tsx`, `checkbox.tsx`, `dropdown-menu.tsx`, `card.tsx`, `badge.tsx`, além de `button.tsx`/`input.tsx`/`label.tsx` já existentes, agora também usando `class-variance-authority`) — não é mais "feito à mão sem Radix"; os modais/menus/selects ganharam focus trap, fechar com Esc, roving-tabindex e navegação por teclado de verdade, de graça, em vez de reimplementados à mão.
  - **Estilo:** Tailwind CSS agora cobre o app inteiro (`tailwind.config.js` usa `content: ["./src/**/*.{ts,tsx}"]`, não mais uma lista arquivo a arquivo). `src/app/styles/styles.css` caiu de ~850 linhas pra menos de 90 — só restou o reset genérico (`* { box-sizing }`, `body`, `button/input/select/textarea { font: inherit }`) e as variáveis de tema (`--surface`, `--text`, `--accent`, `--status-*-fg/bg` etc., em `.theme-root`/`.theme-root[data-theme="dark"]`). `corePlugins.preflight` continua `false` (decisão deliberada — ligar o reset do Tailwind agora exigiria uma auditoria visual completa à parte, não decorre automaticamente da adoção do padrão).
  - **Catálogo visual:** Storybook (ver §2.3).
  - **Testes E2E e acessibilidade:** Playwright + axe-core (ver §11.3).
- Qualquer biblioteca de UI adicional além desse padrão deve ser avaliada antes de adoção (licença, acessibilidade, peso de bundle, manutenção).

### 2.3 Storybook (catálogo de componentes)
Todo componente de `src/shared/ui/` tem um arquivo `*.stories.tsx` ao lado (`Button`, `Input`, `Label`, `Checkbox`, `Select`, `DropdownMenu`, `Dialog`, `Card`, `Badge`, `ConfirmModal`), com os estados mínimos do padrão (default, variantes, disabled, loading, erro, aberto). `.storybook/preview.tsx` importa o CSS real do app e envolve toda story num decorator `.theme-root` com seletor de tema claro/escuro na toolbar — sem isso as stories renderizariam sem nenhuma cor, já que os tokens são CSS custom properties escopadas a essa classe. `npm run storybook` (dev, porta 6006) e `npm run build-storybook` (build estático, `storybook-static/`, gitignored).

## 3. Architecture Overview

### 3.1 Frontend
- React + Vite SPA
- TypeScript
- Estrutura **feature-first** desde 2026-08-11 (ver §3.6) — regras de negócio puras em `src/features/<feature>/model/rules.ts`, tipos em `model/types.ts`, schemas Zod em `schemas/schema.ts`, acesso a dados em `api/repository.ts`, e a camada de estado do servidor (TanStack Query) em `model/queries.ts` (`useXQuery`/`useXMutation`, ver §2.2) — chamando a API via `src/shared/api/apiClient.ts`. `units`/`users`/`requests`/`audit` fazem `fetch` autenticado; `reports` continua sem `api/repository.ts` próprio, computando client-side sobre `CopyRequest[]` já vindo da query de `requests`.
- Token JWT guardado em `localStorage` (`grafica.semed.token`, só o token — não é mais onde os dados do domínio vivem) via `src/shared/api/apiClient.ts`.

### 3.2 Backend
- **Decisão de stack (2026-08-10, a pedido explícito):** backend real em **Python/FastAPI**, não mais em ASP.NET Core como o plano original deste documento prescrevia. Motivo registrado pelo usuário: "para aplicação pequena vou escolher essa abordagem [Python]; para desenvolvimento grande vou usar o C#" — ou seja, é uma política de stack por porte de projeto, não uma reavaliação técnica de qual é "mais segura" (as duas são equivalentes em segurança quando bem implementadas; ver `backend/README.md` para o comparativo). O Duplica, como MVP pequeno, fica em Python; projetos maiores do mesmo operador continuam candidatos a C#/.NET.
- Implementado em `backend/` (FastAPI + SQLAlchemy 2.0 async + asyncpg + Alembic + passlib/bcrypt + python-jose/JWT + slowapi), mesmo padrão de autenticação do ForgeHub (JWT Bearer + bcrypt), mas com CORS restrito, rate limit no login e sem segredo padrão inseguro (gaps que o ForgeHub tem e este projeto não replica — ver `backend/app/core/`).
- Postgres provisionado via `docker-compose.yml` (porta `5435`), schema versionado via Alembic (`backend/alembic/`), seed em `backend/app/db/seed.py`.
- `src/features/<feature>/api/repository.ts` no frontend chama essa API via `src/shared/api/apiClient.ts` — a "fonte de verdade" deixou de ser o `localStorage` do navegador (ver §9, critério de aceitação atualizado).

### 3.3 Dados e Governança
- Histórico de status por solicitação (`StatusHistoryEntry[]`) como trilha de auditoria mínima
- Perfis de usuário com permissões explícitas (ver 4.4)

### 3.4 Login
Tela de entrada única (`src/app/LoginView.tsx`, renderizada por `src/app/AppShell.tsx` quando o estado `user` é `null`), sem rota própria:
- Formulário com `E-mail` e `Senha`, autenticação via `usersRepo.authenticate(email, senha)` (`src/features/users/api/repository.ts`) → `POST /api/v1/auth/token` no backend, contra a tabela `users` do Postgres (senha com hash bcrypt, nunca texto puro — ver §3.2).
- Campo de senha com botão de visualizar/ocultar (ícone `Eye`/`EyeOff`, estado local no próprio `LoginView`).
- Erro de credencial inválida exibido inline, sem redirecionamento.
- Sem bloco de "Credenciais demo" na tela (removido a pedido explícito, 2026-08-10) — as contas de teste continuam documentadas no `README.md`.
- Painel de branding (visível em telas ≥ `lg`) com `src/app/BackgroundChart.tsx`: gráfico de barras + linha em SVG, puramente decorativo (`aria-hidden`), animado só via CSS (`@keyframes` em `tailwind.config.js`, sem framer-motion/dependência de animação nova).
- Autenticação real via JWT (Bearer token) — deixou de ser demonstrativa em 2026-08-10 (ver §3.2). O item de Security Spec da seção 13 permanece como próximo passo para revisão formal (rotação de token, políticas de senha, etc.), mas o mecanismo de autenticação em si já não é mais texto puro em `localStorage`.

### 3.5 Sidebar (Navegação Principal)
Após login, o layout é `<Sidebar>` (`src/app/Sidebar.tsx`, padrão ForgeHub — ver §2.2) + `main.workspace` (conteúdo), sem roteador (`react-router`) — a view ativa é estado local (`View`) trocado por clique. Itens agrupados por seção (2026-08-10, a pedido explícito, mesmo padrão do ForgeHub — rótulo de grupo em maiúsculas, sem interação própria):

- **Operação** — Dashboard, Solicitações, Unidades (sempre visíveis).
- **Administração** — Usuários e Perfis de Acesso (ambos só quem tem `manageUsers` — ver §3.12), Auditoria (só quem tem `manageAudit`, ver §3.7). Grupo inteiro fica oculto se o usuário não tiver nenhuma das duas permissões (ex.: Operador, Consulta).

Não existe mais item "Relatórios" na sidebar — seu conteúdo (consolidação mensal + ranking completo por unidade) foi incorporado à tela de Dashboard (2026-08-10, a pedido explícito — ver §5.2/§5.5).

Colapsável (ícone-só ↔ expandida, botão no cabeçalho da sidebar, estado em `localStorage`). Item ativo marcado só por *pill* de fundo (`bg-white/15`) — sem borda lateral, sem indicador separado no ícone —, igual ao `bg-accent`/`text-accent-foreground` do ForgeHub. O menu de conta (avatar com iniciais, nome, perfil) fica no **rodapé da sidebar**, agora um `DropdownMenu` do Radix de verdade (2026-08-11, ver §2.2) — seção "Conta" (Minha conta/Alterar senha), seção "Tema" (Claro/Escuro/Sistema, com check no ativo) e "Sair", mesma estrutura do `UserSettingsMenu` do ForgeHub, mas com focus trap e navegação por teclado reais em vez de reimplementados à mão. A topbar (agora Tailwind, `src/app/AppShell.tsx`, desde 2026-08-11) hoje só exibe o título da view ativa.

**Simplificação assumida vs. o ForgeHub:** sem overlay off-canvas para mobile (o ForgeHub tem um modo específico abaixo de 768px); a sidebar aqui usa a mesma largura colapsável em qualquer tamanho de tela, sem comportamento responsivo automático. Pode ser adicionado depois se necessário.

### 3.6 Organização feature-first (2026-08-11, a pedido explícito — substitui a organização por domínio anterior)
A organização por domínio (`src/domains/<domain>/` + `src/shell/` + `src/lib/`, descrita nas versões anteriores deste documento) foi substituída pela arquitetura feature-first prescrita em `05-FRONTEND-ARCHITECTURE-AND-CODING-STANDARD.md` — adotando o tier **"projeto pequeno"** dessa mesma referência (`app` + `features` + `shared`, sem as camadas `pages`/`widgets`/`entities`), por ser o que corresponde ao porte real do Duplica: uma ferramenta interna de um único departamento, sem multi-tenant, sem roteador (a view ativa continua sendo estado local, não URL).

```
src/app/       →  casca da aplicação: AppShell.tsx, Sidebar.tsx, LoginView.tsx, Logo.tsx,
                   BackgroundChart.tsx, theme.ts, main.tsx, providers/QueryProvider.tsx, styles/
src/features/  →  um domínio de negócio por pasta, cada um com suas 4 sub-camadas:
                   api/      → repository.ts (+ repository.test.ts) — chamadas HTTP
                   model/    → types.ts, rules.ts (+ rules.test.ts), queries.ts (TanStack Query)
                   schemas/  → schema.ts (validação Zod do formulário, quando a feature tem um)
                   ui/       → <Feature>View.tsx
src/shared/    →  recursos reutilizáveis, independentes de qualquer feature específica:
                   api/      → apiClient.ts
                   ui/       → button.tsx, input.tsx, label.tsx, card.tsx, badge.tsx, dialog.tsx,
                               select.tsx, checkbox.tsx, dropdown-menu.tsx, modal.tsx (ver §2.2/§2.3)
                   lib/      → utils.ts (cn(), usePortalContainer())
                   testing/  → mockApi.ts, setup.ts (infraestrutura dos testes Vitest)
```

Features: `requests` (solicitações), `units` (unidades/setores), `users` (contas, permissões e perfis de acesso — inclui `AccessProfilesView.tsx`), `audit` (log de auditoria, sem `schemas/` — não há formulário nesta feature), `reports` (métricas + ranking + consolidação mensal do Dashboard — lê `CopyRequest[]` da feature `requests`, sem `api/`/`schemas/` próprios), `account` (autoatendimento — `AccountModal`/`ChangePasswordModal`, reaproveita os schemas/tipos da feature `users`). Cada feature isolada em sua própria pasta, nunca lógica de outra feature. Do lado do backend (`backend/`), o mesmo isolamento continua existindo em Python: `app/db/models/`, `app/schemas/`, `app/api/routes/`, um arquivo por domínio.

Esta reorganização foi aplicada em uma única leva (diferente da migração anterior, que foi domínio por domínio) porque é essencialmente mecânica — mover arquivos e corrigir caminhos de import, sem alterar lógica — e foi seguida de bateria completa de verificação (typecheck, 37 testes Vitest, build, varredura visual real no navegador em claro e escuro) antes de prosseguir. Ver estrutura final na seção 10.1.

| Camada anterior | Camada atual |
|---|---|
| `src/domains/<domain>/types.ts` + `rules.ts` | `src/features/<feature>/model/types.ts` + `rules.ts` |
| `src/domains/<domain>/repository.ts` | `src/features/<feature>/api/repository.ts` |
| `src/domains/<domain>/<Domain>View.tsx` | `src/features/<feature>/ui/<Feature>View.tsx` |
| `src/shell/` | `src/app/` |
| `src/lib/` | `src/shared/api/` + `src/shared/lib/` |
| `src/shell/ui/` | `src/shared/ui/` |
| `src/test/` | `src/shared/testing/` |

### 3.7 Log de auditoria (2026-08-10, a pedido explícito)
Escopo: **só Solicitações** (não cobre Unidades nem Usuários). Toda criação, edição, exclusão e mudança de status de uma `CopyRequest` gera uma entrada de auditoria, gravada na mesma transação da operação que a originou (`record_audit()`, `backend/app/core/audit.py`, chamado pelas rotas de `backend/app/api/routes/requests.py`).
- **Modelo:** `AuditLog` (`backend/app/db/models/audit.py`) — `id`, `action` (`create`|`update`|`delete`|`status_change`), `request_id`, `request_code`, `actor_id`, `actor_name`, `detail`, `created_at`. Deliberadamente **sem foreign key** para `copy_requests`: a trilha de auditoria precisa sobreviver à exclusão da solicitação que a originou.
- **Autoria:** ator e timestamp vêm do usuário autenticado via JWT no backend — nunca de parâmetro enviado pelo frontend (elimina spoofing).
- **Retenção:** 60 dias, expurgo automático via job diário do APScheduler (`backend/app/main.py`, `scheduler.add_job(..., "interval", days=1)`) — não é expurgo "preguiçoso" (só ao ler), roda independente de alguém abrir a tela.
- **Acesso:** só quem tem a permissão `manageAudit` (hoje, Admin) vê `GET /api/v1/audit-log` e pode limpar o log manualmente (`DELETE /api/v1/audit-log`, com confirmação via `window.confirm` — não usa o `ConfirmModal` do §3.8, que ficou restrito ao fluxo de exclusão de solicitação).
- **Frontend:** domínio `src/features/audit/` (`types.ts` + `repository.ts` + `AuditView.tsx`, sem `rules.ts` — não há regra de negócio pura aqui, só listagem), item "Auditoria" na sidebar (§3.5).

### 3.8 Tela de Solicitações: consulta vs. edição/inclusão (2026-08-10, a pedido explícito)
`src/features/requests/ui/RequestsView.tsx` deixou de mostrar lista e formulário lado a lado — agora são **duas telas cheias mutuamente exclusivas** dentro da mesma view, controladas por uma prop `mode: "list" | "form"` derivada em `AppShell.tsx` (`isCreatingRequest || editingRequestId`):
- **Consulta** (`mode: "list"`): tabela de solicitações (`RequestTable`, também reaproveitada pelo Dashboard em modo compacto) com ícone de editar e excluir por linha, além do painel de detalhe com as mesmas ações. Botão "Nova solicitação" abre a tela de formulário em modo criação.
- **Edição/Inclusão** (`mode: "form"`): mesmo componente de formulário para os dois casos — só o título ("Nova solicitação" vs. "Editar solicitação") muda, conforme `editingRequestId` estar vazio ou não. Botão "Voltar" retorna à consulta sem salvar.
- **Exclusão:** o ícone/botão "Excluir" não apaga direto — abre `ConfirmModal` (`src/shared/ui/modal.tsx`, Tailwind, `role="alertdialog"`), que substitui o antigo `window.confirm()` nesse fluxo específico. O modal mostra estado de carregamento (`isConfirming`, spinner, botões desabilitados) enquanto a chamada à API está em andamento.
- **Loading/bloqueio em botões:** salvar (formulário), excluir (modal) e mudança de status (painel de detalhe) desabilitam o(s) botão(ões) envolvido(s) e mostram um spinner/rótulo de progresso (`animate-spin`) enquanto a chamada assíncrona correspondente não termina — evita duplo submit/duplo clique.

### 3.9 Upload de foto do usuário (2026-08-10, a pedido explícito)
Segue o mesmo padrão visual do `UserSettingsMenu.tsx` do ForgeHub (avatar circular + botão de câmera sobreposto no canto), implementado em Tailwind desde 2026-08-11 (`Avatar` em `src/features/users/ui/UsersView.tsx` — as antigas classes `.avatar-*` de `styles.css` foram removidas na migração, ver §2.2).
- **Armazenamento:** disco local do backend (`backend/uploads/avatars/`, fora do controle de versão — ver `.gitignore` na raiz do projeto), não base64 no Postgres. Servido como arquivo estático em `/uploads/...` (`StaticFiles`, montado em `backend/app/main.py`).
- **Upload:** só disponível ao editar um usuário já existente (precisa de `id`), via `POST /api/v1/users/{id}/avatar` (multipart/form-data), restrito a quem tem `manageUsers`. Validação: apenas PNG/JPEG/WEBP, até 2 MB; arquivo antigo é removido do disco ao trocar.
- **Modelo:** coluna `avatar_path` em `users` (relativa a `backend/uploads/`), nunca exposta direto na API — `UserOut` expõe só `avatar_url` (computado) e omite `avatar_path` da serialização.
- **Frontend:** `User.avatarUrl` (`src/features/users/model/types.ts`), avatar exibido (imagem ou iniciais como fallback) na lista de contas, no formulário de edição e no menu de conta da sidebar (`Sidebar.tsx`) — os três lugares onde o ForgeHub também mostra o avatar do usuário.

### 3.10 Papel Gerente (2026-08-10, a pedido explícito)
Quarto papel além de Admin/Operador/Consulta, fixo no código (não é configurável via UI — ver §3.12). Tem as mesmas permissões do Admin **exceto** `manageAudit`: `viewDashboard`, `createRequests`, `editRequests`, `updateProduction`, `manageUnits`, `manageUsers`. Motivação explícita do usuário: "somente o usuário com perfil de gerente e administrador tem direito de criar usuário" — ou seja, Gerente e Admin são os dois papéis que podem gerenciar contas; só Admin limpa o log de auditoria. Definido em `backend/app/core/permissions.py` (`ROLE_PERMISSIONS`) e `src/features/users/model/rules.ts` (`ROLE_PERMISSIONS`, exportado para a tela de Perfis de Acesso — ver §3.12).

### 3.11 Login por usuário ou e-mail (2026-08-10, a pedido explícito)
Toda conta agora tem um `username` (coluna `users.username`, único, obrigatório, `backend/app/db/models/user.py`) além do `email` — mesmo padrão do ForgeHub. O login (`POST /api/v1/auth/token`) aceita **qualquer um dos dois** no mesmo campo (`identifier`), consultando `User.email == identifier OR User.username == identifier`. O campo de login no frontend (`LoginView.tsx`) mudou de `type="email"` para `type="text"` — obrigatório, já que um username como `admin` não é um e-mail válido para a validação nativa do navegador. Migração `e4687d66643b_add_username_to_users.py` faz backfill de `username` a partir do prefixo do e-mail (`split_part(email, '@', 1)`) antes de aplicar `NOT NULL`/`UNIQUE`, para não quebrar contas já existentes.

### 3.12 Perfis de acesso (2026-08-10, a pedido explícito, padrão ForgeHub)
Item "Perfis de Acesso" no grupo Administração da sidebar (`src/features/users/ui/AccessProfilesView.tsx`), visível para quem tem `manageUsers`. Mostra uma matriz fixa (papel × permissão, ✓/—) dos 4 papéis — **somente leitura**: não é possível criar papéis novos nem alternar permissões pela UI (decisão explícita do usuário: "fixo no código", não dinâmico via banco — ver também §3.10). Fonte de verdade da matriz é `ROLE_PERMISSIONS` de `src/features/users/model/rules.ts`, a mesma usada por `canPerform()`.

### 3.13 Menu de conta: perfil próprio, senha e tema (2026-08-10, a pedido explícito, padrão ForgeHub)
O dropdown de conta na sidebar (`Sidebar.tsx`) segue a mesma estrutura do ForgeHub: seção "Conta" (Minha conta / Alterar senha) + seção "Tema" (Claro/Escuro/Sistema, com check no ativo) + Sair.
- **Minha conta / Alterar senha:** dois modais (`src/features/account/ui/AccountModals.tsx`, `AccountModal`/`ChangePasswordModal`, Tailwind), ambos falando com `PATCH /api/v1/auth/me` (autoatendimento — qualquer usuário autenticado edita seu próprio nome/e-mail/senha, sem precisar de `manageUsers`; nunca altera papel/status). Trocar a senha exige a senha atual correta (`current_password`, verificada no backend antes de aceitar a nova) — proteção extra contra sequestro de sessão, que a edição feita por um Admin via tela de Usuários não tem (lá é o Admin que decide a senha de outra conta).
- **Tema em 3 vias:** `ThemeMode` passou de `"light" | "dark"` para `"light" | "dark" | "system"` (`src/app/theme.ts`). `resolveTheme(mode, prefersDark)` calcula o tema efetivamente aplicado (`data-theme`); no modo `"system"`, a preferência do SO é observada em tempo real via `matchMedia("(prefers-color-scheme: dark)")` (`AppShell.tsx`, listener de `change`), então uma troca de tema do SO com o app aberto reflete sem precisar recarregar.

### 3.14 Sessão persistente ("Permanecer conectado") e restauração ao recarregar (2026-08-10, a pedido explícito)
- **Checkbox na tela de login:** `src/app/LoginView.tsx`, campo `remember` (marcado por padrão). Controla só **onde** o token JWT é guardado — `usersRepo.authenticate(identifier, password, remember)` repassa para `setToken(token, remember)` (`src/shared/api/apiClient.ts`): `remember = true` grava em `localStorage` (sobrevive a fechar o navegador); `false` grava em `sessionStorage` (só dura a aba atual). `getToken()` lê de `localStorage` com fallback para `sessionStorage` na inicialização do módulo.
- **Bug corrigido no mesmo pedido:** antes desta mudança, o estado `user` do `AppShell` nunca era restaurado a partir de um token já salvo — qualquer F5/recarregamento de página derrubava a sessão de volta pro login, mesmo com o token ainda válido em `localStorage`. Corrigido com um efeito de bootstrap em `AppShell.tsx` que roda uma vez ao montar: chama `usersRepo.restoreSession()` (`GET /api/v1/auth/me` se houver token salvo; limpa o token e retorna `null` em 401/403), preenche `user` se houver sessão válida, e só então libera a renderização (`isRestoringSession`, evita um flash da tela de login antes da checagem terminar). Vale para qualquer tela — a view ativa (`activeView`) não é persistida entre recarregamentos (sempre volta pro Dashboard), mas a sessão em si não cai mais.
- **Logout agora limpa o token de verdade:** antes, `onLogout` só zerava o estado `user` em memória, sem chamar `setToken(null)` — o JWT continuava em `localStorage` (comportamento pré-existente, ajustado nesta mesma leva por estar diretamente ligado à estratégia de armazenamento do token).

### 3.15 Exclusão de usuário e conta de sistema protegida (2026-08-10, a pedido explícito)
- **Exclusão real** (hard delete, não é o mesmo que desativar — ver §5.6): ícone de lixeira por linha na tela de Usuários (`DELETE /api/v1/users/{id}`, `manageUsers`). Sem FK de `copy_requests`/`status_history_entries`/`audit_log` para `users.id` (todos guardam nome/ator como string solta), então excluir uma conta não quebra histórico de solicitações nem o log de auditoria.
- **Duas proteções, backend e frontend:** (1) ninguém exclui a própria conta autenticada (evita autobloqueio no meio da sessão); (2) contas marcadas `is_system` nunca podem ser excluídas — erro 400 explícito nos dois casos. O ícone de excluir já nem aparece na lista para esses dois casos (`UsersView.tsx`, comparando `account.isSystem` e `account.id !== currentUserId`), mas a checagem real de segurança é sempre no backend.
- **Conta de sistema:** coluna `users.is_system` (boolean, `backend/app/db/models/user.py`), `false` por padrão. Migração `40e91ff86d59` marca a conta seed `id = 'admin'` como `is_system = true` — garante que sempre existe pelo menos uma conta de Admin que não pode sumir do sistema. `UserCreate` (schema de criação/edição) não tem campo `is_system` — não dá pra promover nem despromover uma conta a "sistema" pela tela de Usuários, só via seed/migração.

### 3.16 Reforço de segurança (2026-08-10, a pedido explícito — "verifique a segurança do sistema no frontend e backend")
Revisão pontual pós-implementação do papel Gerente/exclusão de usuário; achados corrigidos, todos no backend (a checagem real nunca pode ser só no frontend):
- **Auto-promoção de papel:** `POST /api/v1/users` (`save_user`) agora rejeita (400) qualquer tentativa de alterar o próprio `role` — sem isso, um Gerente (tem `manageUsers` mas não `manageAudit`) conseguia se editar e virar Admin pela própria tela de Usuários.
- **Auto-desativação via API direta:** `PATCH /api/v1/users/{id}/active` agora também rejeita (400) desativar a própria conta — a proteção já existia só no frontend (`AppShell.tsx`), não no backend; mesmo padrão do que `DELETE /api/v1/users/{id}` já fazia para exclusão (ver §3.15).
- **Rate limit em `PATCH /api/v1/auth/me`:** 5/minuto, igual ao login — antes só o login tinha `@limiter.limit`; a troca de senha por autoatendimento (que verifica `current_password`) ficava aberta a tentativas ilimitadas.
- **Senha mínima de 8 caracteres:** validador Pydantic compartilhado (`backend/app/schemas/user.py`, `MIN_PASSWORD_LENGTH`) em `UserCreate.password` e `UserSelfUpdate.password` — antes não havia nenhum requisito de tamanho/força. Frontend ganhou `minLength={8}` nos campos de senha correspondentes (`UsersView.tsx`, `AccountModals.tsx`) como feedback antecipado — a validação que importa continua sendo a do backend.
- **`pages`/`copies` de `CopyRequest` com `gt=0`:** `RequestDraft`/`RequestUpdate` (`backend/app/schemas/request.py`) não tinham limite inferior — um valor negativo ou zero era aceito e corrompia os totais calculados de faces/folhas.
- **Postgres publicado em todas as interfaces de rede, não só localhost:** `docker-compose.yml` mapeava `"5435:5432"` sem IP — Docker publica isso em `0.0.0.0` por padrão, confirmado via `ss -tlnp` (o backend em si já era `127.0.0.1`-only, só o Postgres vazava). Corrigido para `"127.0.0.1:5435:5432"`. **Nota separada, fora do escopo desta correção:** os Postgres de outros projetos no mesmo host (`company_postgres:5433`, `foundation_postgres:5432`) seguem em `0.0.0.0` — não alterados aqui por não serem parte do Duplica.
- **`/docs` e `/openapi.json` públicos sem autenticação** (Swagger UI/OpenAPI do FastAPI, ligados por padrão) — expõem toda a superfície da API para reconhecimento não autenticado. Identificado, **não corrigido** — decisão de manter ou restringir cabe ao operador (tem trade-off real de conveniência para debug/integração).

### 3.17 Modos dev e pro, containerização versionada (2026-08-10, a pedido explícito, padrão ForgeRouter)
Dois modos formalizados, cada um com seu script em `scripts/` — nunca subir os processos manualmente:

- **`scripts/dev.sh`** — modo nativo (sem imagem Docker), pra iteração rápida: Postgres via `docker compose -p grafica up -d postgres`, migrations (`alembic upgrade head` via venv do host), backend (`uvicorn --reload`, venv) e frontend (Vite dev server, HMR) direto no host, cada um com PID/log em `.dev/` (gitignored). **Idempotente** — se um processo já está rodando (checado pelo PID salvo), não derruba, só avisa. Backend e frontend sobem via `( exec <binário> ) > log 2>&1 & echo $! > pidfile` — nunca via `npm run dev &`/`cmd &` direto, porque `$!` capturaria o PID do processo wrapper (`npm`, `sh -c`), não do processo real; matar o PID errado deixava o processo de verdade órfão rodando (bug real, encontrado e corrigido nesta mesma tarefa).
- **`scripts/pro.sh`** — deploy containerizado e versionado: builda a imagem (`scripts/build.sh`), aplica migrations, sobe Postgres + app via `docker compose -p grafica up -d`, espera o healthcheck do container `grafica_app` ficar `healthy`. **Não é idempotente de propósito** — sempre reflete o build mais recente (para reiniciar sem rebuildar, usar o `docker compose` diretamente).
- **`scripts/build.sh`** — builda com `--build-arg GIT_SHA=$(git rev-parse --short HEAD)`, re-tageia como `grafica:<VERSION>` (lido do arquivo `VERSION` na raiz) **e** `grafica:latest` — nunca usar `docker build`/`docker compose build` puro, mesma lição já documentada (e agora replicada de propósito) no `build.sh` do ForgeRouter: sem o re-tag manual, `latest` fica presa numa imagem antiga silenciosamente.
- **`Dockerfile`** — imagem única, multi-stage: primeiro estágio builda o frontend (`node:22-slim`, `npm ci && npm run build`), segundo estágio é o backend (`python:3.11-slim`) com o `dist/` do primeiro estágio copiado pra dentro. O backend serve o frontend estático na raiz (`app.mount("/", StaticFiles(directory=DIST_DIR, html=True))`, `backend/app/main.py`, montado por último pra nunca sombrear `/api/v1/*` nem `/uploads`) — sem necessidade de fallback de rota SPA, já que o app não tem roteamento client-side (view ativa é estado local, não URL). `GET /api/v1/health` expõe `version` (do arquivo `VERSION`) e `git_sha` (da env `GIT_SHA`, gravada como `ARG` no build) — só populado de verdade no modo pro; no modo dev nativo aparece como `"unknown"` (não passa por build de imagem).
- **`docker-compose.yml`** ganhou o serviço `app` (imagem `grafica:latest`, porta `127.0.0.1:8010` — mesma postura localhost-only do Postgres, ver §3.16), com `POSTGRES_HOST=postgres`/`POSTGRES_PORT=5432` sobrescrevendo os defaults de `Settings` (que apontam pra `127.0.0.1:5435`, válido só pra quem roda fora da rede do compose) e um volume nomeado (`uploads_data`) pra persistir avatares entre deploys.
- Migrations continuam rodando via venv do host em ambos os modos (não dentro do container) — mantém o fluxo já estabelecido a sessão inteira, sem precisar dar `docker exec` pra aplicar schema.

## 4. Domain Model

### 4.1 Unit (Unidade)
Campos: `id`, `name`, `origin` (`ESCOLA` | `SEDE`), `code`, `contact?`, `active`.

### 4.2 CopyRequest (Solicitação de Cópia)
Campos: `id`, `code` (padrão `CP-2026-0001`), `origin`, `unitId`, `unitName`, `requester`, `contact`, `documentDescription`, `pages`, `copies`, `duplex`, `printedFaces`, `consumedSheets`, `paper` (A4 | A3 | Ofício), `colorMode` (P&B | Colorido), `priority` (Normal | Urgente | Institucional), `desiredDeadline`, `status`, `productionOwner`, `requestedAt`, `producedAt`, `deliveredAt`, `pickedUpBy`, `notes`, `history: StatusHistoryEntry[]`.

Status possíveis: `Recebido` → `Em produção` → `Pronto` → `Entregue`, ou `Cancelado` a qualquer momento.

### 4.3 StatusHistoryEntry
Campos: `status`, `date`, `by`.

### 4.4 User (Usuário)
Campos: `id`, `username` (único, usado no login junto com `email` — ver §3.11), `name`, `role` (Admin | Gerente | Operador | Consulta — ver §3.10), `email`, `active`, `isSystem` (não pode ser excluída — ver §3.15), `avatarUrl` (string absoluta para a imagem servida pelo backend, ou `null` — ver §3.9). Senha nunca trafega nem é armazenada em texto puro: o backend guarda só `hashed_password` (bcrypt, `backend/app/db/models/user.py`) e nunca a devolve nas respostas da API (`UserOut`, `backend/app/schemas/user.py`) — por isso o tipo `User` do frontend (`src/features/users/model/types.ts`) não tem mais campo `password`. Ao editar uma conta, deixar o campo de senha em branco mantém a senha atual; preencher troca.

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
- Criar solicitação com origem Escola ou Sede.
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
- **Radix UI + Tailwind cobrem o app inteiro desde 2026-08-11** (ver §2.2) — deixou de ser "sem biblioteca de componentes de terceiros"; qualquer biblioteca de UI *adicional* a esse padrão (Radix + wrappers estilo shadcn em `src/shared/ui/`) ainda exige avaliação de licença, acessibilidade, impacto de bundle e manutenção antes de entrar em produção.
- Ícones via `lucide-react`.
- **Nenhuma feature deve criar uma segunda implementação de um componente já disponível em `src/shared/ui/`** (princípio direto de `02-UI-DESIGN-SYSTEM-AND-TECHNOLOGY-SPEC.md` §5.4) — antes de estilizar algo novo à mão, checar o catálogo do Storybook (§2.3).
- **Design system (cores) é próprio do Duplica, não copiado do ForgeHub.** A estrutura/organização de código (seção 3.6) espelha o ForgeHub, e o padrão técnico de UI (Tailwind + Radix, seção 2.2) é o mesmo do ForgeHub — mas a paleta visual continua independente: tema claro/escuro definido em `src/app/theme.ts` e tokens em `src/app/styles/styles.css` (`--surface`, `--text`, `--accent`, `--status-recebido-fg/bg` etc., mapeados 1:1 em `tailwind.config.js`) mantêm identidade própria do projeto (institucional, verde-petróleo), sem herdar as cores do ForgeHub (indigo/âmbar).
- **Portal de componentes Radix:** `Dialog`/`Select`/`DropdownMenu` usam `usePortalContainer()` (`src/shared/lib/utils.ts`) para portar seu conteúdo dentro de `#theme-root`, não em `document.body` (o padrão do Radix). Sem isso, o conteúdo portado perde acesso às CSS custom properties do tema (fundo/texto ficam "unset") — bug real encontrado pelos testes de acessibilidade da Fase 9 (ver §11.3), não visível numa inspeção visual manual em tema claro por coincidência de cores.
- **Logomarca:** `src/app/Logo.tsx` (`LogoMark` = só o ícone, `Logo` = ícone + wordmark "Duplica"), duas folhas sobrepostas com canto dobrado (metáfora de cópia/duplicação) na paleta institucional (`#16715f`/`#135f56`/`#123a43`, os mesmos tons de `--accent`/`--accent-strong`/`--sidebar`). Favicon em `public/favicon.svg` usa o mesmo desenho do `LogoMark`.

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
- os quatro perfis (Admin, Gerente, Operador, Consulta — §3.10) respeitam suas permissões declaradas, **aplicadas também no backend** (`backend/app/core/permissions.py` + `require_permission`), não só escondidas na UI;
- dashboard e relatórios refletem os dados reais das solicitações cadastradas no Postgres;
- a camada de dados do frontend permanece isolada no `api/repository.ts` de cada feature (`src/features/<feature>/api/repository.ts`), que fala com a API real via `src/shared/api/apiClient.ts` sem expor detalhes HTTP às regras de domínio nem às Views;
- toda criação/edição/exclusão/mudança de status de solicitação fica registrada no log de auditoria, com expurgo automático após 60 dias (§3.7);
- `npm test` (Vitest + Storybook/Chromium) e `npm run build` passam no frontend; `npm run test:e2e` (Playwright, contra banco isolado — §11.3) confirma os fluxos críticos ponta a ponta; mudanças de backend seguem validadas manualmente via `curl` (não há suíte `pytest` ainda — ver §13).

## 10. Directory Layout
Raiz do projeto: `/root/project/duplica`

### 10.1 Estrutura atual (feature-first, migração da seção 3.6 concluída em 2026-08-11)
```txt
duplica/
├── docs/
│   ├── SPEC.md
│   └── superpowers/
│       ├── specs/
│       └── plans/
├── tests/
│   └── e2e/                # suíte Playwright — ver §11.3
│       ├── auth.setup.ts   # projeto "setup": autentica cada papel demo 1x, salva storageState
│       ├── fixtures.ts     # credenciais demo + helpers de login/storageState
│       ├── auth.spec.ts
│       ├── authorization.spec.ts
│       ├── requests.spec.ts
│       └── accessibility.spec.ts   # axe-core, WCAG 2 A/AA
├── src/
│   ├── app/                 # casca da aplicação (não é feature de negócio)
│   │   ├── AppShell.tsx (+ AppShell.test.tsx)  # estado de sessão/UI + monta Sidebar/topbar/troca
│   │   │                                        # de view; consome os *Query()/*Mutation() de cada
│   │   │                                        # feature direto, sem fachada; sem lógica de domínio
│   │   ├── Sidebar.tsx      # navegação + menu de conta (DropdownMenu Radix), padrão ForgeHub (§3.5)
│   │   ├── LoginView.tsx    # tela de login, padrão ForgeHub (ver §2.2)
│   │   ├── Logo.tsx         # LogoMark + Logo (logomarca, ver §7)
│   │   ├── BackgroundChart.tsx  # SVG decorativo animado (barras + linha) do painel de branding
│   │   ├── theme.ts (+ theme.test.ts)
│   │   ├── providers/
│   │   │   └── QueryProvider.tsx   # instancia o QueryClient do TanStack Query (ver §2.2)
│   │   ├── styles/
│   │   │   ├── styles.css   # só reset genérico + variáveis de tema (--surface, --status-*-fg/bg…)
│   │   │   └── tailwind.css # @tailwind base/components/utilities
│   │   └── main.tsx
│   ├── features/
│   │   ├── requests/
│   │   │   ├── api/repository.ts (+ repository.test.ts)
│   │   │   ├── model/types.ts, rules.ts (+ rules.test.ts), queries.ts
│   │   │   ├── schemas/schema.ts   # validação Zod do formulário (RHF)
│   │   │   └── ui/RequestsView.tsx  # exporta também RequestTable, reaproveitado pelo Dashboard;
│   │   │                             # tela de consulta e de edição/inclusão em tela cheia (§3.8)
│   │   ├── units/        # mesmo padrão: api/model/schemas/ui
│   │   ├── users/        # mesmo padrão; ui/ inclui também AccessProfilesView.tsx (§3.12);
│   │   │                  # avatar (§3.9); consulta/edição em tela cheia (§5.6)
│   │   ├── audit/        # api/model/ui — sem schemas/ (não há formulário nesta feature, §3.7)
│   │   ├── reports/      # model/rules.ts (+ rules.test.ts) + ui/DashboardView.tsx — sem api/schemas/
│   │   │                  # próprios, lê CopyRequest[] da feature requests
│   │   └── account/      # ui/AccountModals.tsx (AccountModal/ChangePasswordModal, §3.13) —
│   │                       # reaproveita schemas/types de users
│   └── shared/
│       ├── api/apiClient.ts   # fetch autenticado (Bearer JWT) + token em localStorage; VITE_API_URL
│       ├── ui/                 # button.tsx, input.tsx, label.tsx, card.tsx, badge.tsx, checkbox.tsx,
│       │                        # select.tsx, dropdown-menu.tsx, dialog.tsx, modal.tsx (ConfirmModal)
│       │                        # + um *.stories.tsx por componente (ver §2.3)
│       ├── lib/utils.ts        # cn() (clsx + tailwind-merge), usePortalContainer() (ver §7)
│       └── testing/
│           ├── setup.ts
│           └── mockApi.ts      # mock de fetch (backend em memória) para os testes de AppShell
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
│   │   │   └── seed.py     # dados demo, senha já com hash bcrypt — reaproveitado também pelo
│   │   │                    # bootstrap do banco de teste E2E isolado (ver §11.3)
│   │   ├── schemas/        # Pydantic: user.py, unit.py, request.py, report.py, audit.py
│   │   └── api/routes/     # auth.py, units.py, users.py (inclui upload de avatar, §3.9),
│   │                        # requests.py, reports.py, audit.py (§3.7)
│   ├── scripts/
│   │   └── e2e_bootstrap.sh   # recria o banco grafica_test do zero e sobe o backend de teste
│   │                            # na porta 8011 (ver §11.3) — nunca toca no banco real
│   ├── alembic/            # migrations versionadas (schema do Postgres)
│   ├── uploads/             # avatares enviados (§3.9) — não versionado (.gitignore)
│   ├── requirements.txt
│   └── .venv/               # não versionado
├── data/               # scripts de init do Postgres (docker-entrypoint-initdb.d), ex.: 00-init.sql
├── public/
│   └── favicon.svg     # mesmo desenho do LogoMark
├── .storybook/          # main.ts + preview.tsx (decorator de tema, ver §2.3)
├── docker-compose.yml   # serviço Postgres (porta 5435) + app (porta 8010), em uso ativo
├── playwright.config.ts # webServer duplo (backend :8011 + frontend :5174) — ver §11.3
├── .gitignore
├── tailwind.config.js   # content: ["./src/**/*.{ts,tsx}"]; corePlugins.preflight: false (ver §2.2)
├── postcss.config.js
├── sources/            # material de referência somente leitura (ChatGPT project sync)
├── index.html
├── package.json
└── vite.config.ts
```

`App.tsx`, `src/domain/`, `src/services/`, `src/domains/`, `src/shell/`, `src/lib/` e `src/test/` (organizações anteriores) foram todos removidos ao longo das migrações registradas neste documento. Cada feature do frontend tem seu `api/repository.ts` chamando a API real (`backend/`); não há mais dado de domínio em `localStorage` (só o token JWT, ver §3.1).

## 11. Metodologia

### 11.1 Desenvolvimento orientado a testes
- Regras de negócio e camada de dados de cada feature (`src/features/<feature>/model/rules.ts` e `api/repository.ts`) recebem teste primeiro, depois implementação, até o teste passar — como já registrado em `docs/superpowers/plans/2026-08-10-grafica-mvp.md` (Task 2 e Task 3: "Write failing tests ... Implement ... until tests pass").
- Regras de negócio isoladas em funções puras (`model/rules.ts` de cada feature no frontend; `core/*.py` no backend), sem acoplamento a UI — permite testar cálculo/permissão/geração de código sem montar componentes nem subir servidor.
- Camada de persistência isolada atrás do `api/repository.ts` de cada feature no frontend (chamando a API real) e atrás dos models SQLAlchemy no backend.
- Sem monolito modular/DDD tático formal (ao contrário do padrão organizacional de backend `06-BACKEND-ARCHITECTURE-AND-CODING-STANDARD.md`) — a separação por feature (seção 3.6) já aplica a mesma intenção de isolamento em escala reduzida, espelhada nos dois lados (frontend e backend).

### 11.2 Testes unitários e de integração (Vitest)
- Testes do frontend (`src/features/*/api/repository.test.ts`, `src/app/AppShell.test.tsx`) mockam `fetch` (`src/shared/testing/mockApi.ts`) — não fazem chamada de rede real, então rodam sem o backend/Postgres no ar.
- Validação de formulário (RHF + Zod, ver §2.2) roda em cima do mesmo `schema.ts` usado em produção — não há teste separado de validação client-side; os testes de integração de `AppShell.test.tsx` já exercitam os caminhos de erro (ex.: "As senhas não conferem.", "Informe o solicitante.") através da interação real com o formulário.
- Todo componente de `src/shared/ui/` roda também como teste de interação em Chromium real via `@storybook/addon-vitest` (projeto `storybook` do `vite.config.ts`, ver §2.3) — `npm test` roda os dois projetos (jsdom + storybook/Chromium) juntos.
- Verificação de entrega: `npm test` (Vitest) e `npm run build` (`tsc --noEmit` + `vite build`) devem passar antes de considerar uma mudança de frontend concluída — mesmo padrão do `README.md` ("Validação"). Mudanças de backend foram validadas manualmente via `curl` contra cada rota (sem suíte `pytest` ainda — ver §13).

### 11.3 Testes E2E e de acessibilidade (Playwright, 2026-08-11, a pedido explícito)
- `npm run test:e2e` (`playwright test`, config em `playwright.config.ts`) roda `tests/e2e/*.spec.ts` num navegador Chromium real, contra o app completo (frontend + backend + Postgres), não contra mocks.
- **Banco de dados isolado — nunca o banco real:** a suíte sobe um backend próprio na porta 8011, apontado para um banco Postgres **separado** (`grafica_test`, dentro do mesmo container Postgres, mas nunca a base `grafica` usada no dia a dia), recriado do zero (`DROP` + `CREATE` + migrations + seed) a cada execução por `backend/scripts/e2e_bootstrap.sh`. O script tem uma guarda explícita que aborta se `POSTGRES_DB` não for exatamente `grafica_test`. O frontend de teste sobe na porta 5174 (`VITE_API_URL=http://127.0.0.1:8011`) — nunca nas portas 8010/5173/5435 usadas pelos modos dev/pro (§3.17).
- **Autenticação via `storageState`, não login repetido:** um projeto `setup` do Playwright (`tests/e2e/auth.setup.ts`) autentica cada papel demo (Admin, Gerente, Operador, Consulta) uma única vez via UI e salva o estado de sessão em `playwright/.auth/<papel>.json`; os specs reais (`test.use({ storageState: ... })`) partem já autenticados. Necessário porque o login tem rate limit real de 5/minuto por IP (§3.16) e a suíte inteira roda do mesmo IP — nunca se afrouxa esse limite só para acomodar testes.
- **Acessibilidade:** `tests/e2e/accessibility.spec.ts` roda `@axe-core/playwright` (tags `wcag2a`/`wcag2aa`) sobre as telas principais e sobre os componentes Radix abertos (Dialog, DropdownMenu). Achados reais corrigidos por essa suíte, não por inspeção visual manual: um `<h2>` usado como filho direto de um menu (`role="menu"`, violação `aria-required-children`, corrigido trocando por `DropdownMenuLabel`) e o bug do Portal fora de `#theme-root` descrito em §7 (violação `color-contrast`). Uma exceção documentada permanece: `aria-hidden-focus` no `DropdownMenu`, limitação conhecida da lib `aria-hidden` (dependência interna do Radix, sem `inert`) — desabilitada pontualmente nesse teste, com a razão registrada no próprio arquivo.
- Cobertura atual: autenticação (login válido/inválido, sessão persistente, logout), CRUD completo de solicitações (criar/editar/mudar status/excluir, validação de campo obrigatório, filtro de busca), autorização por papel (itens de navegação ocultos, autoproteção de conta — não pode excluir a si mesmo nem a conta de sistema) e acessibilidade das telas/componentes principais.

## 12. Delivery Notes
- Implementação incremental e testável (Vitest cobrindo `src/features/<feature>/model/rules.ts` e `api/repository.ts`; backend validado via `curl` rota a rota).
- Qualquer desvio da stack canônica (seção 2) deve ser justificado antes de adotado.
- A troca de ASP.NET Core (plano original) por Python/FastAPI (seção 3.2) não exigiu reescrever regras de domínio do frontend — só a implementação interna de cada `repository.ts`, confirmando a premissa original do isolamento por repositório.
- **Adoção completa do padrão de arquitetura frontend (2026-08-11)** foi feita em 10 fases incrementais, cada uma com typecheck + suíte de testes + build (e, quando aplicável, varredura visual real no navegador em claro/escuro) antes de avançar para a próxima: fundação (dependências), TanStack Query por feature, reestruturação feature-first, Tailwind + Radix no app inteiro, Storybook, Playwright E2E + acessibilidade, e este próprio documento. Nenhuma fase quebrou os testes já existentes; a suíte de 37 testes de integração do frontend (`AppShell.test.tsx` e afins) permaneceu verde do início ao fim, servindo de rede de segurança pra migração inteira.
- **Bug de produção real encontrado só pela suíte de acessibilidade** (não pela revisão visual manual): componentes Radix portados (`Dialog`/`Select`/`DropdownMenu`) perdiam acesso ao tema por renderizar fora de `#theme-root` — ver §7. Reforça o valor de manter os três níveis de teste (unitário, Storybook/interação, E2E/acessibilidade), já que cada um pega uma classe diferente de regressão.

## 13. Next Spec Artifacts
Após este SPEC, os próximos artefatos ainda pendentes são:
- DATA SPEC formal (o schema já existe em `backend/app/db/models/` + `backend/alembic/`, mas não foi escrito como documento separado)
- SECURITY SPEC (revisão formal: rotação de token, política de senha, MFA — a autenticação demonstrativa já foi substituída por JWT+bcrypt reais, mas sem essa revisão)
- Suíte de testes automatizados do backend (`pytest` + `httpx.AsyncClient` contra um Postgres de teste) — hoje a validação do backend é manual via `curl`; a suíte E2E do frontend (§11.3) já cobre os fluxos críticos ponta a ponta, mas não substitui testes unitários de backend
- Focus trap próprio para o `DropdownMenu` (ver exceção documentada em §11.3) — resolveria de vez a limitação da lib `aria-hidden`, mas exigiria reimplementar parte do gerenciamento de foco por cima do Radix
- Code-splitting do bundle de produção (`vite build` avisa que o chunk principal passou de 500 kB depois da adoção de Radix/TanStack Query/RHF — ainda não é um problema real pro volume de uso atual, mas vale revisar se o app crescer)
