import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import type { Market } from "@/lib/url/types"

const PRIVATE_FLOW_TIMEOUT_MS = 5000

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

type PrivateFlowReaderDependencies = Readonly<{
  baseUrl: string
  fetch: FetchLike
  resolveMarket: (market: Market) => MarketRuntimeBinding | null
}>

export type PrivateCustomerSession = Readonly<{
  customerId: string
  token: string
}>

export type PrivateSessionResult =
  | Readonly<{ kind: "authenticated"; session: PrivateCustomerSession }>
  | Readonly<{ kind: "unauthenticated" }>
  | Readonly<{ kind: "unavailable"; retryAfterSeconds?: number }>

type CustomerPayload = Readonly<{
  customer?: Readonly<{ id?: unknown }>
}>

const jsonPayload = async <Value>(
  response: Response
): Promise<Value | null> => {
  try {
    return (await response.json()) as Value
  } catch {
    return null
  }
}

const privateHeaders = (
  binding: MarketRuntimeBinding,
  token: string
): HeadersInit => ({
  accept: "application/json",
  authorization: `Bearer ${token}`,
  "x-publishable-api-key": binding.publishableApiKey,
})

const resolveBinding = (
  dependencies: PrivateFlowReaderDependencies,
  market: Market
) => {
  try {
    return dependencies.resolveMarket(market)
  } catch {
    return null
  }
}

export const createMedusaPrivateFlowReader = (
  dependencies: PrivateFlowReaderDependencies
) => ({
  async readSession(
    market: Market,
    token: string | null
  ): Promise<PrivateSessionResult> {
    if (!token) {
      return { kind: "unauthenticated" }
    }
    const binding = resolveBinding(dependencies, market)
    if (!binding) {
      return { kind: "unavailable", retryAfterSeconds: 30 }
    }

    try {
      const response = await dependencies.fetch(
        new URL("/store/customers/me", dependencies.baseUrl),
        {
          cache: "no-store",
          headers: privateHeaders(binding, token),
          method: "GET",
          signal: AbortSignal.timeout(PRIVATE_FLOW_TIMEOUT_MS),
        }
      )
      if (response.status === 401 || response.status === 403) {
        return { kind: "unauthenticated" }
      }
      if (!response.ok) {
        return { kind: "unavailable", retryAfterSeconds: 30 }
      }
      const payload = await jsonPayload<CustomerPayload>(response)
      const customerId = payload?.customer?.id
      return typeof customerId === "string" && customerId.length > 0
        ? { kind: "authenticated", session: { customerId, token } }
        : { kind: "unavailable", retryAfterSeconds: 30 }
    } catch {
      return { kind: "unavailable", retryAfterSeconds: 30 }
    }
  },
})
