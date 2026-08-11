import { type ClassValue, clsx } from "clsx";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Onde portar conteúdo dos primitivos Radix (Dialog/Select/DropdownMenu).
// Sem isso, o Portal do Radix renderiza em document.body por padrão — fora
// da div#theme-root que define as CSS custom properties de cor (--surface,
// --text, --muted etc.) — e o conteúdo portado perde todo o tema (fundo e
// texto ficam "unset", herdando o que estiver visualmente atrás).
//
// Resolvido em useEffect (não durante o render) de propósito: o Portal do
// próprio Radix segue esse mesmo padrão ("undefined no primeiro render, valor
// real depois de montar") pra coordenar corretamente com o hideOthers()
// interno (lib aria-hidden) — resolver o container sincronamente durante o
// render causa uma corrida ali em ambiente de teste (jsdom).
export function usePortalContainer(): HTMLElement | undefined {
  const [container, setContainer] = useState<HTMLElement | undefined>(undefined);
  useEffect(() => {
    setContainer(document.getElementById("theme-root") ?? undefined);
  }, []);
  return container;
}
