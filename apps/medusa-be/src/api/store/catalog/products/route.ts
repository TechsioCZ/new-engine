import type { Query } from "@medusajs/framework"
import type { MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  ProductStatus,
  QueryContext,
} from "@medusajs/framework/utils"
import { wrapProductsWithTaxPrices } from "@medusajs/medusa/api/store/products/helpers"
import type { RequestWithContext } from "@medusajs/medusa/api/store/products/helpers"
import type { MeiliSearchService } from "@rokmohar/medusa-plugin-meilisearch"

import { isMeilisearchEnabled } from "../../../../modules/meilisearch/env"
import {
  extractBrandHandleFromFacetId,
  extractIngredientHandleFromFacetId,
  FORM_FACET_DEFINITIONS,
  FORM_FACET_LABEL_BY_ID,
  STATUS_FACET_DEFINITIONS,
  STATUS_FACET_LABEL_BY_ID,
} from "../../../../modules/meilisearch/facets/product-facets"
import { definedProperties } from "../../../../utils/defined-properties"
import {
  decorateProductsWithMeasurements,
  getMeasurementDecorationOptions,
} from "../../../../utils/measurement-units"
import { MEILISEARCH } from "../../../../workflows/meilisearch"
import { normalizeProductSalesChannelFilter } from "../../../utils/product-filters"
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
} from "./utils"
import type { FacetCountItem } from "./utils"
import {
  STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
  STORE_CATALOG_PRODUCTS_PRICING_FIELDS,
} from "./validators"
import type { StoreCatalogProductsSchemaType } from "./validators"

interface MeiliProductHit {
  id?: string | number
}

interface BrandRecord {
  handle?: string
  title?: string
}

interface CategoryRecord {
  handle?: string
  name?: string
}

const FACETS_TO_FETCH = [
  "facet_status",
  "facet_form",
  "facet_brand",
  "facet_ingredient",
  "facet_price",
]

const mapStatusFacets = (
  facetCounts: Map<string, number>,
): FacetCountItem[] => {
  const usedIds = new Set<string>()

  const result: FacetCountItem[] = STATUS_FACET_DEFINITIONS.map((item) => {
    usedIds.add(item.id)

    return {
      count: facetCounts.get(item.id) ?? 0,
      id: item.id,
      label: item.label,
    }
  })

  const additionalItems = sortFacetCountItems(
    [...facetCounts.entries()]
      .filter(([id]) => !usedIds.has(id))
      .map(([id, count]) => ({
        count,
        id,
        label: STATUS_FACET_LABEL_BY_ID.get(id) ?? id,
      })),
  )

  return [...result, ...additionalItems]
}

const mapFormFacets = (facetCounts: Map<string, number>): FacetCountItem[] => {
  const usedIds = new Set<string>()

  const result: FacetCountItem[] = FORM_FACET_DEFINITIONS.map((item) => {
    usedIds.add(item.id)

    return {
      count: facetCounts.get(item.id) ?? 0,
      id: item.id,
      label: item.label,
    }
  })

  const additionalItems = sortFacetCountItems(
    [...facetCounts.entries()]
      .filter(([id]) => !usedIds.has(id))
      .map(([id, count]) => ({
        count,
        id,
        label: FORM_FACET_LABEL_BY_ID.get(id) ?? id,
      })),
  )

  return [...result, ...additionalItems]
}

const getProductIdFromHit = (hit: unknown): string | undefined => {
  if (!hit || typeof hit !== "object" || Array.isArray(hit)) {
    return
  }

  const { id } = hit as MeiliProductHit
  if (typeof id === "string") {
    return id
  }
  if (Number.isFinite(id)) {
    return String(id)
  }

  return
}

const escapeMeiliFilterValue = (value: string): string =>
  value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')

const getSalesChannelIds = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string")
  }

  if (typeof value === "string") {
    return [value]
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const inValue = (value as Record<string, unknown>)["$in"]
    if (Array.isArray(inValue)) {
      return inValue.filter((item): item is string => typeof item === "string")
    }
  }

  return []
}

const buildMeiliOrExpression = (
  field: string,
  values: string[],
): string | undefined => {
  const uniqueValues = [...new Set(values.filter(Boolean))]
  if (uniqueValues.length === 0) {
    return
  }

  if (uniqueValues.length === 1) {
    const [value] = uniqueValues
    return value ? `${field} = "${escapeMeiliFilterValue(value)}"` : undefined
  }

  return `(${uniqueValues
    .map((value) => `${field} = "${escapeMeiliFilterValue(value)}"`)
    .join(" OR ")})`
}

const buildVisibilityFilterExpressions = (
  salesChannelIdFilter: unknown,
): string[] => {
  const expressions = [
    `facet_product_status = "${escapeMeiliFilterValue(ProductStatus.PUBLISHED)}"`,
  ]
  const salesChannelExpression = buildMeiliOrExpression(
    "facet_sales_channel_ids",
    getSalesChannelIds(salesChannelIdFilter),
  )

  if (salesChannelExpression) {
    expressions.push(salesChannelExpression)
  }

  return expressions
}
const resolveBrandFacetLabels = async (
  queryService: Query,
  facetIds: string[],
): Promise<Map<string, string>> => {
  const labelsById = new Map<string, string>()
  const handles = [
    ...new Set(
      facetIds
        .map((id) => extractBrandHandleFromFacetId(id))
        .filter((handle): handle is string => Boolean(handle)),
    ),
  ]

  if (handles.length === 0) {
    return labelsById
  }

  const { data: brands } = await queryService.graph({
    entity: "brand",
    fields: ["handle", "title"],
    filters: {
      handle: {
        $in: handles,
      },
    },
  })

  const brandTitleByHandle = new Map<string, string>()
  for (const brand of brands as BrandRecord[]) {
    if (!(brand.handle && brand.title)) {
      continue
    }
    brandTitleByHandle.set(brand.handle, brand.title)
  }

  for (const facetId of facetIds) {
    const handle = extractBrandHandleFromFacetId(facetId)
    if (!handle) {
      continue
    }

    labelsById.set(
      facetId,
      brandTitleByHandle.get(handle) ?? humanizeFacetHandle(handle),
    )
  }

  return labelsById
}

const resolveIngredientFacetLabels = async (
  queryService: Query,
  facetIds: string[],
): Promise<Map<string, string>> => {
  const labelsById = new Map<string, string>()
  const handles = [
    ...new Set(
      facetIds
        .map((id) => extractIngredientHandleFromFacetId(id))
        .filter((handle): handle is string => Boolean(handle)),
    ),
  ]

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
      categoryNameByHandle.get(handle) ?? humanizeFacetHandle(handle),
    )
  }

  return labelsById
}

const mapDynamicFacets = (
  facetCounts: Map<string, number>,
  labelsById: Map<string, string>,
): FacetCountItem[] =>
  sortFacetCountItems(
    [...facetCounts.entries()].map(([id, count]) => ({
      count,
      id,
      label: labelsById.get(id) ?? humanizeFacetHandle(id),
    })),
  )

export async function GET(
  req: RequestWithContext<unknown, StoreCatalogProductsSchemaType>,
  res: MedusaResponse,
) {
  if (!isMeilisearchEnabled()) {
    res.status(503).json({
      message: "Catalog search is disabled",
    })
    return
  }

  const { validatedQuery } = req
  const measurementDecorationOptions = getMeasurementDecorationOptions(
    req.queryConfig.fields,
  )
  const queryService = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const meilisearchService = req.scope.resolve<MeiliSearchService>(MEILISEARCH)

  const { page } = validatedQuery
  const { limit } = validatedQuery
  const offset = (page - 1) * limit

  const categoryIds = normalizeCategoryIdsParam(validatedQuery.category_id)
  const statusIds = normalizeStatusParam(validatedQuery.status)
  const formIds = normalizeFormParam(validatedQuery.form)
  const brandIds = normalizeBrandParam(validatedQuery.brand)
  const ingredientIds = normalizeIngredientParam(validatedQuery.ingredient)

  const filterExpressions = buildCatalogFilterExpressions({
    brandIds,
    categoryIds,
    formIds,
    ingredientIds,
    statusIds,
    ...(validatedQuery.price_min === undefined
      ? {}
      : { priceMin: validatedQuery.price_min }),
    ...(validatedQuery.price_max === undefined
      ? {}
      : { priceMax: validatedQuery.price_max }),
  })

  const sort = resolveCatalogSort(validatedQuery.sort)
  const searchFilters = [
    ...filterExpressions,
    ...buildVisibilityFilterExpressions(req.filterableFields.sales_channel_id),
  ]
  const searchFilter =
    searchFilters.length > 0 ? searchFilters.join(" AND ") : undefined
  const searchResult = await meilisearchService.search(
    "products",
    validatedQuery.q.trim(),
    {
      paginationOptions: {
        limit,
        offset,
      },
      ...(searchFilter === undefined ? {} : { filter: searchFilter }),
      additionalOptions: {
        attributesToRetrieve: ["id"],
        facets: FACETS_TO_FETCH,
        ...(sort ? { sort } : {}),
      },
    },
  )

  const productIds = Array.isArray(searchResult.hits)
    ? searchResult.hits
        .map((hit) => getProductIdFromHit(hit))
        .filter((id): id is string => Boolean(id))
    : []
  const pricingContext = req.pricingContext
    ? QueryContext(req.pricingContext)
    : undefined
  const productFields = pricingContext
    ? [
        ...STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
        ...STORE_CATALOG_PRODUCTS_PRICING_FIELDS,
      ]
    : STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS

  const { data: products } =
    productIds.length === 0
      ? { data: [] as Record<string, unknown>[] }
      : await queryService.graph(
          definedProperties({
            entity: "product",
            fields: productFields,
            filters: await normalizeProductSalesChannelFilter(
              queryService,
              remoteQuery,
              {
                id: {
                  $in: productIds,
                },
                sales_channel_id: req.filterableFields.sales_channel_id,
                status: ProductStatus.PUBLISHED,
              },
            ),
            ...((pricingContext
              ? {
                  variants: {
                    calculated_price: pricingContext,
                  },
                }
              : undefined) === undefined
              ? {}
              : {
                  context: pricingContext
                    ? {
                        variants: {
                          calculated_price: pricingContext,
                        },
                      }
                    : undefined,
                }),
          }),
        )

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
    "facet_status",
  )
  const formFacetCounts = getFacetDistribution(
    searchResult.facetDistribution,
    "facet_form",
  )
  const brandFacetCounts = getFacetDistribution(
    searchResult.facetDistribution,
    "facet_brand",
  )
  const ingredientFacetCounts = getFacetDistribution(
    searchResult.facetDistribution,
    "facet_ingredient",
  )
  const priceFacetStats = getNumericFacetStats(
    searchResult.facetStats,
    "facet_price",
  )

  const [brandLabelsById, ingredientLabelsById] = await Promise.all([
    resolveBrandFacetLabels(queryService, [...brandFacetCounts.keys()]),
    resolveIngredientFacetLabels(queryService, [
      ...ingredientFacetCounts.keys(),
    ]),
  ])

  const count =
    typeof searchResult.estimatedTotalHits === "number"
      ? searchResult.estimatedTotalHits
      : orderedProducts.length
  const totalPages = count > 0 ? Math.ceil(count / limit) : 0
  await wrapProductsWithTaxPrices(
    req,
    orderedProducts as Parameters<typeof wrapProductsWithTaxPrices>[1],
  )
  await decorateProductsWithMeasurements(
    req.scope,
    orderedProducts as Parameters<typeof decorateProductsWithMeasurements>[1],
    measurementDecorationOptions,
  )

  res.json({
    count,
    facets: {
      brand: mapDynamicFacets(brandFacetCounts, brandLabelsById),
      form: mapFormFacets(formFacetCounts),
      ingredient: mapDynamicFacets(ingredientFacetCounts, ingredientLabelsById),
      price: {
        max: priceFacetStats.max ?? null,
        min: priceFacetStats.min ?? null,
      },
      status: mapStatusFacets(statusFacetCounts),
    },
    limit,
    page,
    products: orderedProducts,
    totalPages,
  })
}
