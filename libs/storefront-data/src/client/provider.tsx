"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"
import type { PropsWithChildren } from "react"

import { getQueryClient } from "../shared/query-client"
import type { QueryClientConfig } from "../shared/query-client"

export type StorefrontDataProviderProps = PropsWithChildren<{
  client?: QueryClient
  /**
   * Applied only when creating the internal singleton QueryClient for the first time.
   * Later renders will reuse the existing singleton.
   */
  clientConfig?: QueryClientConfig
}>

export const StorefrontDataProvider = ({
  children,
  client,
  clientConfig,
}: StorefrontDataProviderProps) => {
  const queryClient = client ?? getQueryClient(clientConfig)
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
