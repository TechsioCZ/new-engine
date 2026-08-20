import "server-only"
import { getInvalidationDispatcherHealth } from "@/lib/url-registry/runtime/invalidation-dispatcher-worker.server"

const HEADERS = Object.freeze({
  "cache-control": "no-store, max-age=0",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow, noarchive",
})

export const runtime = "nodejs"

export function GET() {
  const health = getInvalidationDispatcherHealth()
  return new Response(JSON.stringify(health), {
    headers: HEADERS,
    status: health.status === "degraded" ? 503 : 200,
  })
}
