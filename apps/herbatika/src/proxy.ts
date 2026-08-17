import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { resolveM00ProxyAction } from "@/lib/routing/m00-proxy"

const NEXT_INTERNAL_REQUEST_HEADERS = [
  "next-router-prefetch",
  "next-router-segment-prefetch",
  "next-router-state-tree",
  "next-url",
  "rsc",
  "x-nextjs-data",
] as const

const LEGACY_INTERNAL_REQUEST_HEADERS = [
  "x-canonical-origin",
  "x-market-code",
  "x-sales-channel-id",
] as const

const trustedRewriteHeaders = (
  request: NextRequest,
  action: Extract<ReturnType<typeof resolveM00ProxyAction>, { kind: "rewrite" }>
) => {
  const headers = new Headers(request.headers)

  for (const name of [
    ...NEXT_INTERNAL_REQUEST_HEADERS,
    ...LEGACY_INTERNAL_REQUEST_HEADERS,
  ]) {
    headers.delete(name)
  }

  for (const name of headers.keys()) {
    if (name.startsWith("x-sf-")) {
      headers.delete(name)
    }
  }

  headers.set("x-sf-canonical-origin", action.canonicalOrigin)
  headers.set("x-sf-market", action.market)
  headers.set("x-sf-public-path", action.publicPath)
  headers.set("x-sf-route-key", action.routeKey)

  return headers
}

const statusResponse = (status: 204 | 404 | 405 | 421, allow?: "GET, HEAD") =>
  new NextResponse(null, {
    status,
    headers: {
      ...(allow ? { Allow: allow } : {}),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
    },
  })

export const proxy = (request: NextRequest) => {
  const action = resolveM00ProxyAction({
    enabled: process.env.URL_ARCHITECTURE_M00_ENABLED === "1",
    host: request.headers.get("host"),
    method: request.method,
    pathname: request.nextUrl.pathname,
  })

  if (action.kind === "next") {
    return NextResponse.next()
  }

  if (action.kind === "respond") {
    return statusResponse(action.status, action.allow)
  }

  // Keep the adapter-provided origin. The pinned Next runtime canonicalizes
  // loopback addresses to `localhost`; the rewrite must stay on that internal
  // server origin rather than using the public market Host header.
  const destination = new URL(request.url)
  destination.pathname = action.pathname
  return NextResponse.rewrite(destination, {
    request: { headers: trustedRewriteHeaders(request, action) },
  })
}

export const config = {
  matcher: ["/__url-m00/:path*", "/~sf/:path*"],
}
