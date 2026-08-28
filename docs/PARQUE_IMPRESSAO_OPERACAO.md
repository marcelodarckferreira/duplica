# Parque de impressão da sede — implantação e operação

Este módulo descobre impressoras por SNMP v2c, cadastra cada equipamento por setor da sede e acompanha toner, tinta, cilindro, coletor e kits informados pela Printer-MIB. Ele não envia trabalhos de impressão nem atende unidades fora da sede.

## Preparação

1. Gere um segredo exclusivo: `openssl rand -base64 48`.
2. Preencha `SNMP_CREDENTIAL_ENCRYPTION_KEY` no `.env`. Não altere essa chave depois de cadastrar redes; sem ela, as comunidades armazenadas não podem ser abertas pelo worker.
3. Mantenha `PRINT_FLEET_SNMP_TRANSPORT=pysnmp` em produção.
4. Aplique a migration 15 (`f2a8c4e1d9b7`) com `scripts/db_update.sh`.
5. Reconstrua e suba `app`, `postgres` e `print_fleet_worker` pelo fluxo normal de produção.
6. Confirme que o host do worker alcança as impressoras em UDP/161 e que firewall/ACL permite somente a origem necessária.

O serviço `print_fleet_worker` não publica porta. Ele consome a fila durável do PostgreSQL, executa descobertas e consulta os insumos no intervalo padrão de 15 minutos.

## Primeiro cadastro da rede

No menu **Parque de impressão → Redes**, cadastre:

- nome descritivo, por exemplo “Rede da sede”;
- CIDR `172.15.0.0/16`;
- sub-redes e endereços que não devem ser consultados;
- comunidade SNMP v2c;
- timeout, tentativas e concorrência.

O endereço `172.15.0.0/16` não pertence aos blocos privados RFC 1918. O Duplica aceita o valor informado porque ele representa a rede local declarada pelo operador, mas exibe um alerta. A equipe de rede deve confirmar o roteamento interno e impedir que a varredura saia da infraestrutura da sede.

Um `/16` pode conter 65.534 hosts utilizáveis. Faça a primeira execução de forma controlada:

1. comece por um CIDR menor de um setor ou defina exclusões amplas;
2. confirme consumo de CPU, banco e tráfego SNMP;
3. valide uma impressora HP e uma Epson reais;
4. amplie gradualmente até o escopo autorizado;
5. somente então execute o `/16` integral.

## Cadastro e localização

Equipamentos descobertos entram como **Pendentes**, sem monitoramento. Um administrador revisa o nome e seleciona um local ativo com origem `SEDE`; cada local representa um setor. Só depois da confirmação o monitoramento pode ser ativado. Equipamentos que não pertencem ao parque podem ser ignorados e reabertos posteriormente.

O cadastro manual exige rede, IP, nome e setor e deve ser usado apenas quando a impressora não responde à descoberta.

## Insumos e alertas

- Normal: acima do limite de atenção.
- Atenção: por padrão, 20% ou menos.
- Crítico: por padrão, 10% ou menos.
- Sem leitura: a Printer-MIB não forneceu um percentual seguro.

As leituras guardam histórico quando o nível/status muda ou ao menos uma vez por dia. Falhas consecutivas preservam a última leitura e identificam a perda de comunicação. Eventos operacionais são retidos por 90 dias e históricos de insumos por 365 dias.

## Segurança e solução de problemas

SNMP v2c não criptografa o tráfego. Use uma comunidade exclusiva e somente leitura, restrinja UDP/161 por ACL/VLAN e nunca registre a comunidade em logs, documentação ou chamados. O Duplica armazena o valor cifrado e a API devolve apenas `credential_configured`.

- **Rede não salva:** confirme `SNMP_CREDENTIAL_ENCRYPTION_KEY` no app e reinicie os serviços.
- **Descoberta fica na fila:** verifique `docker compose logs print_fleet_worker` e a conexão com PostgreSQL.
- **Nenhuma impressora encontrada:** valide comunidade, UDP/161, ACL e suporte a HOST-RESOURCES-MIB/Printer-MIB.
- **Insumos indisponíveis:** confirme que o fabricante expõe `prtMarkerSupplies`; alguns modelos retornam valores especiais sem percentual.
- **Sem comunicação:** teste o IP a partir do host do worker e confira se o equipamento mudou de endereço.

O transporte `simulated` existe exclusivamente no banco descartável do E2E. Nunca o habilite em produção.
