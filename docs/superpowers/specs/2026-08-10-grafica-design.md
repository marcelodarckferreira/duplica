# Gráfica MVP Design

## Objetivo
Criar o site web `grafica`, chamado Gráfica, para controle de cópias da SEMED com autenticação demonstrativa, dashboard, solicitações, unidades/setores, filtros, histórico, ranking e consolidação mensal.

## Arquitetura
Aplicação React/TypeScript responsiva. O MVP usa persistência local no navegador, mas toda leitura/escrita passa por um repositório de dados em `src/services`, preparado para substituição por API ASP.NET Core futuramente. Regras de negócio ficam em funções puras testáveis.

## Perfis
Administrador gerencia usuários de demonstração, unidades e solicitações. Operador registra solicitações e atualiza produção/entrega. Consulta apenas visualiza painéis e listas.

## Telas
Login, dashboard, solicitações, unidades/setores e relatórios consolidados dentro de um layout institucional pt-BR.

## Dados e cálculos
Solicitações usam código `CP-2026-0001`, origem Escola ou Sede SEMED, unidade/setor, solicitante, contato, documento, páginas, jogos, frente e verso, faces impressas, folhas consumidas, papel, cor, prioridade, prazo, status, responsável, datas, retirada, observações e histórico de status.

Faces impressas = páginas x jogos. Folhas consumidas = páginas x jogos para simplex, ou teto(páginas / 2) x jogos para frente e verso.
