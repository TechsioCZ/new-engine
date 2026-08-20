import {
  systemHostFailureResponse,
  systemNotFoundResponse,
  systemOptionsResponse,
  toHeadResponse,
} from "@/lib/seo/system-response"
import { resolveSystemHostFromRequest } from "@/lib/seo/system-runtime.server"

export const dynamic = "force-dynamic"

type WellKnownContext = Readonly<{
  params: Promise<Readonly<{ name: string }>>
}>

// No application-owned well-known resource is approved for the initial release.
// ACME challenges remain ingress-owned; unregistered names fail closed.
export const GET = async (
  request: Request,
  context: WellKnownContext
): Promise<Response> => {
  const resolution = resolveSystemHostFromRequest(request)
  if (resolution.kind !== "found") {
    return systemHostFailureResponse(resolution)
  }
  await context.params
  return systemNotFoundResponse()
}

export const HEAD = async (
  request: Request,
  context: WellKnownContext
): Promise<Response> => toHeadResponse(await GET(request, context))

export const OPTIONS = systemOptionsResponse
