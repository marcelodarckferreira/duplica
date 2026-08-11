import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A API é pequena e local — sem necessidade de refetch agressivo em
      // foco/reconexão; mutações já chamam invalidateQueries explicitamente.
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function QueryProvider(props: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>;
}
