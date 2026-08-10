import { headersWithCors } from "payload"
import type { PayloadRequest } from "payload"

type LocaleValue = PayloadRequest["locale"]

/** Normalize query parameters that might be serialized as "null"/"undefined". */
const normalizeParam = (value: string | null): string | undefined => {
  if (
    value === null ||
    value === "" ||
    value === "null" ||
    value === "undefined"
  ) {
    return undefined
  }
  return value
}

/** Read a string query param from a Payload request URL. */
export const getQueryParam = (
  req: PayloadRequest,
  key: string,
): string | undefined => {
  try {
    const url = new URL(req.url ?? "", "http://localhost")
    return normalizeParam(url.searchParams.get(key))
  } catch {
    // Malformed request URLs have no usable query parameter.
    return undefined
  }
}

/** Resolve a locale from the request and validate against configured locales. */
export const getLocaleFromRequest = (req: PayloadRequest): LocaleValue => {
  const localeParam = getQueryParam(req, "locale")
  if (localeParam === undefined) {
    return undefined
  }

  if (localeParam === "all") {
    return "all"
  }

  const { localization } = req.payload.config
  if (localization === false) {
    return undefined
  }

  const matchedLocale = localization.localeCodes.find(
    (locale) => locale === localeParam,
  )
  if (matchedLocale === "cs") {
    return "cs"
  }
  if (matchedLocale === "en") {
    return "en"
  }
  return matchedLocale === "sk" ? "sk" : undefined
}

/** Build a JSON response with Payload CORS headers applied. */
export const buildJsonResponse = (
  req: PayloadRequest,
  data: unknown,
): Response => {
  const headers = headersWithCors({
    headers: new Headers(),
    req,
  })

  return Response.json(data, {
    headers,
    status: 200,
  })
}
