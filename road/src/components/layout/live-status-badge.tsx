"use client";

import * as React from "react";
import { ConnectionStatus } from "@/features/realtime/use-realtime";
import { Activity, Radio, AlertTriangle } from "lucide-react";

export function LiveStatusBadge({ status }: { status: ConnectionStatus }) {
  if (status === "connected") {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold"
        title="Live WebSocket stream active. Updates sync automatically."
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>Live Sync</span>
      </div>
    );
  }

  if (status === "reconnecting") {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold"
        title="Reconnecting to real-time service..."
      >
        <Radio className="h-3 w-3 animate-spin" />
        <span>Reconnecting...</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 text-[11px] font-bold"
      title="Real-time disconnected. Displaying cached data."
    >
      <AlertTriangle className="h-3 w-3" />
      <span>Offline</span>
    </div>
  );
}
