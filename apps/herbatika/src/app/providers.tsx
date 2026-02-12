"use client";

import { StorefrontDataProvider } from "@techsio/storefront-data/client";
import { RegionProvider } from "@techsio/storefront-data/shared";
import type { PropsWithChildren } from "react";
import { useRegionBootstrap } from "@/lib/storefront/regions";

function RegionBootstrapProvider({ children }: PropsWithChildren) {
  const { region } = useRegionBootstrap();

  return <RegionProvider region={region}>{children}</RegionProvider>;
}

export function Providers({ children }: PropsWithChildren) {
  return (
    <StorefrontDataProvider>
      <RegionBootstrapProvider>{children}</RegionBootstrapProvider>
    </StorefrontDataProvider>
  );
}
