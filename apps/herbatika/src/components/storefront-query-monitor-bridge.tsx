"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { installStorefrontMonitor } from "@/lib/storefront/query-monitor";

export function StorefrontQueryMonitorBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    installStorefrontMonitor(queryClient);
  }, [queryClient]);

  return null;
}
