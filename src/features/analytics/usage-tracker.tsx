"use client";

import { useEffect, useRef } from "react";

type PublicUsageEvent = "landing_view" | "invoice_viewed" | "receipt_viewed";

export function UsageTracker({
  event,
  publicId,
}: {
  event: PublicUsageEvent;
  publicId?: string;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void fetch("/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, publicId }),
      keepalive: true,
    }).catch(() => undefined);
  }, [event, publicId]);
  return null;
}

export function recordPublicShare(
  publicId: string,
  channel: "native_share" | "clipboard",
) {
  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event: "invoice_shared", publicId, channel }),
    keepalive: true,
  }).catch(() => undefined);
}
