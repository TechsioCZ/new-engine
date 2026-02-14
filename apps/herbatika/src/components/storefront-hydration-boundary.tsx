"use client";

import type { DehydratedState } from "@tanstack/react-query";
import { HydrationBoundary } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

type StorefrontHydrationBoundaryProps = PropsWithChildren<{
  state: DehydratedState;
}>;

export function StorefrontHydrationBoundary({
  children,
  state,
}: StorefrontHydrationBoundaryProps) {
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
