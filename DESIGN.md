---
version: alpha
name: "Duplica"
description: "Ferramenta institucional de controle de impressão com leitura rápida, alta densidade e identidade verde-petróleo."
colors:
  page: "#DCE4DD"
  surface: "#FFFFFF"
  surface-soft: "#D8E5DD"
  border: "#91A898"
  text: "#0D1512"
  muted: "#3A4B43"
  accent: "#115C4D"
  accent-strong: "#0D463B"
  sidebar: "#0F2E35"
  danger: "#9B3D35"
typography:
  sans:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace"
rounded:
  DEFAULT: "7px"
  lg: "8px"
omitted:
  - section: spacing
    reason: "O projeto usa a escala padrão do Tailwind CSS 3 sem aliases próprios."
components:
  button: {}
  card: {}
  dialog: {}
  input: {}
  sidebar: {}
---

# Duplica Design System

## Overview

### Creative North Star

Uma mesa de protocolo de gráfica institucional: etiquetas claras, registros compactos e superfícies resistentes, com o verde-petróleo funcionando como tinta de identificação. A interface deve parecer um instrumento cotidiano de trabalho, não uma landing page nem um painel genérico de métricas.

### Product context and register

- **Audience and primary job:** equipes administrativas que registram, produzem e entregam solicitações de impressão.
- **Target market and evidence:** operação institucional brasileira; interface e documentação do produto usam português do Brasil.
- **Locale and language policy:** `pt-BR`, com texto direto e vocabulário consistente entre ações e resultados.
- **Usage scene:** uso frequente em desktop, com informação densa e ações que precisam permanecer legíveis em telas menores.
- **Register:** produto administrativo.
- **Memorable signature:** o verde-petróleo identifica navegação e ações; dados operacionais são apresentados como registros de produção.
- **Restraint:** formulários, tabelas, diálogos e estados de erro priorizam familiaridade, contraste e previsibilidade.
- **Anti-references:** evitar cartões decorativos de SaaS, gradientes promocionais, vidro translúcido e animação ornamental.
- **Token ownership/runtime mapping:** modelo B. Os tokens canônicos de execução vivem em `src/app/styles/styles.css`, são adaptados em `tailwind.config.js` e este arquivo espelha seus valores aceitos.

## Colors

O fundo esverdeado separa a área de trabalho das superfícies brancas. `accent` e `accent-strong` representam foco, seleção e ação segura; `danger` é reservado a consequências destrutivas. O tema escuro remapeia os mesmos papéis sem mudar a hierarquia semântica, conforme `src/app/styles/styles.css`.

## Typography

Inter e seus fallbacks de sistema são usados em toda a interface. Títulos e rótulos usam peso para hierarquia; valores técnicos curtos, como revisões de versão, podem usar a pilha monoespaçada para preservar distinção de caracteres.

## Layout

A sidebar persistente organiza as áreas de trabalho; o conteúdo usa superfícies compactas e responsivas. Espaçamento segue a escala do Tailwind existente. Conteúdo assíncrono reserva espaço suficiente para não mover controles durante carregamento ou erro.

## Elevation & Depth

Hierarquia vem primeiro de contraste tonal e bordas. Sombras fortes são restritas a overlays e diálogos; conteúdo estático permanece visualmente assentado no plano da página.

## Shapes

Controles usam raio padrão de 7px e contêineres podem usar 8px. Pílulas ficam restritas a avatares, indicadores e badges cuja forma comunica identidade ou estado.

## Components

### Foundational visual states

Controles precisam de estados padrão, hover, foco visível, pressionado, desabilitado e ocupado. Erros aparecem em texto e não dependem só de cor. Carregamento usa indicador estável; skeletons não fazem parte do padrão atual.

### Buttons and actions

Uma ação principal segura usa `accent-strong`; ações secundárias usam superfície suave ou apresentação ghost. Ações perigosas usam `danger` e permanecem separadas das ações rotineiras.

### Navigation and data display

A sidebar e o menu de conta usam os componentes compartilhados. Tabelas preservam comparação entre colunas e listas menores podem usar cartões compactos quando os registros forem independentes.

### Forms and overlays

Campos usam borda, superfície e foco dos tokens globais. Overlays reutilizam os componentes Radix em `src/shared/ui`, com nome acessível, Escape, contenção e restauração de foco.

### Iconography

Lucide React é a família canônica, com traço padrão e tamanhos entre 15px e 18px em controles. Ícones não substituem rótulos quando a ação não é universalmente reconhecida.

### Motion

Transições comunicam mudança de estado e duram pouco. A interface respeita `prefers-reduced-motion`; rotinas de trabalho não recebem animação decorativa.

### Content and data visualization

Texto usa voz direta em português: o rótulo da ação e sua consequência compartilham o mesmo verbo. Números e datas seguem `pt-BR`; informações técnicas são identificadas como tal sem expor segredos ou configuração sensível.

## Do's and Don'ts

- **Do:** reutilizar tokens e primitivas compartilhadas antes de criar variações locais.
- **Do:** preservar densidade operacional, contraste e recuperação explícita de erros.
- **Don't:** transformar uma tela funcional em uma composição promocional ou ornamental.
- **Don't:** usar valores de cor, raio ou camada arbitrários quando já existe um papel semântico canônico.
