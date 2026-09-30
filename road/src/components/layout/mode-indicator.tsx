"use client";

import * as React from "react";
import { isDemoMode } from "@/lib/env";
import { Database, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ModeIndicatorProps {
  onResetDemo?: () => void;
  className?: string;
}

export function ModeIndicator({ onResetDemo, className }: ModeIndicatorProps) {
  const [isResetting, setIsResetting] = React.useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      if (onResetDemo) {
        onResetDemo();
      } else if (typeof window !== "undefined") {
        localStorage.removeItem("road_demo_reports_v1");
        window.location.reload();
      }
      toast.success("Demo dataset reset to initial state");
    } catch {
      toast.error("Failed to reset demo data");
    } finally {
      setIsResetting(false);
    }
  };

  if (!isDemoMode) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium shadow-2xs whitespace-nowrap",
        className
      )}
    >
      <div className="flex items-center gap-1">
        <Database className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        <span>Demo Data</span>
      </div>
      <span className="text-amber-300">|</span>
      <button
        type="button"
        onClick={handleReset}
        disabled={isResetting}
        className="text-amber-700 hover:text-amber-950 flex items-center gap-1 underline-offset-2 hover:underline disabled:opacity-50"
        title="Reset demo reports back to initial Bangkok fixtures"
      >
        <RotateCcw className={`h-3 w-3 ${isResetting ? "animate-spin" : ""}`} />
        <span>Reset</span>
      </button>
    </div>
  );
}
