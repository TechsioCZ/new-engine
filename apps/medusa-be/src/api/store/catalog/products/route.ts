import type { Query } from "@medusajs/framework"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  ProductStatus,
  QueryContext,
} from "@medusajs/framework/utils"
import type { MeiliSearchService } from "@rokmohar/medusa-plugin-meilisearch"
import {
  extractBrandHandleFromFacetId,
  extractIngredientHandleFromFacetId,
  FORM_FACET_DEFINITIONS,
  FORM_FACET_LABEL_BY_ID,
  STATUS_FACET_DEFINITIONS,
  STATUS_FACET_LABEL_BY_ID,
} from "../../../../modules/meilisearch/facets/product-facets"
import { MEILISEARCH } from "../../../../workflows/meilisearch"
import { normalizeProductSalesChannelFilter } from "../../../utils/product-filters"
import {
  buildCatalogFilterExpressions,
  type FacetCountItem,
  humanizeFacetHandle,
  normalizeBrandParam,
  normalizeCategoryIdsParam,
  normalizeFormParam,
  normalizeIngredientParam,
  normalizeStatusParam,
  resolveCatalogSort,
  sortFacetCountItems,
} from "./utils"
import {
  STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
  STORE_CATALOG_PRODUCTS_PRICING_FIELDS,
  type StoreCatalogProductsSchemaType,
} from "./validators"

type MeiliProductHit = {
  id?: string | number
}

type MeiliProductSearchResult = {
  hits?: unknown[]
  estimatedTotalHits?: number
  facetDistribution?: unknown
  facetStats?: unknown
}

type ProductRecord = Record<string, unknown> & {
  id?: unknown
}

type CatalogFacetDocument = {
  facet_status?: unknown
  facet_form?: unknown
  facet_brand?: unknown
  facet_ingredient?: unknown
  facet_price?: unknown
}

type VisibleCatalogFacetCounts = {
  status: Map<string, number>
  form: Map<string, number>
  brand: Map<string, number>
  ingredient: Map<string, number>
  price: {
    min?: number
    max?: number
  }
}

type ProducerRecord = {
  handle?: string
  title?: string
}

type CategoryRecord = {
  handle?: string
  name?: string
}

type RegionPricingRecord = {
  id?: string
  currency_code?: string
}

const FACET_ATTRIBUTES_TO_RETRIEVE = [
  "id",
  "facet_status",
  "facet_form",
  "facet_brand",
  "facet_ingredient",
  "facet_price",
]

const CATALOG_VISIBILITY_BATCH_SIZE = 100
const CATALOG_FACET_BATCH_SIZE = 100

const mapStatusFacets = (
  facetCounts: Map<string, number>
): FacetCountItem[] => {
  const usedIds = new Set<string>()

  const result: FacetCountItem[] = STATUS_FACET_DEFINITIONS.map((item) => {
    usedIds.add(item.id)

    return {
      id: item.id,
      label: item.label,
      count: facetCounts.get(item.id) ?? 0,
    }
  })

  const additionalItems = sortFacetCountItems(
    Array.from(facetCounts.entries())
      .filter(([id]) => !usedIds.has(id))
      .map(([id, count]) => ({
        id,
        label: STATUS_FACET_LABEL_BY_ID.get(id) ?? id,
        count,
      }))
  )

  return [...result, ...additionalItems]
}

const mapFormFacets = (facetCounts: Map<string, number>): FacetCountItem[] => {
  const usedIds = new Set<string>()

  const result: FacetCountItem[] = FORM_FACET_DEFINITIONS.map((item) => {
    usedIds.add(item.id)

    return {
      id: item.id,
      label: item.label,
      count: facetCounts.get(item.id) ?? 0,
    }
  })

  const additionalItems = sortFacetCountItems(
    Array.from(facetCounts.entries())
      .filter(([id]) => !usedIds.has(id))
      .map(([id, count]) => ({
        id,
        label: FORM_FACET_LABEL_BY_ID.get(id) ?? id,
        count,
      }))
  )

  return [...result, ...additionalItems]
}

const getProductIdFromHit = (hit: unknown): string | undefined => {
  if (!hit || typeof hit !== "object" || Array.isArray(hit)) {
    return
  }

  const id = (hit as MeiliProductHit).id
  if (typeof id === "string") {
    return id
  }
  if (Number.isFinite(id)) {
    return String(id)
  }

  return
}

const getEstimatedTotalHits = (
  searchResult: MeiliProductSearchResult
): number => {
  if (typeof searchResult.estimatedTotalHits === "number") {
    return searchResult.estimatedTotalHits
  }

  if (Array.isArray(searchResult.hits)) {
    return searchResult.hits.length
  }

  return 0
}

const getFacetValues = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string")
  }

  return typeof value === "string" ? [value] : []
}

const incrementFacetCounts = (
  counts: Map<string, number>,
  values: string[]
): void => {
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
}

const updatePriceStats = (
  priceStats: VisibleCatalogFacetCounts["price"],
  value: unknown
): void => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return
  }

  priceStats.min =
    priceStats.min === undefined ? value : Math.min(priceStats.min, value)
  priceStats.max =
    priceStats.max === undefined ? value : Math.max(priceStats.max, value)
}

const escapeMeiliFilterValue = (value: string): string =>
  value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')

const buildIdFilterExpression = (ids: string[]): string | undefined => {
  if (ids.length === 0) {
    return
  }

  if (ids.length === 1) {
    const [id] = ids
    return id ? `id = "${escapeMeiliFilterValue(id)}"` : undefined
  }

  return `(${ids
    .map((id) => `id = "${escapeMeiliFilterValue(id)}"`)
    .join(" OR ")})`
}

const getVisibleProductIds = async (
  queryService: Query,
  productIds: string[],
  salesChannelIdFilter: unknown
): Promise<string[]> => {
  if (productIds.length === 0) {
    return []
  }

  const filters = await normalizeProductSalesChannelFilter(queryService, {
    id: {
      $in: productIds,
    },
    sales_channel_id: salesChannelIdFilter,
    status: ProductStatus.PUBLISHED,
  })

  const { data: products = [] } = await queryService.graph({
    entity: "product",
    fields: ["id"],
    filters,
  })

  const visibleIds = new Set(
    (products as ProductRecord[])
      .map((product) => product.id)
      .filter((id): id is string => typeof id === "string")
  )

  return productIds.filter((id) => visibleIds.has(id))
}

const searchCatalogProducts = async ({
  meilisearchService,
  q,
  filterExpressions,
  sort,
  limit,
  offset,
}: {
  meilisearchService: MeiliSearchService
  q: string
  filterExpressions: string[]
  sort?: string[]
  limit: number
  offset: number
}): Promise<MeiliProductSearchResult> =>
  (await meilisearchService.search("products", q, {
    paginationOptions: {
      limit,
      offset,
    },
    filter: filterExpressions.length > 0 ? filterExpressions : undefined,
    additionalOptions: {
      attributesToRetrieve: ["id"],
      ...(sort ? { sort } : {}),
    },
  })) as MeiliProductSearchResult

const resolveVisibleCatalogFacetCounts = async ({
  meilisearchService,
  q,
  filterExpressions,
  visibleProductIds,
}: {
  meilisearchService: MeiliSearchService
  q: string
  filterExpressions: string[]
  visibleProductIds: string[]
}): Promise<VisibleCatalogFacetCounts> => {
  const facetCounts: VisibleCatalogFacetCounts = {
    status: new Map(),
    form: new Map(),
    brand: new Map(),
    ingredient: new Map(),
    price: {},
  }

  for (
    let cursor = 0;
    cursor < visibleProductIds.length;
    cursor += CATALOG_FACET_BATCH_SIZE
  ) {
    const batchIds = visibleProductIds.slice(
      cursor,
      cursor + CATALOG_FACET_BATCH_SIZE
    )
    const idFilter = buildIdFilterExpression(batchIds)
    if (!idFilter) {
      continue
    }

    const searchResult = (await meilisearchService.search("products", q, {
      paginationOptions: {
        limit: batchIds.length,
        offset: 0,
      },
      filter: [...filterExpressions, idFilter],
      additionalOptions: {
        attributesToRetrieve: FACET_ATTRIBUTES_TO_RETRIEVE,
      },
    })) as MeiliProductSearchResult

    const hits = Array.isArray(searchResult.hits) ? searchResult.hits : []
    for (const hit of hits as CatalogFacetDocument[]) {
      incrementFacetCounts(facetCounts.status, getFacetValues(hit.facet_status))
      incrementFacetCounts(facetCounts.form, getFacetValues(hit.facet_form))
      incrementFacetCounts(facetCounts.brand, getFacetValues(hit.facet_brand))
      incrementFacetCounts(
        facetCounts.ingredient,
        getFacetValues(hit.facet_ingredient)
      )
      updatePriceStats(facetCounts.price, hit.facet_price)
    }
  }

  return facetCounts
}

const resolveVisibleCatalogProductIds = async ({
  queryService,
  meilisearchService,
  q,
  filterExpressions,
  sort,
  salesChannelIdFilter,
  pageOffset,
  pageLimit,
}: {
  queryService: Query
  meilisearchService: MeiliSearchService
  q: string
  filterExpressions: string[]
  sort?: string[]
  salesChannelIdFilter: unknown
  pageOffset: number
  pageLimit: number
}): Promise<{
  productIds: string[]
  visibleProductIds: string[]
  count: number
}> => {
  let searchOffset = 0
  let totalHits: number | undefined
  const visibleProductIds: string[] = []
  const seenProductIds = new Set<string>()

  while (totalHits === undefined || searchOffset < totalHits) {
    const searchResult = await searchCatalogProducts({
      meilisearchService,
      q,
      filterExpressions,
      sort,
      limit: CATALOG_VISIBILITY_BATCH_SIZE,
      offset: searchOffset,
    })

    totalHits ??= getEstimatedTotalHits(searchResult)

    const hits = Array.isArray(searchResult.hits) ? searchResult.hits : []
    if (hits.length === 0) {
      break
    }

    const productIds = hits
      .map((hit) => getProductIdFromHit(hit))
      .filter((id): id is string => Boolean(id))
      .filter((id) => {
        if (seenProductIds.has(id)) {
          return false
        }
        seenProductIds.add(id)
        return true
      })

    visibleProductIds.push(
      ...(await getVisibleProductIds(
        queryService,
        productIds,
        salesChannelIdFilter
      ))
    )

    searchOffset += hits.length
    if (hits.length < CATALOG_VISIBILITY_BATCH_SIZE) {
      break
    }
  }

  return {
    productIds: visibleProductIds.slice(pageOffset, pageOffset + pageLimit),
    visibleProductIds,
    count: visibleProductIds.length,
  }
}

const resolveBrandFacetLabels = async (
  queryService: Query,
  facetIds: string[]
): Promise<Map<string, string>> => {
  const labelsById = new Map<string, string>()
  const handles = Array.from(
    new Set(
      facetIds
        .map((id) => extractBrandHandleFromFacetId(id))
        .filter((handle): handle is string => Boolean(handle))
    )
  )

  if (handles.length === 0) {
    return labelsById
  }

  const { data: producers } = await queryService.graph({
    entity: "producer",
    fields: ["handle", "title"],
    filters: {
      handle: {
        $in: handles,
      },
    },
  })

  const producerTitleByHandle = new Map<string, string>()
  for (const producer of producers as ProducerRecord[]) {
    if (!(producer.handle && producer.title)) {
      continue
    }
    producerTitleByHandle.set(producer.handle, producer.title)
  }

  for (const facetId of facetIds) {
    const handle = extractBrandHandleFromFacetId(facetId)
    if (!handle) {
      continue
    }

    labelsById.set(
      facetId,
      producerTitleByHandle.get(handle) ?? humanizeFacetHandle(handle)
    )
  }

  return labelsById
}

const resolveIngredientFacetLabels = async (
  queryService: Query,
  facetIds: string[]
): Promise<Map<string, string>> => {
  const labelsById = new Map<string, string>()
  const handles = Array.from(
    new Set(
      facetIds
        .map((id) => extractIngredientHandleFromFacetId(id))
        .filter((handle): handle is string => Boolean(handle))
    )
  )

  if (handles.length === 0) {
    return labelsById
  }

  const { data: categories } = await queryService.graph({
    entity: "product_category",
    fields: ["handle", "name"],
    filters: {
      handle: {
        $in: handles,
      },
    },
  })

  const categoryNameByHandle = new Map<string, string>()
  for (const category of categories as CategoryRecord[]) {
    if (!(category.handle && category.name)) {
      continue
    }
    categoryNameByHandle.set(category.handle, category.name)
  }

  for (const facetId of facetIds) {
    const handle = extractIngredientHandleFromFacetId(facetId)
    if (!handle) {
      continue
    }

    labelsById.set(
      facetId,
      categoryNameByHandle.get(handle) ?? humanizeFacetHandle(handle)
    )
  }

  return labelsById
}

const mapDynamicFacets = (
  facetCounts: Map<string, number>,
  labelsById: Map<string, string>
): FacetCountItem[] =>
  sortFacetCountItems(
    Array.from(facetCounts.entries()).map(([id, count]) => ({
      id,
      label: labelsById.get(id) ?? humanizeFacetHandle(id),
      count,
    }))
  )

export async function GET(
  req: MedusaRequest<unknown, StoreCatalogProductsSchemaType>,
  res: MedusaResponse
) {
  const validatedQuery = req.validatedQuery
  const queryService = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const meilisearchService = req.scope.resolve<MeiliSearchService>(MEILISEARCH)

  const page = validatedQuery.page
  const limit = validatedQuery.limit
  const offset = (page - 1) * limit

  const categoryIds = normalizeCategoryIdsParam(validatedQuery.category_id)
  const statusIds = normalizeStatusParam(validatedQuery.status)
  const formIds = normalizeFormParam(validatedQuery.form)
  const brandIds = normalizeBrandParam(validatedQuery.brand)
  const ingredientIds = normalizeIngredientParam(validatedQuery.ingredient)

  const filterExpressions = buildCatalogFilterExpressions({
    categoryIds,
    statusIds,
    formIds,
    brandIds,
    ingredientIds,
    priceMin: validatedQuery.price_min,
    priceMax: validatedQuery.price_max,
  })

  const sort = resolveCatalogSort(validatedQuery.sort)
  const { productIds, visibleProductIds, count } =
    await resolveVisibleCatalogProductIds({
      queryService,
      meilisearchService,
      q: validatedQuery.q.trim(),
      filterExpressions,
      sort,
      salesChannelIdFilter: req.filterableFields.sales_channel_id,
      pageOffset: offset,
      pageLimit: limit,
    })

  let pricingContext: ReturnType<typeof QueryContext> | undefined
  let productFields = STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS

  if (validatedQuery.region_id) {
    const { data: regions } = await queryService.graph({
      entity: "region",
      fields: ["id", "currency_code"],
      filters: {
        id: validatedQuery.region_id,
      },
    })

    const region = ((regions as RegionPricingRecord[])[0] ??
      null) as RegionPricingRecord | null

    if (!(region?.id && region.currency_code)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Region with id ${validatedQuery.region_id} not found when populating pricing context`
      )
    }

    pricingContext = QueryContext({
      region_id: region.id,
      currency_code: region.currency_code,
      country_code: validatedQuery.country_code,
    })
    productFields = [
      ...STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
      ...STORE_CATALOG_PRODUCTS_PRICING_FIELDS,
    ]
  }

  const { data: products } =
    productIds.length === 0
      ? { data: [] as Record<string, unknown>[] }
      : await queryService.graph({
          entity: "product",
          fields: productFields,
          filters: await normalizeProductSalesChannelFilter(queryService, {
            id: {
              $in: productIds,
            },
            sales_channel_id: req.filterableFields.sales_channel_id,
            status: ProductStatus.PUBLISHED,
          }),
          context: pricingContext
            ? {
                variants: {
                  calculated_price: pricingContext,
                },
              }
            : undefined,
        })

  const productOrder = new Map(productIds.map((id, index) => [id, index]))
  const orderedProducts = [...products].sort((left, right) => {
    const leftId = typeof left.id === "string" ? left.id : ""
    const rightId = typeof right.id === "string" ? right.id : ""
    const leftIndex = productOrder.get(leftId) ?? Number.MAX_SAFE_INTEGER
    const rightIndex = productOrder.get(rightId) ?? Number.MAX_SAFE_INTEGER
    return leftIndex - rightIndex
  })

  const facetCounts = await resolveVisibleCatalogFacetCounts({
    meilisearchService,
    q: validatedQuery.q.trim(),
    filterExpressions,
    visibleProductIds,
  })

  const [brandLabelsById, ingredientLabelsById] = await Promise.all([
    resolveBrandFacetLabels(queryService, Array.from(facetCounts.brand.keys())),
    resolveIngredientFacetLabels(
      queryService,
      Array.from(facetCounts.ingredient.keys())
    ),
  ])

  const totalPages = count > 0 ? Math.ceil(count / limit) : 0

  res.json({
    products: orderedProducts,
    count,
    page,
    limit,
    totalPages,
    facets: {
      status: mapStatusFacets(facetCounts.status),
      form: mapFormFacets(facetCounts.form),
      brand: mapDynamicFacets(facetCounts.brand, brandLabelsById),
      ingredient: mapDynamicFacets(
        facetCounts.ingredient,
        ingredientLabelsById
      ),
      price: {
        min: facetCounts.price.min ?? null,
        max: facetCounts.price.max ?? null,
      },
    },
  })
}
