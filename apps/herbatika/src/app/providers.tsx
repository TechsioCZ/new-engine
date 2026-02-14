"use client";

import { StorefrontDataProvider } from "@techsio/storefront-data/client";
import { RegionProvider, type RegionInfo } from "@techsio/storefront-data/shared";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { PropsWithChildren } from "react";
import { StorefrontQueryMonitorBridge } from "@/components/storefront-query-monitor-bridge";
import { useRegionBootstrap } from "@/lib/storefront/regions";

type RegionBootstrapProviderProps = PropsWithChildren<{
  initialRegion?: RegionInfo | null;
}>;

function RegionBootstrapProvider({
  children,
  initialRegion = null,
}: RegionBootstrapProviderProps) {
  const { region } = useRegionBootstrap({ initialRegion });

  return <RegionProvider region={region}>{children}</RegionProvider>;
}

type ProvidersProps = PropsWithChildren<{
  initialRegion?: RegionInfo | null;
}>;

export function Providers({ children, initialRegion = null }: ProvidersProps) {
  return (
    <StorefrontDataProvider>
      <StorefrontQueryMonitorBridge />
      <NuqsAdapter>
        <RegionBootstrapProvider initialRegion={initialRegion}>
          {children}
        </RegionBootstrapProvider>
      </NuqsAdapter>
    </StorefrontDataProvider>
  );
}
