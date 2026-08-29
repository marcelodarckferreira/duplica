# Duplica — split Community/Pro (open-core) — design

## Contexto

O Duplica é publicado hoje no GitHub (`marcelodarckferreira/duplica`, público, MIT) como um único
produto: sistema de controle de solicitações de cópia/impressão institucional (Solicitações,
Dashboard, Cadastros, Plataforma). É uma instância única por cliente — uma imagem Docker, um
banco, sem multi-tenant — não um SaaS com vários clientes na mesma instalação.

Uma feature nova, o **Parque de Impressão** (descoberta/monitoramento de impressoras de rede via
SNMP — spec original em `docs/superpowers/specs/2026-08-27-print-fleet-discovery-design.md`), foi
implementada e verificada (77 testes backend, 93 frontend, E2E, build de produção — ver
`docs/PARQUE_IMPRESSAO_OPERACAO.md`), mas **nunca foi publicada**: os 10 commits que a compõem
existem só no repositório local, `origin/main` continua na baseline anterior
(`b0b8762`). Havia também, no momento desta decisão, um `working tree` com mudanças não
commitadas misturando refinamentos de Parque de Impressão com melhorias de escopo diferente (login
por usuário/e-mail, painel "Sobre" autenticado, permissão `managePeople` separada, tela de
consulta dedicada, Storybook, usuário de demonstração "ti").

Decisão de negócio de Marcelo (sessão de 2026-08-29): o Duplica passa a ter duas frentes —
**Community** (o que já está publicado, open source, MIT) e **Pro** (funcionalidades avançadas,
vendidas via contrato de Serviços). O Parque de Impressão é a primeira feature Pro; bilhetagem
(custo/rateio por página impressa e por local) é a segunda, ainda não iniciada. Esta spec cobre
**só o Duplica** — o ForgeRouter foi avaliado e descartado para este tratamento: continua
inteiramente open source (MPL-2.0), sem versão paga.

Um terceiro nível, "Master", foi mencionado por Marcelo como direção futura, mas está fora do
escopo desta spec — a topologia abaixo (fork + merge) generaliza para um terceiro repositório
(`duplica-master`, fork do `duplica-pro`) sem precisar ser redesenhada quando isso for decidido.

## Decisões já aprovadas

1. **Licenciamento do Community não muda.** MIT continua exatamente como está — sem restrição de
   uso comercial, sem troca de licença. (Decisão tomada depois de descartar uma direção anterior,
   nesta mesma conversa, que cogitava restringir a licença pública a uso não comercial; Marcelo
   reverteu essa direção: "open source não tem nenhum limite".)
2. **Entrega do Pro: repositório privado separado**, não uma chave de licença dentro do mesmo
   código. Motivo: o Duplica não é SaaS (instância única por cliente), então não há necessidade de
   um mecanismo de licenciamento em runtime; um repositório privado à parte é mais simples, tem
   zero risco de vazar código Pro no público, e já combina com o modelo comercial que a Darckware
   usa para sistemas exclusivos de cliente.
3. **Regra de classificação de módulo, daqui pra frente**: um módulo que já existe no Community
   continua recebendo manutenção/refinamento ali. **Qualquer módulo novo nasce direto no
   `duplica-pro`, nunca no público.** Não é uma decisão caso a caso — é automática pelo critério
   "isso é um domínio de funcionalidade novo?".
4. **Empacotamento comercial do Pro: pacote único, tudo incluso.** Sem tiers dentro do Pro. Um
   cliente que contrata o Pro recebe as features exclusivas (Parque de Impressão, bilhetagem, e
   futuras) **junto com** instalação, suporte reativo e atualizações contínuas — sem opção de
   contratar essas três camadas de serviço separadamente por enquanto. (As três camadas —
   instalação: pontual; suporte: recorrente reativo; atualizações contínuas: recorrente
   proativo — existem conceitualmente, mas não são vendidas fracionadas nesta v1.)
5. **Regra de processo**: toda vez que uma sessão de implementação ou ajuste tocar o Duplica, a
   resposta ao usuário e a mensagem de commit devem declarar explicitamente se aquele trabalho é
   **Community (open source)** ou **Pro** — nunca deixar implícito.

## Arquitetura

### Topologia de repositórios

```
GitHub (marcelodarckferreira/duplica)     — público, MIT, Community
   │
   │  git clone (histórico completo, na origin/main atual)
   ▼
GitHub (marcelodarckferreira/duplica-pro) — privado, sem licença pública, Pro
```

`duplica-pro` nasce como um clone completo do histórico público do `duplica` (garante que todo o
histórico do Community está disponível como base). A partir daí, os dois repositórios evoluem de
forma independente, com um fluxo de sincronização unidirecional:

- **Community → Pro**: quando o Community recebe uma correção ou melhoria num módulo existente,
  ela é trazida para o `duplica-pro` via `git fetch` do remoto público + `git merge` (fluxo padrão
  de git, sem ferramenta adicional). Isso mantém o Pro sempre com a base Community mais recente por
  baixo das features exclusivas.
- **Pro → Community**: não existe. Nenhum commit de módulo Pro é levado ao público, nunca.

Esse desenho generaliza para o nível "Master" futuro: seria um terceiro repositório privado,
clonado do `duplica-pro`, com o mesmo fluxo unidirecional (Pro → Master), sem alterar nada do que
está desenhado aqui.

### Migração do estado atual (execução única, não recorrente)

Estado de partida: `origin/main` = `b0b8762` (limpo, sem Parque de Impressão); `HEAD` local =
`e4b4d7b`, 10 commits à frente, todos exclusivamente de Parque de Impressão; `working tree` com
diff não commitado misturando Pro (refinamentos de Parque de Impressão) e Community (login por
e-mail, painel "Sobre", `managePeople`, Storybook, usuário "ti").

Passos, em ordem (cada um só começa depois do anterior estar confirmado):

1. Criar `duplica-pro` como repositório **privado** no GitHub, sob a mesma conta
   (`marcelodarckferreira`).
2. Empurrar o `HEAD` local atual (origin/main + os 10 commits de Parque de Impressão) para
   `duplica-pro` como sua história inicial.
3. **Confirmar** (via `git log`/comparação de SHA) que os 10 commits estão de fato no remoto
   `duplica-pro` antes de qualquer passo destrutivo no repositório público.
4. No `working tree` atual do `duplica` (repo público), separar o diff não commitado em duas
   partes por arquivo/hunk:
   - Parte Pro (tudo sob `backend/app/print_fleet/`, `backend/app/api/routes/print_fleet.py`,
     `backend/app/schemas/print_fleet.py`, `src/features/print-fleet/`,
     `tests/e2e/print-fleet.spec.ts`, e os trechos do `README.md` que descrevem essa feature) —
     aplicada como commit adicional em `duplica-pro`.
   - Parte Community (login por usuário/e-mail, painel "Sobre" autenticado, permissão
     `managePeople`, tela de consulta dedicada, Storybook, usuário "ti", e os trechos do
     `README.md` que descrevem essas mudanças) — guardada para o passo 6.
5. Resetar o branch local do `duplica` público para `origin/main`
   (`git reset --hard origin/main`), descartando os 10 commits de Parque de Impressão **do
   repositório público** — seguro porque o passo 3 já confirmou que eles estão preservados no
   `duplica-pro`.
6. Aplicar a parte Community do diff (separada no passo 4) sobre o `origin/main` limpo, revisar,
   e commitar normalmente no `duplica` público.
7. Atualizar o `README.md` público do Duplica com uma seção curta explicando a existência do Pro
   (sem detalhar preço/contrato — isso é comercial, não técnico) e apontando para o Serviços da
   Darckware.

### Fora de escopo desta spec

- Site da Darckware (página de produto do Duplica, menção a "Pro" no catálogo) — tratado depois,
  como tarefa separada.
- Nível "Master" — mencionado só para não travar a topologia, sem desenho próprio ainda.
- Página de "direitos de uso"/isenção de responsabilidade do site institucional (ForgeRouter e
  Duplica Community) — discutida antes desta sessão de brainstorming, ainda pendente de decisão
  final sobre o texto; não faz parte deste documento.
- Bilhetagem (segunda feature Pro) — desenho próprio quando a implementação começar; aqui só
  entra como exemplo do "módulo novo nasce em `duplica-pro`" (regra 3).

## Execução

Migração concluída em 2026-08-29:
- `duplica-pro` criado como privado; `pro/main` contém a base Community + os 10 commits de
  Parque de Impressão + o commit de refinamentos `[Pro]`.
- `duplica` público republicado a partir de um branch limpo (`community-wip` → `main`), sem
  nenhum commit ou arquivo de Parque de Impressão.
- Branch antigo preservado localmente como `main-pro-backup-20260829` (não publicado) até
  confirmação final de que `duplica-pro` está correto.
