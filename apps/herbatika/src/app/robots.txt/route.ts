import {
  systemHostFailureResponse,
  systemOptionsResponse,
  systemResponse,
  toHeadResponse,
} from "@/lib/seo/system-response"
import { resolveSystemHostFromRequest } from "@/lib/seo/system-runtime.server"
import { buildAbsoluteUrl } from "@/lib/url/public-url"

export const dynamic = "force-dynamic"

export const GET = (request: Request): Response => {
  const resolution = resolveSystemHostFromRequest(request)
  if (resolution.kind !== "found") {
    return systemHostFailureResponse(resolution)
  }

  const sitemap = new URL(
    "/sitemap.xml",
    buildAbsoluteUrl({ kind: "home" }, resolution.binding.market)
  ).href
  return systemResponse(
    `User-agent: *\nAllow: /\nDisallow: /~sf/\nDisallow: /api/\n\nSitemap: ${sitemap}\n`,
    "text/plain; charset=utf-8"
  )
}

export const HEAD = (request: Request): Response => toHeadResponse(GET(request))

export const OPTIONS = systemOptionsResponse
