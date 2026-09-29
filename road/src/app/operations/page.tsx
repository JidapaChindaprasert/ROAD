import { ReportQueue } from "@/features/operations/report-queue";
import { PageContainer } from "@/components/layout/page-container";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Operations Console — ROAD",
  description: "Municipal staff road damage management console for incident triage and repair scheduling.",
};

export default function OperationsPage() {
  return (
    <PageContainer size="lg">
      <ReportQueue />
    </PageContainer>
  );
}
