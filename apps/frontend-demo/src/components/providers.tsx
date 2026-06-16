"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@techsio/ui-kit/molecules/toast"
import { AppThemeProvider } from "@techsio/ui-kit/theme/theme-provider"
import type { PropsWithChildren } from "react"
import { useState } from "react"
import { CartPrefetch } from "./cart-prefetch"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors
          if (error?.status >= 400 && error?.status < 500) {
            return false
          }
          // Retry up to 3 times for other errors
          return failureCount < 3
        },
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30_000),
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient()
  }
  // Browser: make client if we don't already have one
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}

export function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => getQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider defaultMode="system">
        <CartPrefetch />
        {children}
        <Toaster />
      </AppThemeProvider>
    </QueryClientProvider>
  )
}
