import type { Query } from "@medusajs/framework"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
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
import {
  buildCatalogFilterExpressions,
  getFacetDistribution,
  getNumericFacetStats,
  humanizeFacetHandle,
  normalizeBrandParam,
  normalizeCategoryIdsParam,
  normalizeFormParam,
  normalizeIngredientParam,
  normalizeStatusParam,
  resolveCatalogSort,
  sortFacetCountItems,
  type FacetCountItem,
} from "./utils"
import {
  STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
  STORE_CATALOG_PRODUCTS_PRICING_FIELDS,
  type StoreCatalogProductsSchemaType,
} from "./validators"

type MeiliProductHit = {
  id?: string | number
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

const FACETS_TO_FETCH = [
  "facet_status",
  "facet_form",
  "facet_brand",
  "facet_ingredient",
  "facet_price",
]

const mapStatusFacets = (facetCounts: Map<string, number>): FacetCountItem[] => {
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
    return undefined
  }

  const id = (hit as MeiliProductHit).id
  if (typeof id === "string") {
    return id
  }
  if (typeof id === "number" && Number.isFinite(id)) {
    return String(id)
  }

  return undefined
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
    if (!producer.handle || !producer.title) {
      continue
    }
    producerTitleByHandle.set(producer.handle, producer.title)
  }

  for (const facetId of facetIds) {
    const handle = extractBrandHandleFromFacetId(facetId)
    if (!handle) {
      continue
    }

    labelsById.set(facetId, producerTitleByHandle.get(handle) ?? humanizeFacetHandle(handle))
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
    if (!category.handle || !category.name) {
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
): FacetCountItem[] => {
  return sortFacetCountItems(
    Array.from(facetCounts.entries()).map(([id, count]) => ({
      id,
      label: labelsById.get(id) ?? humanizeFacetHandle(id),
      count,
    }))
  )
}

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
  const searchResult = await meilisearchService.search(
    "products",
    validatedQuery.q.trim(),
    {
      paginationOptions: {
        limit,
        offset,
      },
      filter: filterExpressions.length > 0 ? filterExpressions : undefined,
      additionalOptions: {
        attributesToRetrieve: ["id"],
        facets: FACETS_TO_FETCH,
        ...(sort ? { sort } : {}),
      },
    }
  )

  const productIds = Array.isArray(searchResult.hits)
    ? searchResult.hits
        .map((hit) => getProductIdFromHit(hit))
        .filter((id): id is string => Boolean(id))
    : []

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

    const region = ((regions as RegionPricingRecord[])[0] ?? null) as RegionPricingRecord | null

    if (!region?.id || !region.currency_code) {
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
          filters: {
            id: {
              $in: productIds,
            },
          },
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

  const statusFacetCounts = getFacetDistribution(
    searchResult.facetDistribution,
    "facet_status"
  )
  const formFacetCounts = getFacetDistribution(
    searchResult.facetDistribution,
    "facet_form"
  )
  const brandFacetCounts = getFacetDistribution(
    searchResult.facetDistribution,
    "facet_brand"
  )
  const ingredientFacetCounts = getFacetDistribution(
    searchResult.facetDistribution,
    "facet_ingredient"
  )
  const priceFacetStats = getNumericFacetStats(searchResult.facetStats, "facet_price")

  const [brandLabelsById, ingredientLabelsById] = await Promise.all([
    resolveBrandFacetLabels(queryService, Array.from(brandFacetCounts.keys())),
    resolveIngredientFacetLabels(
      queryService,
      Array.from(ingredientFacetCounts.keys())
    ),
  ])

  const count =
    typeof searchResult.estimatedTotalHits === "number"
      ? searchResult.estimatedTotalHits
      : orderedProducts.length
  const totalPages = count > 0 ? Math.ceil(count / limit) : 0

  res.json({
    products: orderedProducts,
    count,
    page,
    limit,
    totalPages,
    facets: {
      status: mapStatusFacets(statusFacetCounts),
      form: mapFormFacets(formFacetCounts),
      brand: mapDynamicFacets(brandFacetCounts, brandLabelsById),
      ingredient: mapDynamicFacets(ingredientFacetCounts, ingredientLabelsById),
      price: {
        min: priceFacetStats.min ?? null,
        max: priceFacetStats.max ?? null,
      },
    },
  })
}
