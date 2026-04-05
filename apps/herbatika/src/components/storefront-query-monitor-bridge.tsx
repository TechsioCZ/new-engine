"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  installStorefrontMonitor,
  isStorefrontMonitorEnabled,
} from "@/lib/storefront/query-monitor";

export function StorefrontQueryMonitorBridge() {
  const queryClient = useQueryClient();
  const isMonitorEnabled = isStorefrontMonitorEnabled();

  useEffect(() => {
    if (!isMonitorEnabled) {
      return;
    }

    installStorefrontMonitor(queryClient);
  }, [isMonitorEnabled, queryClient]);

  return null;
}
