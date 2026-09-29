import { ReportWizard } from "@/features/reports/components/report-wizard";
import { PageContainer } from "@/components/layout/page-container";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report Road Damage — ROAD",
  description: "Report road damage with automatic AI classification and GPS location capture in under a minute.",
};

export default function NewReportPage() {
  return (
    <PageContainer size="md">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
          Report Road Damage
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Spot it. Report it. Follow the fix. Help keep Bangkok and local roads safe.
        </p>
      </div>

      <ReportWizard />
    </PageContainer>
  );
}
