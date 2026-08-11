import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./AppShell";
import { QueryProvider } from "./providers/QueryProvider";
import "./styles/styles.css";
import "./styles/tailwind.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <AppShell />
    </QueryProvider>
  </StrictMode>,
);
