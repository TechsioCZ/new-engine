import "server-only"

import type { HerbatikaLocale } from "./market-context"
import { resolveMedusaBackendUrl } from "./runtime-env"
import { storefrontConfig } from "./sdk"

const CMS_REVALIDATE_SECONDS = 600
const CMS_MEDUSA_BASE_URL = resolveMedusaBackendUrl()

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "")

const CMS_LOCALE_BY_STOREFRONT_LOCALE: Record<HerbatikaLocale, string> = {
  "cs-CZ": "cs",
  "hu-HU": "hu",
  "ro-RO": "ro",
  "sk-SK": "sk",
}

const buildCmsUrl = (
  path: string,
  locale: HerbatikaLocale,
  params?: Record<string, string | number>
) => {
  const url = new URL(`/store/cms/${trimSlashes(path)}`, CMS_MEDUSA_BASE_URL)

  url.searchParams.set("locale", CMS_LOCALE_BY_STOREFRONT_LOCALE[locale])

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value))
  }

  return url
}

export class CmsRequestError extends Error {
  readonly status?: number

  constructor(message: string, options?: { cause?: unknown; status?: number }) {
    super(message, { cause: options?.cause })
    this.name = "CmsRequestError"
    this.status = options?.status
  }
}

export const isCmsNotFoundError = (error: unknown) =>
  error instanceof CmsRequestError && error.status === 404

type CmsRequestOptions = {
  params?: Record<string, string | number>
  signal?: AbortSignal
}

export const fetchCmsJsonOrThrow = async <TResponse>(
  path: string,
  locale: HerbatikaLocale,
  { params, signal }: CmsRequestOptions = {}
): Promise<TResponse> => {
  let response: Response

  try {
    response = await fetch(buildCmsUrl(path, locale, params), {
      headers: {
        accept: "application/json",
        "x-publishable-api-key": storefrontConfig.publishableKey,
      },
      next: {
        revalidate: CMS_REVALIDATE_SECONDS,
      },
      signal,
    })
  } catch (cause) {
    if (signal?.aborted) {
      throw cause
    }

    throw new CmsRequestError(`CMS request failed for "${path}"`, { cause })
  }

  if (!response.ok) {
    throw new CmsRequestError(
      `CMS request failed for "${path}" with status ${response.status}`,
      { status: response.status }
    )
  }

  return (await response.json()) as TResponse
}

export const fetchCmsJson = async <TResponse>(
  path: string,
  locale: HerbatikaLocale,
  params?: Record<string, string | number>
): Promise<TResponse | null> => {
  try {
    return await fetchCmsJsonOrThrow<TResponse>(path, locale, { params })
  } catch {
    return null
  }
}
