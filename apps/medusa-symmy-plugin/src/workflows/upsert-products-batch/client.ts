import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { batchProductsWorkflow } from "@medusajs/medusa/core-flows"

import { productBatchClientMapperHelper } from "./client-mapper-helper"
import type { ProductInput } from "./types"

export interface ResolvedCategoryMap {
  byHandle: Map<string, string>
  byName: Map<string, string>
}

export interface ExistingProduct {
  id: string
  external_id: string | null
  metadata: Record<string, unknown> | null
  variants: { id: string; sku: string | null; ean: string | null }[]
}

export interface ExistingProductIndex {
  byErpId: Map<string, ExistingProduct>
  bySku: Map<string, ExistingProduct>
  byEan: Map<string, ExistingProduct>
}

export interface CreatedProduct {
  id: string
  variants?: { id: string }[]
}

export type CreateProductPayload = ReturnType<
  typeof productBatchClientMapperHelper.buildCreatePayload
>
export type UpdateProductPayload = ReturnType<
  typeof productBatchClientMapperHelper.buildUpdatePayload
>

export interface ProductBatchPayload {
  create: CreateProductPayload[]
  update: UpdateProductPayload[]
}

export interface ProductBatchApplyResult {
  created: CreatedProduct[]
  updated: CreatedProduct[]
}

const PRODUCT_PREFETCH_FIELDS = [
  "id",
  "external_id",
  "metadata",
  "variants.id",
  "variants.sku",
  "variants.ean",
] as const

const isObjectMap = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const getObjectValue = (value: unknown, key: string): unknown =>
  isObjectMap(value) ? value[key] : undefined

const decodeCreatedProduct = (value: unknown): CreatedProduct | null => {
  const id = getObjectValue(value, "id")
  if (typeof id !== "string") {
    return null
  }
  const rawVariants = getObjectValue(value, "variants")
  if (rawVariants === undefined) {
    return { id }
  }
  if (!Array.isArray(rawVariants)) {
    return null
  }
  const candidates: unknown[] = rawVariants
  const variants: { id: string }[] = []
  for (const variant of candidates) {
    const variantId = getObjectValue(variant, "id")
    if (typeof variantId !== "string") {
      return null
    }
    variants.push({ id: variantId })
  }
  return { id, variants }
}

const decodeCreatedProducts = (value: unknown): CreatedProduct[] | null => {
  if (!Array.isArray(value)) {
    return null
  }
  const candidates: unknown[] = value
  const products: CreatedProduct[] = []
  for (const candidate of candidates) {
    const product = decodeCreatedProduct(candidate)
    if (product === null) {
      return null
    }
    products.push(product)
  }
  return products
}

const getQuery = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.QUERY)

export type Query = ReturnType<typeof getQuery>

export class ProductBatchClient {
  private readonly container: MedusaContainer
  private readonly helper = productBatchClientMapperHelper
  private readonly query: Query

  constructor(container: MedusaContainer) {
    this.container = container
    this.query = getQuery(container)
  }

  async preload(products: ProductInput[]): Promise<ExistingProductIndex> {
    const { erpIds, skus, eans } =
      this.helper.collectProductIdentifiers(products)
    const fields: string[] = [...PRODUCT_PREFETCH_FIELDS]
    const [erpProducts, skuVariants, eanVariants] = await Promise.all([
      this.queryProductsByExternalIds(erpIds, fields),
      this.queryVariantProductRefs("sku", skus),
      this.queryVariantProductRefs("ean", eans),
    ])

    const { existingProductsById, byErpId } =
      this.helper.cacheProductsByErpId(erpProducts)
    const skuToProductId = this.helper.buildProductIdByVariantField(
      skuVariants,
      "sku",
    )
    const eanToProductId = this.helper.buildProductIdByVariantField(
      eanVariants,
      "ean",
    )
    const missingProductIds = this.helper.collectMissingProductIds(
      existingProductsById,
      [skuToProductId, eanToProductId],
    )
    await this.hydrateMissingProducts(
      existingProductsById,
      missingProductIds,
      fields,
    )

    return {
      byEan: this.helper.buildExistingProductsByIdentifier(
        existingProductsById,
        eanToProductId,
      ),
      byErpId,
      bySku: this.helper.buildExistingProductsByIdentifier(
        existingProductsById,
        skuToProductId,
      ),
    }
  }

  async resolveCategoriesForBatch(
    products: ProductInput[],
  ): Promise<ResolvedCategoryMap> {
    const { handles, names } = this.helper.collectCategoryRefs(products)
    const [byHandle, byName] = await Promise.all([
      this.resolveCategoriesByField("handle", handles),
      this.resolveCategoriesByField("name", names),
    ])

    return { byHandle, byName }
  }

  async resolveDefaultSalesChannelId(): Promise<string | null> {
    const { data: stores } = await this.query.graph({
      entity: "store",
      fields: ["id", "default_sales_channel_id"],
      pagination: { take: 1 },
    })
    const store: unknown = stores[0]
    const defaultSalesChannelId = getObjectValue(
      store,
      "default_sales_channel_id",
    )
    if (
      typeof defaultSalesChannelId === "string" &&
      defaultSalesChannelId.length > 0
    ) {
      return defaultSalesChannelId
    }
    const { data: salesChannels } = await this.query.graph({
      entity: "sales_channel",
      fields: ["id"],
      pagination: { take: 1 },
    })
    const salesChannelId = getObjectValue(salesChannels[0], "id")
    return typeof salesChannelId === "string" ? salesChannelId : null
  }

  async applyBatch(
    payload: ProductBatchPayload,
  ): Promise<ProductBatchApplyResult> {
    if (payload.create.length === 0 && payload.update.length === 0) {
      return { created: [], updated: [] }
    }
    const { result } = await batchProductsWorkflow(this.container).run({
      input: payload,
    })

    const workflowResult: unknown = result
    if (!isObjectMap(workflowResult)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Product batch workflow returned an invalid result",
      )
    }
    const created = decodeCreatedProducts(
      getObjectValue(workflowResult, "created"),
    )
    const updated = decodeCreatedProducts(
      getObjectValue(workflowResult, "updated"),
    )
    if (created === null || updated === null) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Product batch workflow returned invalid products",
      )
    }
    return { created, updated }
  }

  private async queryProductsByExternalIds(
    erpIds: Set<string>,
    fields: string[],
  ): Promise<Record<string, unknown>[]> {
    if (erpIds.size === 0) {
      return []
    }

    const { data } = await this.query.graph({
      entity: "product",
      fields,
      filters: { external_id: [...erpIds] },
    })
    const rows: unknown[] = data
    return rows.filter(isObjectMap)
  }

  private async queryVariantProductRefs(
    field: "sku" | "ean",
    values: Set<string>,
  ): Promise<Record<string, unknown>[]> {
    if (values.size === 0) {
      return []
    }

    const { data } = await this.query.graph({
      entity: "product_variant",
      fields: [field, "product_id"],
      filters: { [field]: [...values] },
    })
    const rows: unknown[] = data
    return rows.filter(isObjectMap)
  }

  private async hydrateMissingProducts(
    existingProductsById: Map<string, ExistingProduct>,
    missingProductIds: Set<string>,
    fields: string[],
  ) {
    if (missingProductIds.size === 0) {
      return
    }

    const { data } = await this.query.graph({
      entity: "product",
      fields,
      filters: { id: [...missingProductIds] },
    })
    const rows: unknown[] = data
    for (const raw of rows) {
      if (isObjectMap(raw)) {
        const existingProduct = this.helper.toExistingProduct(raw)
        existingProductsById.set(existingProduct.id, existingProduct)
      }
    }
  }

  private async resolveCategoriesByField(
    field: "handle" | "name",
    values: Set<string>,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    if (values.size === 0) {
      return map
    }

    const { data } = await this.query.graph({
      entity: "product_category",
      fields: ["id", field],
      filters: { [field]: [...values] },
    })

    const categories: unknown[] = data
    for (const category of categories) {
      if (
        !isObjectMap(category) ||
        typeof getObjectValue(category, "id") !== "string"
      ) {
        continue
      }
      const value = category[field]
      if (typeof value === "string" && !map.has(value)) {
        const categoryId = getObjectValue(category, "id")
        if (typeof categoryId === "string") {
          map.set(value, categoryId)
        }
      }
    }

    return map
  }
}
