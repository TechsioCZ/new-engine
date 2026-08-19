import { readFile } from "node:fs/promises"
import { join } from "node:path"
import {
  systemHostFailureResponse,
  systemOptionsResponse,
  systemResponse,
  systemSourceFailureResponse,
  toHeadResponse,
} from "@/lib/seo/system-response"
import { resolveSystemHostFromRequest } from "@/lib/seo/system-runtime.server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

let faviconPromise: Promise<Buffer> | undefined

const loadFavicon = (): Promise<Buffer> => {
  faviconPromise ??= readFile(join(process.cwd(), "public/system/favicon.ico"))
  faviconPromise.catch(() => {
    faviconPromise = undefined
  })
  return faviconPromise
}

export const GET = async (request: Request): Promise<Response> => {
  const resolution = resolveSystemHostFromRequest(request)
  if (resolution.kind !== "found") {
    return systemHostFailureResponse(resolution)
  }
  try {
    return systemResponse(new Uint8Array(await loadFavicon()), "image/x-icon", {
      headers: { "cache-control": "public, max-age=86400, s-maxage=86400" },
    })
  } catch {
    return systemSourceFailureResponse()
  }
}

export const HEAD = async (request: Request): Promise<Response> =>
  toHeadResponse(await GET(request))

export const OPTIONS = systemOptionsResponse
