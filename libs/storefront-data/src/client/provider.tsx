"use client"

import type { PropsWithChildren } from "react"
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import { getQueryClient, type QueryClientConfig } from "../shared/query-client"

export type StorefrontDataProviderProps = PropsWithChildren<{
  client?: QueryClient
  /**
   * Applied only when creating the internal singleton QueryClient for the first time.
   * Later renders will reuse the existing singleton.
   */
  clientConfig?: QueryClientConfig
}>

export function StorefrontDataProvider({
  children,
  client,
  clientConfig,
}: StorefrontDataProviderProps) {
  const queryClient = client ?? getQueryClient(clientConfig)
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
