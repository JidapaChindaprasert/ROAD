import { CommunityMap } from "@/features/map/components/community-map";
import { PageContainer } from "@/components/layout/page-container";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Map — ROAD",
  description: "Live interactive community road damage map with verified status filters and repair progress tracking.",
};

export default function MapPage() {
  return (
    <PageContainer size="full" className="max-w-[1500px]">
      <div className="mb-5">
        <div className="text-xs font-bold uppercase tracking-wider text-brand mb-1">
          Incident Directory
        </div>
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
          Community Damage Map
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Explore potholes, road cracks, and infrastructure repairs reported by residents across the Bangkok metropolitan area.
        </p>
      </div>

      <CommunityMap />
    </PageContainer>
  );
}
