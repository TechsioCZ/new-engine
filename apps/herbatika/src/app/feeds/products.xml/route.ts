import { generateProductFeed } from "@/lib/seo/product-feed"
import {
  SYSTEM_NO_STORE,
  systemHostFailureResponse,
  systemOptionsResponse,
  systemResponse,
  systemSourceFailureResponse,
  toHeadResponse,
} from "@/lib/seo/system-response"
import {
  resolveSystemHostFromRequest,
  systemProductFeedDependencies,
} from "@/lib/seo/system-runtime.server"

export const dynamic = "force-dynamic"

export const GET = async (request: Request): Promise<Response> => {
  const resolution = resolveSystemHostFromRequest(request)
  if (resolution.kind !== "found") {
    return systemHostFailureResponse(resolution)
  }
  try {
    const result = await generateProductFeed(
      resolution.binding,
      systemProductFeedDependencies
    )
    return result.kind === "found"
      ? systemResponse(result.value, "application/xml; charset=utf-8", {
          headers: { "cache-control": SYSTEM_NO_STORE },
        })
      : systemSourceFailureResponse(
          result.kind === "unavailable" ? result.retryAfterSeconds : undefined
        )
  } catch {
    return systemSourceFailureResponse()
  }
}

export const HEAD = async (request: Request): Promise<Response> =>
  toHeadResponse(await GET(request))

export const OPTIONS = systemOptionsResponse
