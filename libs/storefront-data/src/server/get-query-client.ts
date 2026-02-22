import { cache } from "react"
import { makeQueryClient } from "../shared/query-client"

const ensureServerEnvironment = () => {
  const isVitest =
    typeof process !== "undefined" &&
    (process.env.VITEST === "true" || process.env.NODE_ENV === "test")

  if (typeof window !== "undefined" && !isVitest) {
    throw new Error(
      "[storefront-data] server/get-query-client must not be imported in client code."
    )
  }
}

ensureServerEnvironment()

/**
 * Get a per-request QueryClient for Server Components.
 *
 * Uses React's cache() to ensure the same QueryClient instance
 * is returned throughout a single server request. This allows
 * multiple server components to share prefetched data.
 *
 * @example
 * ```tsx
 * // app/products/layout.tsx (Server Component)
 * import { getServerQueryClient } from "@techsio/storefront-data/server/get-query-client"
 *
 * export default async function Layout({ children }) {
 *   const queryClient = getServerQueryClient()
 *   await queryClient.prefetchQuery(...)
 *
 *   return (
 *     <HydrationBoundary state={dehydrate(queryClient)}>
 *       {children}
 *     </HydrationBoundary>
 *   )
 * }
 * ```
 */
export const getServerQueryClient = cache(() => makeQueryClient())
