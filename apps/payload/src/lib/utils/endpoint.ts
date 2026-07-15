import { headersWithCors, type PayloadRequest } from "payload"

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

type LocaleValue = PayloadRequest["locale"]

/** Normalize query parameters that might be serialized as "null"/"undefined". */
const normalizeParam = (value: string | null): string | undefined => {
  if (!value || value === "null" || value === "undefined") {
    return
  }
  return value
}

/** Read a string query param from a Payload request URL. */
export const getQueryParam = (
  req: PayloadRequest,
  key: string
): string | undefined => {
  try {
    const url = new URL(req.url ?? "", "http://localhost")
    return normalizeParam(url.searchParams.get(key))
  } catch {
    // Defensive: Malformed URL or unexpected input; return undefined gracefully
    return
  }
}

/** Resolve a locale from the request and validate against configured locales. */
export const getLocaleFromRequest = (req: PayloadRequest): LocaleValue => {
  const localeParam = getQueryParam(req, "locale")
  if (!localeParam) {
    return
  }

  if (localeParam === "all") {
    return "all" as LocaleValue
  }

  const localization = req.payload.config.localization
  const localeCodes = localization ? localization.localeCodes : []
  return localeCodes.includes(localeParam)
    ? (localeParam as LocaleValue)
    : undefined
}

export const parseLimit = (value: string | undefined) => {
  const parsed = Number.parseInt(value || "", 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT
  }

  return Math.min(parsed, MAX_LIMIT)
}

export const isAuthorizedEndpointRequest = (req: PayloadRequest) => {
  if (req.user) {
    return true
  }

  const apiKey = process.env.PAYLOAD_API_KEY
  return Boolean(apiKey && req.headers.get("x-payload-api-key") === apiKey)
}

/** Build a JSON response with Payload CORS headers applied. */
export const buildJsonResponse = (
  req: PayloadRequest,
  data: unknown
): Response => {
  const headers = headersWithCors({
    headers: new Headers({ "Content-Type": "application/json" }),
    req,
  })

  return new Response(JSON.stringify(data), {
    status: 200,
    headers,
  })
}
