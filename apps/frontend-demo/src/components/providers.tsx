"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@techsio/ui-kit/molecules/toast"
import { AppThemeProvider } from "@techsio/ui-kit/theme/theme-provider"
import type { PropsWithChildren } from "react"

import { CartPrefetch } from "./cart-prefetch"

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      mutations: {
        retry: 1,
        retryDelay: 1000,
      },
      queries: {
        // Five minutes
        gcTime: 5 * 60 * 1000,
        retry: (failureCount, error: unknown) => {
          const status =
            typeof error === "object" && error !== null && "status" in error
              ? error.status
              : undefined
          // Don't retry on 4xx errors
          if (typeof status === "number" && status >= 400 && status < 500) {
            return false
          }
          // Retry up to 3 times for other errors
          return failureCount < 3
        },
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30_000),
        // One minute
        staleTime: 60 * 1000,
      },
    },
  })

let browserQueryClient: QueryClient | undefined

const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient()
  }
  // Browser: make client if we don't already have one
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

export const Providers = ({ children }: PropsWithChildren) => {
  const queryClient = getQueryClient()

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
