import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { EmptyState } from "@/components/ui/empty-state";
import { MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageContainer size="sm" className="py-20 flex flex-col items-center justify-center">
      <EmptyState
        icon={MapPinOff}
        title="Page Not Found"
        description="The report or page you are looking for does not exist, was merged, or has moved to a new address."
      />
      <div className="mt-6 flex items-center gap-3">
        <Link href="/">
          <Button variant="primary">Return to Dashboard</Button>
        </Link>
        <Link href="/map">
          <Button variant="outline">Explore Community Map</Button>
        </Link>
      </div>
    </PageContainer>
  );
}
