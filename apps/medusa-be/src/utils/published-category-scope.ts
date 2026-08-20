import type { MedusaContainer } from "@medusajs/framework/types"
import { STOREFRONT_TEXT_MARKETS } from "../modules/storefront-text/configuration"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../modules/storefront-url-assignment"
import type StorefrontUrlAssignmentModuleService from "../modules/storefront-url-assignment/service"
import { CATEGORY_CONTENT_SOURCE_LOCALE } from "./localized-category-content"

const MAX_PUBLISHED_CATEGORY_ASSIGNMENTS = 10_000

export type PublishedCategoryScopeResult =
  | Readonly<{ kind: "source" }>
  | Readonly<{
      categoryIds: readonly string[]
      kind: "published"
      market: string
      salesChannelId: string
    }>
  | Readonly<{ causeCode: string; kind: "invalid-response" }>
  | Readonly<{ kind: "unavailable" }>

const resolveExactSalesChannelId = (value: unknown): string | null => {
  const values = Array.isArray(value) ? value : []
  const ids = [
    ...new Set(
      values.filter(
        (candidate): candidate is string =>
          typeof candidate === "string" && candidate.trim().length > 0
      )
    ),
  ]
  return ids.length === 1 ? (ids[0] ?? null) : null
}

const resolveMarketForLocale = (locale: string) =>
  STOREFRONT_TEXT_MARKETS.find((entry) => entry.locale === locale)?.market ??
  null

export const readPublishedCategoryScope = async ({
  container,
  locale,
  salesChannelIds,
}: {
  container: Pick<MedusaContainer, "resolve">
  locale?: string
  salesChannelIds: unknown
}): Promise<PublishedCategoryScopeResult> => {
  if (!locale || locale === CATEGORY_CONTENT_SOURCE_LOCALE) {
    return { kind: "source" }
  }

  const market = resolveMarketForLocale(locale)
  const salesChannelId = resolveExactSalesChannelId(salesChannelIds)
  if (!(market && salesChannelId)) {
    return {
      causeCode: "INVALID_CATEGORY_PUBLICATION_SCOPE",
      kind: "invalid-response",
    }
  }

  let records: Awaited<
    ReturnType<
      StorefrontUrlAssignmentModuleService["listStorefrontUrlAssignments"]
    >
  >
  try {
    const service = container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
    records = await service.listStorefrontUrlAssignments(
      {
        entity_kind: "category",
        market_code: market,
        publication_status: "published",
        sales_channel_id: salesChannelId,
      },
      {
        select: [
          "entity_id",
          "entity_kind",
          "market_code",
          "publication_status",
          "sales_channel_id",
        ],
        take: MAX_PUBLISHED_CATEGORY_ASSIGNMENTS + 1,
      }
    )
  } catch {
    return { kind: "unavailable" }
  }

  if (records.length > MAX_PUBLISHED_CATEGORY_ASSIGNMENTS) {
    return {
      causeCode: "CATEGORY_PUBLICATION_SCOPE_TOO_LARGE",
      kind: "invalid-response",
    }
  }

  const categoryIds = new Set<string>()
  for (const record of records) {
    if (
      record.entity_kind !== "category" ||
      record.market_code !== market ||
      record.publication_status !== "published" ||
      record.sales_channel_id !== salesChannelId ||
      categoryIds.has(record.entity_id)
    ) {
      return {
        causeCode: "INVALID_CATEGORY_PUBLICATION_ASSIGNMENT",
        kind: "invalid-response",
      }
    }
    categoryIds.add(record.entity_id)
  }

  return {
    categoryIds: [...categoryIds],
    kind: "published",
    market,
    salesChannelId,
  }
}

const readRequestedIds = (value: unknown): readonly string[] | null => {
  if (typeof value === "string") {
    return [value]
  }
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string")
  }
  return null
}

export const intersectPublishedCategoryIds = (
  publishedIds: readonly string[],
  requestedFilter: unknown
) => {
  const requestedIds = readRequestedIds(requestedFilter)
  if (!requestedIds) {
    return [...publishedIds]
  }
  const requested = new Set(requestedIds)
  return publishedIds.filter((id) => requested.has(id))
}

export const sendPublishedCategoryScopeFailure = (
  result: Exclude<
    PublishedCategoryScopeResult,
    { kind: "published" | "source" }
  >,
  res: { status: (status: number) => { json: (body: unknown) => unknown } }
) =>
  res.status(503).json({
    code:
      result.kind === "invalid-response"
        ? result.causeCode
        : "CATEGORY_PUBLICATION_SCOPE_UNAVAILABLE",
    message: "Category publication scope is unavailable.",
  })
