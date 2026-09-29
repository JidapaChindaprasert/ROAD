"use client";

import * as React from "react";
import { ErrorState } from "@/components/ui/error-state";
import { PageContainer } from "@/components/layout/page-container";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Application Error Boundary caught:", error);
  }, [error]);

  return (
    <PageContainer size="sm" className="py-16 flex items-center justify-center">
      <ErrorState
        title="We encountered an issue"
        message={error.message || "An unexpected error occurred while loading this page."}
        onRetry={() => reset()}
        className="w-full max-w-md shadow-sm"
      />
    </PageContainer>
  );
}
