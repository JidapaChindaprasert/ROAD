"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useReportRepository } from "@/lib/repositories/repository-provider";
import { ReportDetail } from "@/features/reports/types";
import { ReportDetailView } from "@/features/reports/components/report-detail-view";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { MapPinOff } from "lucide-react";

export default function ReportDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const repository = useReportRepository();

  const [report, setReport] = React.useState<ReportDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    if (id) {
      repository
        .getPublicReport(id)
        .then((data) => {
          if (isMounted) setReport(data);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [id, repository]);

  if (isLoading) {
    return (
      <PageContainer size="md">
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </PageContainer>
    );
  }

  if (!report) {
    return (
      <PageContainer size="sm" className="py-16">
        <EmptyState
          icon={MapPinOff}
          title="Report Not Found"
          description={`No road damage incident with ID "${id}" could be found.`}
          actionLabel="Explore Community Map"
          onAction={() => (window.location.href = "/map")}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer size="md">
      <ReportDetailView initialReport={report} />
    </PageContainer>
  );
}
