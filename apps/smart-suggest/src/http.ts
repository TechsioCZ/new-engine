import type { SmartSuggestConfig } from "./config"

export function jsonResponse(
  request: Request,
  config: SmartSuggestConfig,
  body: unknown,
  init: ResponseInit = {}
): Response {
  const headers = new Headers(init.headers)
  headers.set("content-type", "application/json; charset=utf-8")

  applyCorsHeaders(request, config, headers)

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  })
}

export function emptyCorsResponse(
  request: Request,
  config: SmartSuggestConfig
): Response {
  const headers = new Headers()
  applyCorsHeaders(request, config, headers)

  return new Response(null, {
    status: 204,
    headers,
  })
}

function applyCorsHeaders(
  request: Request,
  config: SmartSuggestConfig,
  headers: Headers
): void {
  const origin = request.headers.get("origin")
  const allowedOrigin = resolveAllowedOrigin(origin, config.allowedOrigins)

  headers.set("vary", "Origin")
  headers.set("access-control-allow-methods", "GET, OPTIONS")
  headers.set(
    "access-control-allow-headers",
    `content-type, ${config.tenant.tenantHeader}`
  )
  headers.set("access-control-max-age", "600")

  if (allowedOrigin) {
    headers.set("access-control-allow-origin", allowedOrigin)
  }
}

function resolveAllowedOrigin(
  origin: string | null,
  allowedOrigins: readonly string[]
): string | undefined {
  if (!origin) {
    return
  }

  if (allowedOrigins.includes("*")) {
    return origin
  }

  return allowedOrigins.includes(origin) ? origin : undefined
}
