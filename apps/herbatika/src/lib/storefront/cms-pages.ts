import type { StaticRootPageKey } from "@/lib/url/types"
import {
  CmsInvalidResponseError,
  CmsRequestError,
  type CmsSourceReadResult,
  readCmsJson,
} from "./cms-client"
import { rewriteCmsHtmlMediaUrls } from "./cms-content"
import type { CmsPage } from "./cms-types"
import type { HerbatikaLocale } from "./market-context"

type CmsPageResponse = {
  page?: CmsPage | null
}

const normalizeCmsPage = (page: CmsPage) => ({
  ...page,
  content: rewriteCmsHtmlMediaUrls(page.content ?? ""),
})

const normalizeStableId = (value: string | number) => String(value).trim()

const isCmsPage = (value: unknown): value is CmsPage => {
  if (!(value && typeof value === "object")) {
    return false
  }

  const page = value as Partial<CmsPage>
  const hasStableId =
    (typeof page.id === "number" && Number.isFinite(page.id)) ||
    (typeof page.id === "string" && page.id.trim().length > 0)
  return (
    hasStableId &&
    typeof page.title === "string" &&
    page.title.trim().length > 0
  )
}

const normalizePageResult = (
  result: CmsSourceReadResult<CmsPageResponse>,
  expectedId?: string
): CmsSourceReadResult<CmsPage> => {
  if (result.kind !== "found") {
    return result
  }

  if (!isCmsPage(result.value.page)) {
    return { kind: "invalid-response", causeCode: "INVALID_PAGE_ENVELOPE" }
  }
  if (
    expectedId !== undefined &&
    normalizeStableId(result.value.page.id) !== normalizeStableId(expectedId)
  ) {
    return { kind: "invalid-response", causeCode: "MISMATCHED_PAGE_ID" }
  }

  return { kind: "found", value: normalizeCmsPage(result.value.page) }
}

const unwrapPageResult = (result: CmsSourceReadResult<CmsPage>) => {
  if (result.kind === "found") {
    return result.value
  }
  if (result.kind === "missing") {
    return null
  }
  if (result.kind === "invalid-response") {
    throw new CmsInvalidResponseError(result.causeCode)
  }
  throw new CmsRequestError("CMS page source is unavailable", {
    retryAfterSeconds: result.retryAfterSeconds,
    status: 503,
  })
}

export const readCmsPageBySlug = async (
  slug: string,
  locale: HerbatikaLocale
) =>
  normalizePageResult(
    await readCmsJson<CmsPageResponse>(`pages/${encodeURIComponent(slug)}`, {
      locale,
    })
  )

export const fetchCmsPageBySlug = async (
  slug: string,
  locale?: HerbatikaLocale
) => {
  if (!locale) {
    throw new CmsInvalidResponseError("MISSING_CMS_LOCALE")
  }
  return unwrapPageResult(await readCmsPageBySlug(slug, locale))
}

export const readCmsPageById = async (id: string, locale: HerbatikaLocale) =>
  normalizePageResult(
    await readCmsJson<CmsPageResponse>(
      `pages/by-id/${encodeURIComponent(id)}`,
      { locale }
    ),
    id
  )

export const fetchCmsPageById = async (id: string, locale: HerbatikaLocale) =>
  unwrapPageResult(await readCmsPageById(id, locale))

const readStaticPageBindings = (): Readonly<
  Partial<Record<StaticRootPageKey, string>>
> | null => {
  const raw = process.env.HERBATIKA_CMS_STATIC_PAGE_IDS
  if (!raw) {
    return null
  }

  try {
    const value = JSON.parse(raw) as unknown
    if (!(value && typeof value === "object" && !Array.isArray(value))) {
      return null
    }

    return Object.fromEntries(
      Object.entries(value).flatMap(([key, id]) => {
        const normalized =
          typeof id === "number" || typeof id === "string"
            ? String(id).trim()
            : ""
        return normalized ? [[key, normalized]] : []
      })
    )
  } catch {
    return null
  }
}

/** Read root-static content by its deployment-bound immutable Payload ID. */
export const readCmsStaticPage = (
  pageKey: StaticRootPageKey,
  locale: HerbatikaLocale
): Promise<CmsSourceReadResult<CmsPage>> => {
  const id = readStaticPageBindings()?.[pageKey]
  if (!id) {
    return Promise.resolve({
      kind: "invalid-response" as const,
      causeCode: `MISSING_STATIC_PAGE_BINDING_${pageKey.toUpperCase()}`,
    })
  }

  return readCmsPageById(id, locale)
}
