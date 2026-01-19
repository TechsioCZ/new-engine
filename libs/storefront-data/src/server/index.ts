export { dehydrate, HydrationBoundary } from "@tanstack/react-query"
export type { DehydratedState, QueryClient } from "@tanstack/react-query"
export { createQueryClientConfig, getQueryClient, makeQueryClient } from "../shared/query-client"
export type { QueryClientConfig } from "../shared/query-client"

// Server-specific: per-request QueryClient with React.cache()
export { getServerQueryClient } from "./get-query-client"
