# Duplica — split Community/Pro (open-core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar o Duplica em duas linhas de código sem mudar a licença pública: `duplica`
(GitHub público, MIT, Community) continua com Solicitações/Dashboard/Cadastros/Plataforma;
`duplica-pro` (GitHub privado, novo) recebe o Parque de Impressão — feature que já foi
desenvolvida (10 commits + refinamentos não commitados) mas **nunca foi publicada**.

**Architecture:** `duplica-pro` nasce como clone completo do histórico público atual do `duplica`
(preserva toda a base Community). Os 10 commits de Parque de Impressão, hoje só locais, são
empurrados só para `duplica-pro`. O `working tree` atual (misto: refinamentos de Parque de
Impressão + melhorias de Community não relacionadas) é dividido por arquivo — nenhum arquivo
mistura as duas coisas, então a separação é por caminho completo, sem edição de hunk. O branch
público (`main` do repositório local `duplica`) é reconstruído a partir de `origin/main` (limpo)
mais só a parte Community do diff, via um branch novo (`community-wip`) — não via `reset --hard`,
para manter os commits de Parque de Impressão recuperáveis localmente até a migração ser
confirmada de ponta a ponta.

**Tech Stack:** Git, GitHub CLI (`gh`, já autenticado como `marcelodarckferreira`), Python 3.11 +
pytest (backend), Node/Vitest + Playwright (frontend) — as suítes de teste já existentes no
projeto, sem stack nova.

**Spec:** `docs/superpowers/specs/2026-08-29-open-core-community-pro-design.md`

## Global Constraints

- A licença MIT do `duplica` público não muda em nenhum passo deste plano.
- Nenhum commit ou arquivo do Parque de Impressão pode, em nenhum momento, ser enviado ao remoto
  público `origin` (`github.com/marcelodarckferreira/duplica`).
- Toda mensagem de commit criada neste plano declara explicitamente `[Community]` ou `[Pro]` no
  início do assunto do commit.
- `duplica-pro` é criado como repositório **privado**, mesma conta (`marcelodarckferreira`).
- Nenhum passo deste plano usa `git push --force` nem `git reset --hard` sobre um branch já
  publicado — a reconstrução do público usa um branch novo, não reescrita de histórico publicado.

---

## Classificação de arquivos (referência para todas as tasks)

Verificado nesta sessão: nenhum destes arquivos é tocado por mais de uma categoria — a separação
é 100% por caminho de arquivo, sem necessidade de dividir hunks.

**Pro (só `duplica-pro`):**
- `backend/app/print_fleet/` (todo o diretório)
- `backend/app/api/routes/print_fleet.py`
- `backend/app/schemas/print_fleet.py`
- `src/features/print-fleet/` (todo o diretório)
- `tests/e2e/print-fleet.spec.ts`
- `docs/PARQUE_IMPRESSAO_OPERACAO.md` (já commitado nos 10 commits)

**Community (só `duplica` público):**
- `README.md` (diff inteiro — não menciona Parque de Impressão em nenhuma linha)
- `backend/app/db/seed.py` (sanitiza nome de cliente real "SEMED"/Nova Iguaçu do seed de demo)
- `src/features/users/api/repository.test.ts`
- `tests/e2e/authorization.spec.ts`
- `LICENSE` (novo arquivo untracked, texto MIT — formaliza o que o README já dizia)

---

### Task 1: Criar o repositório privado `duplica-pro` no GitHub

**Files:** nenhum arquivo local — só o repositório remoto.

- [ ] **Step 1: Criar o repositório privado**

```bash
gh repo create marcelodarckferreira/duplica-pro --private \
  --description "Duplica Pro — Parque de Impressão, bilhetagem e demais módulos exclusivos (fork privado do Duplica Community)"
```

- [ ] **Step 2: Verificar que foi criado como privado**

```bash
gh repo view marcelodarckferreira/duplica-pro --json visibility,defaultBranchRef
```

Expected: `{"defaultBranchRef":null,"visibility":"PRIVATE"}` (branch padrão ainda nulo — repositório
vazio, sem push ainda).

---

### Task 2: Publicar a base + os 10 commits do Parque de Impressão em `duplica-pro`

**Files:**
- Modify: configuração de remotes do clone local em `/root/project/duplica` (`.git/config` via
  `git remote add`, não é edição manual do arquivo).

**Interfaces:**
- Consome: repositório `duplica-pro` criado na Task 1.
- Produz: remoto `pro` configurado no clone local, com `pro/main` = `HEAD` atual
  (`e4b4d7b`, origin/main + 10 commits de Parque de Impressão).

- [ ] **Step 1: Confirmar que o HEAD local está exatamente onde o plano espera**

```bash
cd /root/project/duplica
git log --oneline -1 HEAD
git log --oneline -1 origin/main
git rev-list --left-right --count origin/main...HEAD
```

Expected: `HEAD` = `e4b4d7b feat: complete print fleet management`; `origin/main` =
`b0b8762 Show consumed sheet count (Folhas) alongside reams in request print data`; contagem =
`0	10` (origin/main não tem nada que HEAD não tenha; HEAD tem 10 commits a mais).

- [ ] **Step 2: Adicionar o remoto `pro` e empurrar o histórico atual**

```bash
git remote add pro https://github.com/marcelodarckferreira/duplica-pro.git
git push pro HEAD:main
```

- [ ] **Step 3: Verificar que os 10 commits chegaram ao remoto `pro`**

```bash
git fetch pro
git log --oneline pro/main -12
git rev-list --count pro/main
```

Expected: os 10 commits de Parque de Impressão aparecem no topo do log de `pro/main`, terminando
em `e4b4d7b`.

---

### Task 3: Commitar os refinamentos Pro não commitados e publicar em `duplica-pro`

**Files:**
- Modify (commit): `backend/app/api/routes/print_fleet.py`,
  `backend/app/print_fleet/monitoring.py`, `backend/app/print_fleet/service.py`,
  `backend/app/print_fleet/snmp.py`, `backend/app/print_fleet/worker.py`,
  `backend/app/schemas/print_fleet.py`, `src/features/print-fleet/api/repository.ts`,
  `src/features/print-fleet/model/queries.ts`, `src/features/print-fleet/model/rules.ts`,
  `src/features/print-fleet/ui/DiscoveryPanel.tsx`, `src/features/print-fleet/ui/NetworksPanel.tsx`,
  `src/features/print-fleet/ui/PrintFleetView.tsx`, `src/features/print-fleet/ui/PrintersPanel.tsx`,
  `tests/e2e/print-fleet.spec.ts`.

**Interfaces:**
- Consome: `pro/main` publicado na Task 2.
- Produz: novo commit em `main` (local) com só os arquivos Pro listados acima, também publicado em
  `pro/main`.

- [ ] **Step 1: Conferir que o `working tree` só tem os arquivos esperados nessas categorias**

```bash
cd /root/project/duplica
git status --short
```

Expected: a lista bate com a "Classificação de arquivos" no topo deste plano (18 arquivos
modificados + `LICENSE` untracked).

- [ ] **Step 2: Adicionar e commitar só os arquivos Pro**

```bash
git add backend/app/api/routes/print_fleet.py backend/app/print_fleet/ backend/app/schemas/print_fleet.py \
  src/features/print-fleet/ tests/e2e/print-fleet.spec.ts
git commit -m "[Pro] Refina UI de descoberta/monitoramento e worker do Parque de Impressão"
```

- [ ] **Step 3: Publicar o novo commit em `duplica-pro`**

```bash
git push pro HEAD:main
git log --oneline pro/main -1
```

Expected: o commit `[Pro] Refina UI de descoberta/monitoramento e worker do Parque de Impressão`
aparece como topo de `pro/main`.

---

### Task 4: Rodar as suítes de teste sobre a árvore Pro completa

**Files:** nenhum arquivo novo — só execução de testes já existentes.

- [ ] **Step 1: Testes de backend**

```bash
cd /root/project/duplica/backend
PYTHONPATH=. .venv/bin/pytest -q
```

Expected: todos os testes passam (a spec registra 77 testes de backend na implementação original;
não deve haver regressão).

- [ ] **Step 2: Testes de frontend**

```bash
cd /root/project/duplica
npm test
npm run build
```

Expected: Vitest e `tsc --noEmit`/build de produção passam sem erro.

- [ ] **Step 3: Se algo falhar**

Corrigir o problema diretamente nos arquivos Pro (todos vivem só em `duplica-pro` a partir daqui),
re-rodar Steps 1–2, e re-publicar com `git add <arquivo corrigido> && git commit --amend --no-edit
&& git push pro HEAD:main --force-with-lease` (force aceitável aqui porque `pro/main` ainda não é
consumido por ninguém além desta migração).

---

### Task 5: Construir o branch limpo `community-wip` a partir de `origin/main`

**Files:**
- Create (commit): `LICENSE` (texto MIT).
- Modify (commit): `README.md`, `backend/app/db/seed.py`,
  `src/features/users/api/repository.test.ts`, `tests/e2e/authorization.spec.ts`.

**Interfaces:**
- Consome: `origin/main` (`b0b8762`, público, intocado), e o `working tree` local (que neste ponto
  do plano já teve os arquivos Pro commitados na Task 3 — os arquivos Community continuam como
  diff não commitado contra `main`).
- Produz: branch local `community-wip`, baseado em `origin/main`, com um commit `[Community]`
  contendo só os 4 arquivos + `LICENSE`.

- [ ] **Step 1: Gerar o patch só dos arquivos Community, a partir do branch `main` atual**

```bash
cd /root/project/duplica
git diff -- README.md backend/app/db/seed.py \
  src/features/users/api/repository.test.ts tests/e2e/authorization.spec.ts \
  > /tmp/duplica-community.patch
cat /tmp/duplica-community.patch | head -5
```

Expected: o patch não fica vazio (tem as mudanças de README, seed.py, e os dois arquivos de
teste).

- [ ] **Step 2: Descartar as mudanças desses arquivos no `working tree` do `main`**

O patch do Step 1 já preservou o conteúdo em `/tmp/duplica-community.patch` — é seguro reverter
esses 4 arquivos ao estado commitado antes de trocar de branch, porque `git checkout -b` recusa
trocar de branch com mudanças não commitadas em arquivos que diferem entre o `HEAD` atual e o
branch de destino.

```bash
git checkout -- README.md backend/app/db/seed.py \
  src/features/users/api/repository.test.ts tests/e2e/authorization.spec.ts
git status --short
```

Expected: só o `LICENSE` (untracked) e os arquivos Pro já commitados na Task 3 aparecem — nenhum
dos 4 arquivos Community aparece mais como modificado.

- [ ] **Step 3: Criar o branch `community-wip` a partir de `origin/main`**

```bash
git checkout -b community-wip origin/main
```

Nota: o arquivo `LICENSE` (untracked) continua no disco — `git checkout` não mexe em arquivo não
rastreado, só nos arquivos rastreados que mudam de conteúdo entre branches.

- [ ] **Step 4: Aplicar o patch de Community sobre o branch limpo**

```bash
git apply /tmp/duplica-community.patch
git status --short
```

Expected: `README.md`, `backend/app/db/seed.py`, `src/features/users/api/repository.test.ts` e
`tests/e2e/authorization.spec.ts` aparecem modificados; `LICENSE` aparece como `??` (untracked,
como já estava).

- [ ] **Step 5: Commitar**

```bash
git add README.md backend/app/db/seed.py src/features/users/api/repository.test.ts \
  tests/e2e/authorization.spec.ts LICENSE
git commit -m "[Community] Sanitiza dados de demo, adiciona LICENSE MIT e documenta melhorias de plataforma"
```

---

### Task 6: Rodar as suítes de teste sobre `community-wip`

**Files:** nenhum arquivo novo.

- [ ] **Step 1: Testes de backend**

```bash
cd /root/project/duplica/backend
PYTHONPATH=. .venv/bin/pytest -q
```

Expected: todos os testes passam — nenhum deles depende de Parque de Impressão (esse módulo não
existe mais neste branch).

- [ ] **Step 2: Testes de frontend**

```bash
cd /root/project/duplica
npm test
npm run build
```

Expected: passam sem erro. Se o build falhar por referência a algo de `print-fleet` esquecido em
algum lugar fora dos arquivos já classificados, essa referência entra na lista Community/Pro
correta antes de prosseguir — não se comenta/mascara o erro.

---

### Task 7: Promover `community-wip` a `main` e publicar no `duplica` público

**Files:** nenhum arquivo — operação de branch e push.

**Interfaces:**
- Consome: `community-wip` validado (Task 6).
- Produz: `origin/main` (público) avançado de `b0b8762` para o novo commit `[Community]`; branch
  local antigo preservado sob outro nome, para rollback fácil se necessário.

- [ ] **Step 1: Preservar o branch antigo (com os commits de Parque de Impressão) sob outro nome**

```bash
cd /root/project/duplica
git branch -m main main-pro-backup-20260829
```

- [ ] **Step 2: Promover `community-wip` a `main`**

```bash
git branch -m community-wip main
```

- [ ] **Step 3: Publicar no público — fast-forward, sem force**

```bash
git push origin main
```

Expected: push aceito sem `--force` (prova de que é um fast-forward real a partir de
`origin/main`).

- [ ] **Step 4: Confirmar que nada de Parque de Impressão chegou ao público**

```bash
git log origin/main --oneline -- backend/app/print_fleet src/features/print-fleet
git ls-tree -r origin/main --name-only | grep -i print_fleet
```

Expected: as duas saídas vêm vazias.

- [ ] **Step 5: Commit da spec e do plano (se ainda não estiverem em `main`)**

```bash
git log --oneline -3 -- docs/superpowers/specs/2026-08-29-open-core-community-pro-design.md
```

Expected: o commit da spec (`8a79d7a`, já feito antes deste plano) aparece no histórico de `main`
— como a spec foi commitada antes da task 1 deste plano, sobre o `main` antigo, ela precisa ser
cherry-picked para o `main` novo caso não apareça:

```bash
git cherry-pick 8a79d7a
```

(Rode só se o `git log` do passo anterior vier vazio.)

---

### Task 8: Documentar o Pro no README público

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consome: `main` já publicado (Task 7).

- [ ] **Step 1: Adicionar uma seção curta antes de "## Licença"**

Editar `README.md`, inserindo antes da seção `## Licença`:

```markdown
## Duplica Pro

Este repositório é a edição **Community** do Duplica (MIT, uso livre inclusive comercial). Uma
edição **Pro**, com módulos adicionais (Parque de Impressão, bilhetagem por custo/local, entre
outros), é distribuída por contrato através dos Serviços da Darckware — inclui instalação,
suporte e atualizações contínuas. Não é um fork público; o código do Pro não fica neste
repositório.
```

- [ ] **Step 2: Commitar e publicar**

```bash
git add README.md
git commit -m "[Community] Documenta a existência da edição Pro no README"
git push origin main
```

---

### Task 9: Registrar a migração e o estado final na spec

**Files:**
- Modify: `docs/superpowers/specs/2026-08-29-open-core-community-pro-design.md`

- [ ] **Step 1: Adicionar uma nota de "Execução" ao final do documento**

Adicionar, ao final do arquivo:

```markdown
## Execução

Migração concluída em 2026-08-29:
- `duplica-pro` criado como privado; `pro/main` contém a base Community + os 10 commits de
  Parque de Impressão + o commit de refinamentos `[Pro]`.
- `duplica` público republicado a partir de um branch limpo (`community-wip` → `main`), sem
  nenhum commit ou arquivo de Parque de Impressão.
- Branch antigo preservado localmente como `main-pro-backup-20260829` (não publicado) até
  confirmação final de que `duplica-pro` está correto.
```

- [ ] **Step 2: Commitar**

```bash
cd /root/project/duplica
git add docs/superpowers/specs/2026-08-29-open-core-community-pro-design.md
git commit -m "[Community] Registra execução da migração Community/Pro na spec"
git push origin main
```

---

## Fora de escopo deste plano

- Exibição do Duplica Pro no site da Darckware (`/root/project/darckware`) — trabalho novo, em
  outro repositório, a ser desenhado separadamente.
- Bilhetagem (segunda feature Pro) — implementada depois, direto em `duplica-pro`, seguindo a
  regra "módulo novo nasce no Pro" já registrada na spec.
- Remoção do branch `main-pro-backup-20260829` — decisão manual do Marcelo, depois de confirmar
  que `duplica-pro` está correto (não é feita automaticamente por este plano).
