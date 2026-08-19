import type {
  MarketRuntime,
  MarketRuntimeBinding,
} from "@/lib/market/market-runtime"

export const SYSTEM_PUBLIC_CACHE =
  "public, max-age=300, s-maxage=300, stale-if-error=86400"
export const SYSTEM_NO_STORE = "private, no-store, max-age=0"
export const SYSTEM_RETRY_AFTER_SECONDS = 60

export type SystemHostDependencies = Readonly<{
  getRuntime(): MarketRuntime
  resolveMarket(
    runtime: MarketRuntime,
    host: string | null
  ): MarketRuntimeBinding | null
}>

export type SystemHostResolution =
  | Readonly<{ kind: "found"; binding: MarketRuntimeBinding }>
  | Readonly<{ kind: "unknown-host" }>
  | Readonly<{ kind: "config-unavailable" }>

export const resolveSystemHost = (
  request: Request,
  dependencies: SystemHostDependencies
): SystemHostResolution => {
  try {
    const runtime = dependencies.getRuntime()
    const binding = dependencies.resolveMarket(
      runtime,
      request.headers.get("host")
    )
    return binding ? { kind: "found", binding } : { kind: "unknown-host" }
  } catch {
    return { kind: "config-unavailable" }
  }
}

const failureHeaders = (retryAfter?: number) => ({
  "cache-control": SYSTEM_NO_STORE,
  "content-type": "text/plain; charset=utf-8",
  ...(retryAfter === undefined ? {} : { "retry-after": String(retryAfter) }),
  vary: "Host",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow",
})

export const systemHostFailureResponse = (
  resolution: Exclude<SystemHostResolution, { kind: "found" }>
): Response =>
  resolution.kind === "unknown-host"
    ? new Response("Misdirected Request\n", {
        headers: failureHeaders(),
        status: 421,
      })
    : systemSourceFailureResponse()

export const systemSourceFailureResponse = (
  retryAfterSeconds = SYSTEM_RETRY_AFTER_SECONDS
): Response =>
  new Response("Service Unavailable\n", {
    headers: failureHeaders(retryAfterSeconds),
    status: 503,
  })

export const systemNotFoundResponse = (): Response =>
  new Response("Not Found\n", {
    headers: failureHeaders(),
    status: 404,
  })

export const systemResponse = (
  body: BodyInit,
  contentType: string,
  init: ResponseInit = {}
): Response =>
  new Response(body, {
    ...init,
    headers: {
      "cache-control": SYSTEM_PUBLIC_CACHE,
      "content-type": contentType,
      vary: "Host",
      "x-content-type-options": "nosniff",
      ...init.headers,
    },
  })

export const toHeadResponse = (response: Response): Response =>
  new Response(null, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  })

export const systemOptionsResponse = (): Response =>
  new Response(null, {
    headers: {
      allow: "GET, HEAD",
      "cache-control": SYSTEM_NO_STORE,
    },
    status: 204,
  })
