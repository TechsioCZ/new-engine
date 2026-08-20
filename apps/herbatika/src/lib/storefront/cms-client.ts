import { requireConfiguredMarketRuntimeBinding } from "@/lib/market/market-runtime.server"
import type { HerbatikaLocale } from "./market-context"
import { resolveMedusaBackendUrl } from "./runtime-env"

const CMS_REVALIDATE_SECONDS = 600
const CMS_MEDUSA_BASE_URL = resolveMedusaBackendUrl()
const CMS_REQUEST_TIMEOUT_MS = 5000
const CMS_RESPONSE_LIMIT_BYTES = 2 * 1024 * 1024
const CMS_RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])
const PAYLOAD_LOCALE_BY_MARKET_LOCALE: Record<
  HerbatikaLocale,
  "sk" | "cs" | "hu" | "ro"
> = {
  "sk-SK": "sk",
  "cs-CZ": "cs",
  "hu-HU": "hu",
  "ro-RO": "ro",
}
const MARKET_BY_MARKET_LOCALE = {
  "sk-SK": "sk",
  "cs-CZ": "cz",
  "hu-HU": "hu",
  "ro-RO": "ro",
} as const

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "")

const buildCmsRequestTarget = (
  path: string,
  params?: Record<string, string | number>,
  locale?: HerbatikaLocale
) => {
  const url = new URL(`/store/cms/${trimSlashes(path)}`, CMS_MEDUSA_BASE_URL)

  if (!locale) {
    throw new CmsInvalidResponseError("MISSING_CMS_LOCALE")
  }
  const marketContext = { code: MARKET_BY_MARKET_LOCALE[locale], locale }
  const binding = requireConfiguredMarketRuntimeBinding(marketContext.code)
  url.searchParams.set(
    "locale",
    PAYLOAD_LOCALE_BY_MARKET_LOCALE[marketContext.locale]
  )

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value))
  }

  return { publishableApiKey: binding.publishableApiKey, url }
}

export type CmsSourceReadResult<TValue> =
  | Readonly<{ kind: "found"; value: TValue }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "unavailable"; retryAfterSeconds?: number }>
  | Readonly<{ kind: "invalid-response"; causeCode: string }>

export class CmsRequestError extends Error {
  readonly retryAfterSeconds?: number
  readonly status?: number

  constructor(
    message: string,
    options?: {
      cause?: unknown
      retryAfterSeconds?: number
      status?: number
    }
  ) {
    super(message, { cause: options?.cause })
    this.name = "CmsRequestError"
    this.retryAfterSeconds = options?.retryAfterSeconds
    this.status = options?.status
  }
}

export class CmsInvalidResponseError extends Error {
  readonly causeCode: string

  constructor(causeCode: string, options?: { cause?: unknown }) {
    super(`CMS returned an invalid response (${causeCode})`, options)
    this.name = "CmsInvalidResponseError"
    this.causeCode = causeCode
  }
}

export const isCmsNotFoundError = (error: unknown) =>
  error instanceof CmsRequestError && error.status === 404

export type CmsRequestOptions = {
  locale?: HerbatikaLocale
  params?: Record<string, string | number>
  signal?: AbortSignal
}

const parseRetryAfterSeconds = (value: string | null) => {
  if (!value) {
    return
  }

  const seconds = Number(value)
  if (Number.isInteger(seconds) && seconds >= 0) {
    return seconds
  }

  const date = Date.parse(value)
  if (!Number.isNaN(date)) {
    return Math.max(0, Math.ceil((date - Date.now()) / 1000))
  }
}

const parseCmsJson = async <TResponse>(response: Response) => {
  const declaredLength = Number(response.headers.get("content-length"))
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > CMS_RESPONSE_LIMIT_BYTES
  ) {
    throw new CmsInvalidResponseError("RESPONSE_TOO_LARGE")
  }

  const text = await response.text()
  if (new TextEncoder().encode(text).byteLength > CMS_RESPONSE_LIMIT_BYTES) {
    throw new CmsInvalidResponseError("RESPONSE_TOO_LARGE")
  }

  try {
    return JSON.parse(text) as TResponse
  } catch (cause) {
    throw new CmsInvalidResponseError("INVALID_JSON", { cause })
  }
}

const fetchCmsAttempt = async (
  url: URL,
  publishableApiKey: string,
  externalSignal?: AbortSignal
): Promise<Response> => {
  if (externalSignal?.aborted) {
    throw externalSignal.reason
  }

  const timeoutController = new AbortController()
  const timeoutId = setTimeout(
    () => timeoutController.abort(new Error("CMS request timed out")),
    CMS_REQUEST_TIMEOUT_MS
  )
  const signal = externalSignal
    ? AbortSignal.any([externalSignal, timeoutController.signal])
    : timeoutController.signal

  try {
    return await fetch(url, {
      headers: {
        accept: "application/json",
        "x-publishable-api-key": publishableApiKey,
      },
      next: {
        revalidate: CMS_REVALIDATE_SECONDS,
      },
      signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

const fetchCmsResponse = async (
  url: URL,
  publishableApiKey: string,
  externalSignal?: AbortSignal
): Promise<Response> => {
  let firstResponse: Response
  try {
    firstResponse = await fetchCmsAttempt(
      url,
      publishableApiKey,
      externalSignal
    )
  } catch {
    if (externalSignal?.aborted) {
      throw externalSignal.reason
    }
    return fetchCmsAttempt(url, publishableApiKey, externalSignal)
  }

  if (!CMS_RETRYABLE_STATUSES.has(firstResponse.status)) {
    return firstResponse
  }

  await firstResponse.body?.cancel()
  return fetchCmsAttempt(url, publishableApiKey, externalSignal)
}

export const fetchCmsJsonOrThrow = async <TResponse>(
  path: string,
  { locale, params, signal }: CmsRequestOptions = {}
): Promise<TResponse> => {
  let response: Response

  try {
    const target = buildCmsRequestTarget(path, params, locale)
    response = await fetchCmsResponse(
      target.url,
      target.publishableApiKey,
      signal
    )
  } catch (cause) {
    if (signal?.aborted) {
      throw cause
    }
    if (cause instanceof CmsInvalidResponseError) {
      throw cause
    }

    throw new CmsRequestError(`CMS request failed for "${path}"`, { cause })
  }

  if (!response.ok) {
    throw new CmsRequestError(
      `CMS request failed for "${path}" with status ${response.status}`,
      {
        retryAfterSeconds: parseRetryAfterSeconds(
          response.headers.get("retry-after")
        ),
        status: response.status,
      }
    )
  }

  return parseCmsJson<TResponse>(response)
}

export const readCmsJson = async <TResponse>(
  path: string,
  options?: CmsRequestOptions
): Promise<CmsSourceReadResult<TResponse>> => {
  try {
    return {
      kind: "found",
      value: await fetchCmsJsonOrThrow<TResponse>(path, options),
    }
  } catch (error) {
    if (isCmsNotFoundError(error)) {
      return { kind: "missing" }
    }

    if (error instanceof CmsInvalidResponseError) {
      return { kind: "invalid-response", causeCode: error.causeCode }
    }

    if (error instanceof CmsRequestError) {
      if (
        error.status === undefined ||
        CMS_RETRYABLE_STATUSES.has(error.status)
      ) {
        return {
          kind: "unavailable",
          ...(error.retryAfterSeconds === undefined
            ? {}
            : { retryAfterSeconds: error.retryAfterSeconds }),
        }
      }

      return {
        kind: "invalid-response",
        causeCode: "CMS_REJECTED_REQUEST",
      }
    }

    return { kind: "unavailable" }
  }
}

/** Compatibility reader for non-routing surfaces. Never use for hard-status SSR. */
export const fetchCmsJson = async <TResponse>(
  path: string,
  options?: CmsRequestOptions
): Promise<TResponse | null> => {
  const result = await readCmsJson<TResponse>(path, options)
  return result.kind === "found" ? result.value : null
}
