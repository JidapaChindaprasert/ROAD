"use client";

import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import { RepositoryProvider } from "@/lib/repositories/repository-provider";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className: "rounded-2xl font-sans text-sm border-border bg-surface text-text-primary shadow-lg",
          }}
          richColors
          closeButton
        />
      </RepositoryProvider>
    </QueryClientProvider>
  );
}
