import { headersWithCors, type PayloadRequest } from 'payload'

type LocaleValue = PayloadRequest['locale']

/** Normalize query parameters that might be serialized as "null"/"undefined". */
const normalizeParam = (value: string | null): string | undefined => {
  if (!value || value === 'null' || value === 'undefined') {
    return undefined
  }
  return value
}

/** Read a string query param from a Payload request URL. */
export const getQueryParam = (req: PayloadRequest, key: string): string | undefined => {
  try {
    const url = new URL(req.url ?? '', 'http://localhost')
    return normalizeParam(url.searchParams.get(key))
  } catch {
    // Defensive: Malformed URL or unexpected input; return undefined gracefully
    return undefined
  }
}

/** Resolve a locale from the request and validate against configured locales. */
export const getLocaleFromRequest = (req: PayloadRequest): LocaleValue => {
  const localeParam = getQueryParam(req, 'locale')
  if (!localeParam) {
    return undefined
  }

  if (localeParam === 'all') {
    return 'all' as LocaleValue
  }

  const localization = req.payload.config.localization
  const localeCodes = localization ? localization.localeCodes : []
  return localeCodes.includes(localeParam) ? (localeParam as LocaleValue) : undefined
}

/** Build a JSON response with Payload CORS headers applied. */
export const buildJsonResponse = (req: PayloadRequest, data: unknown): Response => {
  const headers = headersWithCors({
    headers: new Headers({ 'Content-Type': 'application/json' }),
    req,
  })

  return new Response(JSON.stringify(data), {
    status: 200,
    headers,
  })
}
