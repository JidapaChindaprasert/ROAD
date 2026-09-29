"use client";

import * as React from "react";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

export interface RealtimeEventPayload {
  type: "REPORT_CREATED" | "REPORT_UPDATED" | "STATUS_TRANSITIONED";
  reportId: string;
  publicId?: string;
  status?: string;
  timestamp: string;
}

const DEMO_CHANNEL_NAME = "road_realtime_broadcast";

/**
 * Hook providing live update subscriptions across multiple browser sessions/tabs.
 * In Demo Mode: Uses BroadcastChannel & storage events for multi-tab synchronization.
 * In Production Mode: Uses Supabase Realtime WebSocket channels with reconnection logic.
 */
export function useRealtimeSubscription(options: {
  channelName?: string;
  onEvent?: (payload: RealtimeEventPayload) => void;
  enabled?: boolean;
}) {
  const { channelName = "public:reports", onEvent, enabled = true } = options;
  const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus>("connected");
  const onEventRef = React.useRef(onEvent);

  React.useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  React.useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    if (isDemoMode) {
      // Demo Mode: Multi-tab Realtime using BroadcastChannel
      let broadcastChannel: BroadcastChannel | null = null;
      try {
        broadcastChannel = new BroadcastChannel(DEMO_CHANNEL_NAME);
        broadcastChannel.onmessage = (event) => {
          if (event.data && onEventRef.current) {
            onEventRef.current(event.data);
          }
        };
      } catch {
        // BroadcastChannel unsupported in some legacy contexts
      }

      // Storage event listener fallback across windows
      const handleStorage = (e: StorageEvent) => {
        if (e.key === "road_demo_last_event" && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (onEventRef.current) {
              onEventRef.current(parsed);
            }
          } catch {
            // ignore JSON parse errors
          }
        }
      };

      window.addEventListener("storage", handleStorage);

      return () => {
        broadcastChannel?.close();
        window.removeEventListener("storage", handleStorage);
      };
    }

    // Production Mode: Supabase Realtime Channels
    let isSubscribed = true;
    try {
      const supabase = createClient();
      const channel = supabase.channel(channelName);

      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "public_report_features",
          },
          (payload) => {
            if (!isSubscribed) return;
            const newRecord = payload.new as Record<string, unknown> | null;
            if (onEventRef.current) {
              onEventRef.current({
                type: payload.eventType === "INSERT" ? "REPORT_CREATED" : "REPORT_UPDATED",
                reportId: String(newRecord?.report_id || ""),
                publicId: typeof newRecord?.public_id === "string" ? newRecord.public_id : undefined,
                status: typeof newRecord?.public_status === "string" ? newRecord.public_status : undefined,
                timestamp: new Date().toISOString(),
              });
            }
          }
        )
        .subscribe((status) => {
          if (!isSubscribed) return;
          if (status === "SUBSCRIBED") {
            setConnectionStatus("connected");
          } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
            setConnectionStatus("reconnecting");
          } else if (status === "CLOSED") {
            setConnectionStatus("disconnected");
          }
        });

      // Handle window online / offline events
      const handleOnline = () => setConnectionStatus("connected");
      const handleOffline = () => setConnectionStatus("disconnected");
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        isSubscribed = false;
        supabase.removeChannel(channel);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    } catch {
      setTimeout(() => {
        setConnectionStatus("disconnected");
      }, 0);
    }
  }, [channelName, enabled]);

  return { connectionStatus };
}

/**
 * Broadcast an event to other active browser sessions (used in Demo Mode)
 */
export function broadcastDemoRealtimeEvent(payload: RealtimeEventPayload) {
  if (typeof window === "undefined") return;
  try {
    const channel = new BroadcastChannel(DEMO_CHANNEL_NAME);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // Ignore error if BroadcastChannel is unavailable
  }

  try {
    localStorage.setItem("road_demo_last_event", JSON.stringify(payload));
  } catch {
    // Ignore storage quota
  }
}
