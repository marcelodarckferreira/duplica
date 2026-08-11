/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  // Preflight fica desligado de propósito: a app nunca adotou o reset do
  // Tailwind (margens/tipografia padrão do navegador continuam valendo em
  // todo lugar, e cada tela já foi construída/verificada visualmente nesse
  // pressuposto). Ligar precisaria de uma auditoria visual completa à parte.
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        page: "var(--page-bg)",
        surface: "var(--surface)",
        "surface-soft": "var(--surface-soft)",
        border: "var(--border)",
        text: "var(--text)",
        muted: "var(--muted)",
        label: "var(--label)",
        accent: "var(--accent)",
        "accent-strong": "var(--accent-strong)",
        sidebar: "var(--sidebar)",
        "sidebar-text": "var(--sidebar-text)",
        "sidebar-muted": "var(--sidebar-muted)",
        "surface-hover": "var(--surface-hover)",
        "border-soft": "var(--border-soft)",
        "status-recebido-fg": "var(--status-recebido-fg)",
        "status-recebido-bg": "var(--status-recebido-bg)",
        "status-em-producao-fg": "var(--status-em-producao-fg)",
        "status-em-producao-bg": "var(--status-em-producao-bg)",
        "status-pronto-fg": "var(--status-pronto-fg)",
        "status-pronto-bg": "var(--status-pronto-bg)",
        "status-entregue-fg": "var(--status-entregue-fg)",
        "status-entregue-bg": "var(--status-entregue-bg)",
        "status-cancelado-fg": "var(--status-cancelado-fg)",
        "status-cancelado-bg": "var(--status-cancelado-bg)",
      },
      borderRadius: {
        DEFAULT: "7px",
      },
      keyframes: {
        "bar-grow": {
          "0%, 100%": { transform: "scaleY(0.45)" },
          "50%": { transform: "scaleY(1)" },
        },
        "line-draw": {
          to: { strokeDashoffset: "0" },
        },
        "float-dot": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
      },
      animation: {
        "bar-grow": "bar-grow 3.6s ease-in-out infinite",
        "line-draw": "line-draw 4s ease-in-out infinite alternate",
        "float-dot": "float-dot 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
