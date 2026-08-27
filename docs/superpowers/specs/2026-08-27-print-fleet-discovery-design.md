# Descoberta e Cadastro do Parque de Impressão — Design

## 1. Objetivo

Adicionar ao Duplica um módulo para descobrir impressoras na rede da sede, confirmar seu cadastro por setor e acompanhar o estado dos seus insumos por SNMP.

Este é o primeiro incremento do futuro servidor de bilhetagem. Ele entrega inventário e monitoramento do parque, mas não recebe, processa nem envia trabalhos de impressão.

## 2. Decisões aprovadas

- O módulo será integrado ao Duplica e reutilizará autenticação, RBAC, auditoria, interface e PostgreSQL existentes.
- A API web continuará no processo FastAPI atual.
- Descoberta e telemetria serão executadas por um worker separado, distribuído na mesma imagem da aplicação.
- O PostgreSQL será a fila persistente desta fase; Redis ou outro broker não será introduzido.
- O escopo físico será somente a sede.
- A localização de uma impressora será um setor já cadastrado em `units` com `origin = "SEDE"`.
- As redes de descoberta serão cadastradas e nunca ficarão fixas no código.
- A primeira versão executará descoberta sob demanda e telemetria periódica das impressoras confirmadas.
- A primeira versão suportará SNMP v2c. O modelo aceitará a evolução posterior para SNMP v3 sem guardar campos de autenticação v3 ainda não utilizados.
- Alertas de insumo serão exibidos no Duplica; notificações externas não fazem parte desta fase.

## 3. Escopo funcional

### 3.1 Incluído

- cadastrar, editar, ativar e desativar redes autorizadas para descoberta;
- cadastrar exclusões de endereços ou sub-redes dentro de cada rede;
- armazenar a comunidade SNMP v2c de forma cifrada;
- iniciar manualmente uma descoberta;
- acompanhar o progresso e o resultado de cada execução;
- identificar quais dispositivos SNMP são impressoras;
- registrar impressoras descobertas como pendentes de revisão;
- cadastrar uma impressora manualmente quando a descoberta não for aplicável;
- confirmar, ignorar, editar, ativar e suspender o monitoramento de impressoras;
- associar cada impressora confirmada a um setor ativo da sede;
- coletar identificação, estado operacional, erros e insumos;
- exibir nível atual, estado e histórico de cada insumo;
- filtrar o parque por setor, fabricante, comunicação e situação dos insumos;
- registrar no log de auditoria todas as mutações administrativas.

### 3.2 Fora do escopo

- IPP, SMB, CUPS ou filas de drivers;
- upload, análise ou conversão de PDF;
- envio RAW pela porta 9100;
- cotas, retenção, liberação ou reordenação de trabalhos;
- fallback ou roteamento de impressão;
- LDAP ou Active Directory;
- alteração automática de configurações nas impressoras;
- notificação por e-mail, WhatsApp, Telegram ou push;
- compra, estoque ou previsão de reposição de insumos;
- SNMP traps;
- SNMP v3 nesta primeira versão.

## 4. Arquitetura

```text
┌──────────────────────┐      HTTPS       ┌─────────────────────────┐
│ React / Duplica      │ ◀──────────────▶ │ FastAPI / Duplica       │
│ Parque de impressão │                   │ API + RBAC + auditoria  │
└──────────────────────┘                   └────────────┬────────────┘
                                                      │
                                                      │ PostgreSQL
                                                      ▼
                                            ┌───────────────────────┐
                                            │ redes, execuções,     │
                                            │ impressoras, insumos  │
                                            └────────────┬──────────┘
                                                      ▲ │
                               claim transacional     │ │ resultados
                                                      │ ▼
                                            ┌───────────────────────┐
                                            │ Worker de impressão   │
                                            │ discovery + polling   │
                                            └────────────┬──────────┘
                                                      │ UDP 161
                                                      ▼
                                            ┌───────────────────────┐
                                            │ Impressoras da sede   │
                                            └───────────────────────┘
```

O worker será iniciado por um comando Python próprio e incluído como segundo serviço do Compose. A API nunca percorrerá redes nem aguardará respostas SNMP dentro de uma requisição HTTP.

O worker obterá execuções pendentes com uma transação curta e `FOR UPDATE SKIP LOCKED`. Após reivindicar uma execução, fará os probes fora da transação e persistirá progresso em pequenos lotes. Isso permite reinício seguro e evita manter conexões ou locks durante uma varredura.

Não haverá broker dedicado nesta fase. Caso o volume futuro exija vários workers, filas prioritárias ou entrega distribuída, a interface de tarefas poderá ser migrada sem alterar os contratos HTTP ou o modelo do parque.

## 5. Modelo de dados

Todos os identificadores novos serão UUIDs representados como strings na API. Datas serão armazenadas com timezone em UTC e formatadas em pt-BR somente no frontend.

### 5.1 Setores

A tabela `units` continuará sendo a fonte de verdade dos setores. Uma impressora somente poderá ser vinculada a uma unidade ativa cujo `origin` seja `SEDE`.

Não serão criadas tabelas de prédio, pavimento, sala ou localização livre nesta fase.

### 5.2 `discovery_networks`

Representa uma faixa que o administrador autorizou o worker a consultar.

Campos principais:

- `id`;
- `name`;
- `cidr`, normalizado pelo backend;
- `excluded_cidrs`, lista normalizada de IPs ou sub-redes contidas no CIDR principal;
- `snmp_version`, limitado a `V2C` nesta versão;
- `community_ciphertext`;
- `timeout_ms`, padrão `1000`;
- `retries`, padrão `0` para descoberta;
- `concurrency_limit`, padrão `64`, limitado pelo backend entre `1` e `128`;
- `active`;
- `created_at`, `updated_at` e usuário responsável pela última alteração.

A chave de cifra será fornecida por `SNMP_CREDENTIAL_ENCRYPTION_KEY`. A aplicação falhará ao iniciar o worker se existirem redes ativas e essa chave não estiver configurada. A comunidade nunca será devolvida por endpoints de leitura; atualizações aceitarão um novo valor, mas respostas mostrarão apenas se uma credencial está configurada.

O cadastro aceitará qualquer CIDR válido porque a infraestrutura real pode conter endereçamento legado. A interface exibirá uma advertência quando a faixa não for privada segundo RFC 1918. Nenhuma rede, inclusive `172.15.0.0/16`, será pré-cadastrada sem confirmação operacional do endereço real.

### 5.3 `discovery_runs`

Representa uma execução solicitada pelo administrador.

Campos principais:

- `id` e `network_id`;
- `status`: `PENDING`, `RUNNING`, `COMPLETED`, `COMPLETED_WITH_ERRORS` ou `FAILED`;
- `total_targets`, `scanned_targets`, `responsive_devices`, `printers_found`, `new_printers` e `error_count`;
- `requested_by_user_id`;
- `requested_at`, `started_at`, `finished_at` e `heartbeat_at`;
- `last_error_code` e mensagem sanitizada;
- instantâneo dos parâmetros não secretos usados pela execução.

Somente uma execução poderá ficar `PENDING` ou `RUNNING` por rede. Uma execução `RUNNING` sem heartbeat por cinco minutos será elegível para retomada. O processamento retomado continuará a partir dos lotes concluídos e as gravações serão idempotentes.

Os resumos das execuções serão preservados. Eventos técnicos detalhados terão retenção de 90 dias para não transformar o banco em repositório ilimitado de probes.

### 5.4 `printers`

Representa equipamentos descobertos ou cadastrados manualmente.

Campos principais:

- `id` e `discovery_network_id`;
- `management_address` do tipo PostgreSQL `INET`;
- `mac_address`, quando observável;
- `serial_number`, quando fornecido pelo equipamento;
- `sys_object_id`, `sys_name` e `sys_description`;
- `manufacturer`, `model` e `display_name`;
- `unit_id`, nulo enquanto o equipamento estiver pendente;
- `onboarding_status`: `PENDING`, `CONFIRMED` ou `IGNORED`;
- `monitoring_enabled`;
- `operational_status`: `UNKNOWN`, `IDLE`, `PRINTING`, `WARMUP`, `ERROR` ou `NO_COMMUNICATION`;
- `detected_error_state_raw` e erros normalizados;
- `consecutive_poll_failures`;
- `first_seen_at`, `last_seen_at`, `last_polled_at` e `updated_at`.

Uma impressora confirmada exige `display_name`, endereço de gerenciamento e `unit_id` de um setor ativo da sede.

`discovery_network_id` será obrigatório inclusive no cadastro manual, pois define a credencial e os limites usados no monitoramento. O endereço informado deverá pertencer à rede selecionada e não poderá estar dentro de suas exclusões.

A deduplicação tentará, nesta ordem: identidade já associada ao mesmo equipamento, número de série confiável, MAC e endereço dentro da mesma rede. Se identificadores existentes apontarem para registros diferentes, o worker não fará fusão automática: registrará conflito para revisão administrativa.

O endereço IP é mutável e não será a identidade permanente do equipamento. Em produção, ainda se recomenda IP fixo ou reserva DHCP para previsibilidade operacional.

### 5.5 `discovery_run_batches` e `discovery_events`

`discovery_run_batches` permitirá processar e retomar redes grandes sem criar uma linha por endereço. Cada registro conterá execução, primeiro e último endereço do lote, estado, contadores, tentativas e timestamps. Um `/16` será dividido em lotes de no máximo 256 endereços antes do início dos probes.

`discovery_events` guardará somente ocorrências que exigem diagnóstico ou revisão, como conflito de identidade, falha de credencial, resposta SNMP inválida ou erro de lote. Respostas bem-sucedidas comuns não gerarão um evento por IP. Os eventos terão código estável, endereço, resumo sanitizado e retenção de 90 dias.

### 5.6 `printer_supplies`

Mantém o estado mais recente dos insumos observados.

Campos principais:

- `id` e `printer_id`;
- `snmp_index`, contendo o sufixo completo do índice retornado pela Printer-MIB;
- `description_raw` e `type_raw`;
- `normalized_type`: `TONER`, `INK`, `DRUM`, `WASTE`, `MAINTENANCE_KIT`, `OTHER` ou `UNKNOWN`;
- `color`: `BLACK`, `CYAN`, `MAGENTA`, `YELLOW`, `OTHER` ou `UNKNOWN`;
- `capacity_raw`, `level_raw` e `capacity_unit_raw`;
- `level_percent`, nulo quando não puder ser calculado com segurança;
- `alert_status`: `NORMAL`, `WARNING`, `CRITICAL` ou `UNKNOWN`;
- `warning_threshold_percent`, padrão `20`;
- `critical_threshold_percent`, padrão `10`;
- `first_seen_at`, `last_seen_at` e `updated_at`.

A combinação `printer_id + snmp_index` será única. Os valores brutos serão preservados para diagnóstico. O percentual somente será calculado quando capacidade e nível forem positivos e coerentes. Códigos negativos definidos pela MIB como desconhecido, outro ou alguma quantidade não serão convertidos em zero.

### 5.7 `supply_readings`

Armazena o histórico necessário para gráficos e auditoria operacional:

- `id`, `printer_supply_id` e `recorded_at`;
- capacidade, nível e unidade brutos;
- percentual derivado e estado de alerta.

Uma leitura será gravada quando o valor ou o estado mudar e, mesmo sem mudança, uma vez a cada 24 horas como heartbeat histórico. A retenção inicial será de 12 meses. A limpeza ocorrerá em lotes pelo worker.

## 6. Descoberta SNMP

### 6.1 Preparação dos alvos

O backend normaliza o CIDR e valida que todas as exclusões estejam contidas na rede. O worker gera somente endereços de host, remove rede, broadcast e exclusões e divide o conjunto em lotes persistentes.

Uma rede `/16` contém 65.534 hosts utilizáveis e será aceita, mas nunca enviada como uma única rajada. O padrão será lote de 256 endereços, concorrência 64, timeout de um segundo e nenhuma repetição durante descoberta. O monitoramento periódico usará uma repetição após falha. Esses parâmetros poderão ser reduzidos por rede. O teste inicial em produção deverá começar por uma sub-rede menor ou por uma janela autorizada pela equipe de infraestrutura.

O discovery não dependerá de ICMP. Muitos equipamentos bloqueiam ping e continuam respondendo ao UDP 161.

### 6.2 Identificação

O probe inicial consultará identificação padrão, incluindo `sysObjectID`, `sysDescr` e `sysName`. Para classificar o equipamento como impressora, o worker exigirá evidência da Host Resources MIB ou Printer-MIB, como uma entrada de dispositivo do tipo impressora e tabelas de impressora acessíveis.

Responder ao SNMP não será suficiente para entrar no parque. Switches, roteadores, servidores e outros dispositivos serão contados como dispositivos responsivos, mas não serão persistidos como impressoras.

Fabricante e modelo serão derivados primeiro dos identificadores padronizados e descrições retornadas. Adaptadores específicos de HP e Epson poderão complementar a normalização sem substituir os valores brutos.

### 6.3 OIDs e índices

O worker usará walks das tabelas relevantes em vez de presumir índices fixos como `.1.1` ou `.1.X`. Isso é necessário porque `hrDeviceIndex`, `prtMarkerIndex` e `prtMarkerSuppliesIndex` variam entre modelos e firmwares.

As fontes principais serão:

- MIB-II para identificação do dispositivo;
- Host Resources MIB para tipo, status e erros da impressora;
- Printer-MIB RFC 3805 para identificação, contadores e suprimentos.

O estado detectado de erro será interpretado como bit string, não como um inteiro simples. Valores desconhecidos permanecerão disponíveis para diagnóstico.

### 6.4 Resultado da descoberta

Impressoras novas serão criadas como `PENDING`, sem setor e com monitoramento desativado. Equipamentos conhecidos terão identificação, endereço e `last_seen_at` atualizados, respeitando as regras de deduplicação.

O administrador poderá:

- confirmar e associar ao setor;
- corrigir nome, fabricante e modelo apresentados;
- ignorar o equipamento;
- reabrir posteriormente um registro ignorado.

Uma nova varredura não excluirá, desativará nem removerá associações existentes.

## 7. Monitoramento periódico

O worker consultará apenas impressoras `CONFIRMED` com `monitoring_enabled = true`. O intervalo padrão será de 15 minutos.

Cada ciclo coletará identificação mínima, status operacional, erros e a tabela de insumos. Uma resposta válida zera `consecutive_poll_failures` e atualiza `last_seen_at`. Falhas incrementam o contador; depois de três falhas consecutivas, o estado passa para `NO_COMMUNICATION`.

Uma resposta posterior recupera automaticamente o equipamento, sem exigir intervenção administrativa. Insumos que deixarem de aparecer não serão apagados na primeira ausência; serão marcados como não observados e somente ocultados da visão principal depois de três coletas válidas consecutivas sem o índice.

Limites padrão:

- `WARNING`: percentual menor ou igual a 20%;
- `CRITICAL`: percentual menor ou igual a 10%;
- `UNKNOWN`: percentual indisponível ou valor SNMP sem interpretação segura.

O limite crítico deve ser menor que o limite de atenção. Limites específicos por insumo prevalecem sobre os padrões.

## 8. API

Todos os endpoints ficarão sob `/api/v1/print-fleet` e usarão o JWT existente.

### 8.1 Redes e descoberta

- `GET /networks` — listar redes sem expor credenciais;
- `POST /networks` — cadastrar rede;
- `PATCH /networks/{network_id}` — editar parâmetros ou substituir a credencial;
- `PATCH /networks/{network_id}/active` — ativar ou desativar;
- `POST /networks/{network_id}/discoveries` — solicitar uma execução;
- `GET /discoveries` — listar histórico;
- `GET /discoveries/{run_id}` — consultar progresso e resultado.

Não haverá exclusão física de rede que possua execuções ou impressoras. Ela deverá ser desativada.

### 8.2 Impressoras e insumos

- `GET /printers` — listar com filtros e resumo de insumos;
- `POST /printers` — cadastro manual;
- `GET /printers/{printer_id}` — detalhes;
- `PATCH /printers/{printer_id}` — editar dados administrativos;
- `POST /printers/{printer_id}/confirm` — confirmar e associar ao setor;
- `POST /printers/{printer_id}/ignore` — ignorar descoberta;
- `PATCH /printers/{printer_id}/monitoring` — ativar ou suspender monitoramento;
- `GET /printers/{printer_id}/supplies` — níveis atuais;
- `GET /printers/{printer_id}/supplies/{supply_id}/readings` — histórico no período permitido.

Listagens serão paginadas. Filtros e ordenação ocorrerão no backend para que a interface não dependa de carregar todo o parque.

## 9. Interface

O item `Parque de impressão` será adicionado à navegação do Duplica e abrirá uma feature frontend própria, seguindo o padrão feature-first atual.

### 9.1 Impressoras

A visão principal exibirá:

- nome;
- fabricante e modelo;
- IP;
- setor;
- comunicação e estado operacional;
- pior estado de insumo;
- última comunicação.

Haverá busca textual e filtros por setor, fabricante, comunicação, cadastro e alerta. A tela de detalhes mostrará identificação técnica, níveis atuais, histórico de um insumo e falhas recentes.

### 9.2 Descoberta

A tela mostrará execuções pendentes, em andamento e concluídas, com contadores de progresso. A área de pendências permitirá confirmar ou ignorar uma impressora. A confirmação exigirá nome e setor da sede.

### 9.3 Redes

A tela permitirá cadastrar CIDR, exclusões, parâmetros e credencial SNMP. A credencial salva nunca será exibida novamente. A ação `Iniciar descoberta` mostrará confirmação com quantidade estimada de endereços, especialmente para faixas grandes.

## 10. Permissões e auditoria

Serão acrescentadas ao catálogo configurável de permissões:

- `viewPrintFleet`: consultar redes sem segredos, parque, status e insumos;
- `managePrintFleet`: cadastrar redes, substituir credenciais, iniciar descoberta, cadastrar, confirmar, ignorar e editar impressoras.

`managePrintFleet` implicará acesso de leitura ao módulo no backend e no frontend. A API continuará sendo a autoridade; ocultar controles na interface não substituirá autorização de rota.

O log de auditoria existente registrará:

- criação e alteração de rede, sem CIDR oculto mas sempre sem credencial;
- ativação e desativação de rede;
- solicitação de descoberta;
- cadastro manual, confirmação, edição, ignorar e reabrir impressora;
- associação ou troca de setor;
- ativação e suspensão do monitoramento;
- alteração de limites de insumo.

Leituras SNMP automáticas não entrarão no log administrativo; terão histórico operacional próprio.

## 11. Segurança e limites operacionais

- A comunidade SNMP será cifrada em repouso e redigida de logs e respostas.
- O worker somente consultará endereços resultantes de redes ativas cadastradas.
- Redirecionamentos, hostnames fornecidos pelos equipamentos e URLs de EWS não serão seguidos pelo worker.
- O SNMP será somente leitura; a aplicação não implementará `SET`.
- Execuções concorrentes na mesma rede serão recusadas com conflito HTTP.
- O tamanho estimado da varredura será mostrado antes da confirmação.
- Timeouts, concorrência e exclusões serão aplicados no worker, independentemente dos valores enviados pelo cliente.
- Mensagens persistidas e mostradas ao usuário não conterão comunidades, stack traces ou respostas binárias completas.
- O Compose não publicará portas adicionais para o worker; ele precisa apenas acessar PostgreSQL e UDP 161 na rede da sede.
- A implantação deverá validar regras de firewall entre o host do Duplica e as impressoras.

SNMP v2c não fornece confidencialidade nem autenticação forte. Seu uso nesta fase é uma decisão de compatibilidade com o parque. A migração para SNMP v3 deve ser priorizada onde os equipamentos suportarem.

## 12. Tratamento de falhas

- Falha em um endereço não interrompe a descoberta.
- Falha total antes do primeiro lote marca a execução como `FAILED`.
- Conclusão com falhas pontuais marca `COMPLETED_WITH_ERRORS`.
- Falta de heartbeat permite retomada pelo mesmo ou por outro processo worker.
- Upserts de impressoras e insumos tornam a repetição segura.
- Conflitos de identidade não são resolvidos automaticamente.
- Falha de decifragem de credencial impede a execução e gera erro sanitizado.
- Falha de banco interrompe o lote atual; o progresso confirmado anteriormente permanece válido.
- Uma única falha de polling não altera a impressora para sem comunicação.
- Dados anteriores permanecem visíveis quando uma impressora está indisponível, acompanhados da data da última leitura válida.

## 13. Implantação

O mesmo artefato Docker terá dois comandos:

- aplicação web/API, como hoje;
- worker de parque de impressão.

O `docker-compose.yml` incluirá um serviço `print_fleet_worker`, sem porta publicada, dependente do PostgreSQL saudável. Configurações operacionais serão fornecidas por ambiente, incluindo a chave de cifra e o intervalo padrão de polling.

Antes da primeira descoberta real:

1. confirmar com a infraestrutura o CIDR efetivo da sede;
2. confirmar que o host do Duplica possui rota até a faixa;
3. liberar UDP 161 somente entre o host e os equipamentos;
4. validar a comunidade somente leitura;
5. executar primeiro em uma sub-rede pequena ou conjunto controlado;
6. comparar os equipamentos encontrados com o inventário físico;
7. somente depois autorizar a faixa completa.

## 14. Estratégia de testes

### 14.1 Backend unitário

- normalização e validação de CIDR e exclusões;
- geração de hosts em lotes;
- classificação de dispositivo como impressora;
- interpretação de índices e bit strings;
- normalização de fabricantes, modelos, tipos e cores;
- cálculo seguro de percentual;
- classificação de alertas;
- deduplicação e conflitos de identidade;
- transições de execução e retomada;
- três falhas consecutivas e recuperação de comunicação;
- cifra, decifra e redação da comunidade.

### 14.2 Backend integrado

- migrations e restrições do PostgreSQL;
- claim concorrente com `SKIP LOCKED`;
- idempotência ao repetir lotes;
- isolamento de execuções por rede;
- permissões de todos os endpoints;
- auditoria sem vazamento de segredo;
- paginação e filtros.

O transporte SNMP será abstraído por uma interface e substituído por respostas determinísticas nos testes. A suíte automatizada não dependerá de equipamentos ou rede reais.

### 14.3 Frontend

- schemas de rede, exclusão, impressora e limites;
- repositórios HTTP e mapeamento snake_case/camelCase;
- estados vazio, carregando, erro, sem comunicação e nível desconhecido;
- filtros e paginação;
- confirmação de impressora com setor obrigatório;
- controles ocultos ou desabilitados conforme permissão;
- acessibilidade dos formulários, tabelas, estados e indicadores de nível.

### 14.4 Ponta a ponta

Um cenário Playwright usará um modo de transporte SNMP simulado no backend para validar:

1. autenticação administrativa;
2. cadastro de uma rede;
3. solicitação e conclusão de descoberta;
4. exibição de uma impressora pendente;
5. confirmação e associação a um setor;
6. exibição de insumos e alertas;
7. bloqueio das mutações para perfil sem `managePrintFleet`.

O teste manual de homologação validará ao menos uma HP e uma Epson reais, incluindo um equipamento com mais de um insumo.

## 15. Fases de entrega

### Fase 1 — Fundação do domínio

- migrations, modelos, schemas e permissões;
- cadastro de redes com credencial cifrada;
- cadastro manual de impressoras e associação ao setor;
- estrutura do worker e fila persistente.

### Fase 2 — Descoberta

- transporte SNMP v2c;
- geração segura de alvos e execução em lotes;
- identificação de impressoras;
- deduplicação, pendências e histórico de execução;
- telas de redes e descoberta.

### Fase 3 — Insumos e monitoramento

- polling periódico;
- Printer-MIB e normalização de insumos;
- histórico, alertas e estado sem comunicação;
- lista e detalhe do parque.

### Fase 4 — Homologação da sede

- validação de firewall e rota;
- execução controlada em faixa reduzida;
- homologação com HP e Epson;
- ajuste dos adaptadores de fabricante;
- autorização gradual da rede completa.

Cada fase termina com migrations aplicáveis e reversíveis, testes automatizados correspondentes, build do frontend e documentação operacional atualizada.

## 16. Critérios de aceite

O incremento será aceito quando:

- um administrador puder cadastrar uma rede válida sem que a comunidade seja recuperável pela API ou apareça em logs;
- uma descoberta puder ser solicitada sem bloquear a API;
- o worker percorrer a rede em lotes e apresentar progresso persistente;
- somente dispositivos validados como impressoras entrarem na fila de pendências;
- repetir uma descoberta não duplicar impressoras ou insumos;
- uma impressora pendente puder ser confirmada somente com um setor ativo da sede;
- uma impressora também puder ser cadastrada manualmente;
- impressoras confirmadas forem consultadas a cada 15 minutos por padrão;
- níveis desconhecidos não forem apresentados como zero;
- alertas de 20% e 10% forem calculados corretamente;
- três falhas consecutivas produzirem `NO_COMMUNICATION` e uma resposta posterior recuperar o estado;
- perfis sem `managePrintFleet` não puderem mutar o parque pela API;
- alterações administrativas aparecerem na auditoria sem segredos;
- testes unitários, integrados, frontend, build e E2E passarem;
- uma HP e uma Epson reais forem homologadas em uma faixa controlada antes da varredura completa.

## 17. Evoluções posteriores

As seguintes extensões deverão ser tratadas em especificações próprias:

- SNMP v3 e migração de credenciais por equipamento;
- recebimento de traps;
- notificações e fluxo de reposição de insumos;
- estimativa de consumo e previsão de término;
- contadores de páginas e conciliação com bilhetagem;
- servidor IPP/SMB, Web Print, cotas e roteamento de trabalhos.
