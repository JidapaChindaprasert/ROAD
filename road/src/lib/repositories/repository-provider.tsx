"use client";

import * as React from "react";
import { IReportRepository } from "./report-repository";
import { demoReportRepository } from "./demo-report-repository";
import { SupabaseReportRepository } from "./supabase-report-repository";
import { isProductionMode, env } from "../env";

const RepositoryContext = React.createContext<IReportRepository>(demoReportRepository);

export function RepositoryProvider({
  children,
  customRepository,
}: {
  children: React.ReactNode;
  customRepository?: IReportRepository;
}) {
  const repository = React.useMemo(() => {
    if (customRepository) return customRepository;

    if (isProductionMode) {
      if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
        throw new Error(
          "ROAD Production Mode Error: NEXT_PUBLIC_APP_MODE is set to 'production' but NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured in .env.local. Please configure Supabase or set NEXT_PUBLIC_APP_MODE=demo."
        );
      }
      return new SupabaseReportRepository();
    }

    return demoReportRepository;
  }, [customRepository]);

  return (
    <RepositoryContext.Provider value={repository}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function useReportRepository(): IReportRepository {
  const context = React.useContext(RepositoryContext);
  if (!context) {
    throw new Error("useReportRepository must be used within a RepositoryProvider");
  }
  return context;
}
