import {
  systemHostFailureResponse,
  systemOptionsResponse,
  systemResponse,
  toHeadResponse,
} from "@/lib/seo/system-response"
import { resolveSystemHostFromRequest } from "@/lib/seo/system-runtime.server"
import { buildAbsoluteUrl } from "@/lib/url/public-url"

export const dynamic = "force-dynamic"

const MARKET_NAMES = {
  sk: "Herbatika Slovensko",
  cz: "Herbatika Česko",
  hu: "Herbatika Magyarország",
  ro: "Herbatika România",
} as const

export const GET = (request: Request): Response => {
  const resolution = resolveSystemHostFromRequest(request)
  if (resolution.kind !== "found") {
    return systemHostFailureResponse(resolution)
  }
  const { binding } = resolution
  const home = buildAbsoluteUrl({ kind: "home" }, binding.market).href
  const manifest = {
    background_color: "#ffffff",
    description: MARKET_NAMES[binding.market],
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "16x16 32x32 48x48 256x256",
        src: new URL("/favicon.ico", binding.canonicalOrigin).href,
        type: "image/x-icon",
      },
      {
        purpose: "any",
        sizes: "any",
        src: new URL("/herbatika-logo.svg", binding.canonicalOrigin).href,
        type: "image/svg+xml",
      },
    ],
    id: home,
    lang: binding.locale,
    name: MARKET_NAMES[binding.market],
    scope: home,
    short_name: "Herbatika",
    start_url: home,
    theme_color: "#ffffff",
  }
  return systemResponse(
    JSON.stringify(manifest),
    "application/manifest+json; charset=utf-8"
  )
}

export const HEAD = (request: Request): Response => toHeadResponse(GET(request))

export const OPTIONS = systemOptionsResponse
