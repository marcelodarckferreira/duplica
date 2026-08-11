/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/shell/LoginView.tsx",
    "./src/shell/ui/**/*.{ts,tsx}",
    "./src/shell/Logo.tsx",
    "./src/shell/BackgroundChart.tsx",
    "./src/shell/AppShell.tsx",
    "./src/shell/Sidebar.tsx",
    "./src/shell/AccountModals.tsx",
    "./src/domains/requests/RequestsView.tsx",
  ],
  // Preflight fica desligado de propósito: o restante das telas (dashboard,
  // solicitações, unidades, usuários, relatórios) continua em src/styles.css
  // (CSS global); um reset do Tailwind vazaria pra lá. Login + sidebar/menu de
  // conta do AppShell são o escopo formal do Tailwind (ver docs/SPEC.md §2.2).
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
