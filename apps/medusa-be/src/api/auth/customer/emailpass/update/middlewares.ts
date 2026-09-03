import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { MiddlewareRoute } from "@medusajs/medusa"
import { POST } from "./route"

const AUTH_UPDATE_PATH = /^\/auth\/([^/]+)\/([^/]+)\/update\/?$/i
const ENCODED_OCTET = /%[\da-f]{2}/i

export const customerEmailpassUpdateGuardMatcher =
  /^\/auth\/[^/]+\/[^/]+\/update\/?$/i

type DecodedSegment = { kind: "canonical"; value: string } | { kind: "unsafe" }

function decodeCanonicalSegment(segment: string): DecodedSegment {
  let decoded: string
  try {
    decoded = decodeURIComponent(segment)
  } catch {
    return { kind: "unsafe" }
  }

  // Express decodes route parameters once. A remaining encoded octet would
  // create an ambiguous, double-encoded provider or actor across layers.
  if (ENCODED_OCTET.test(decoded)) {
    return { kind: "unsafe" }
  }

  return { kind: "canonical", value: decoded.toLowerCase() }
}

/**
 * Reject the protected update path after exactly one canonical URL decode.
 * Malformed and nested encodings fail closed before Medusa can consume a reset
 * token, while canonical routes for other actor/provider pairs continue.
 */
export function rejectGenericCustomerEmailpassUpdate(
  request: MedusaRequest,
  response: MedusaResponse,
  next: MedusaNextFunction
) {
  const match = AUTH_UPDATE_PATH.exec(request.path)
  if (!match) {
    return next()
  }

  const actorSegment = match[1]
  const providerSegment = match[2]
  if (!(actorSegment && providerSegment)) {
    return next()
  }

  const actorType = decodeCanonicalSegment(actorSegment)
  const authProvider = decodeCanonicalSegment(providerSegment)
  if (actorType.kind === "unsafe" || authProvider.kind === "unsafe") {
    return POST(request, response)
  }
  if (actorType.value === "customer" && authProvider.value === "emailpass") {
    return POST(request, response)
  }

  return next()
}

export const customerEmailpassUpdateGuardMiddlewares: MiddlewareRoute[] = [
  {
    matcher: customerEmailpassUpdateGuardMatcher,
    methods: ["POST"],
    middlewares: [rejectGenericCustomerEmailpassUpdate],
  },
]
