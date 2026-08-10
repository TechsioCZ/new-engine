import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { batchProductsWorkflow } from "@medusajs/medusa/core-flows"

import { productBatchClientMapperHelper } from "./client-mapper-helper"
import type { ExistingProduct } from "./schemas"
import type { ProductInput } from "./types"

export interface ResolvedCategoryMap {
  byHandle: Map<string, string>
  byName: Map<string, string>
}

export type { ExistingProduct } from "./schemas"

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
const categoryLookupSchema = z.object({
  handle: z.string().optional(),
  id: z.string(),
  name: z.string().optional(),
})

const decodeCreatedProduct = (value: unknown): CreatedProduct | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }
  const id: unknown = Reflect.get(value, "id")
  if (typeof id !== "string") {
    return null
  }
  const rawVariants: unknown = Reflect.get(value, "variants")
  if (rawVariants === undefined) {
    return { id }
  }
  if (!Array.isArray(rawVariants)) {
    return null
  }
  const candidates: unknown[] = rawVariants
  const variants: { id: string }[] = []
  for (const variant of candidates) {
    if (
      typeof variant !== "object" ||
      variant === null ||
      Array.isArray(variant)
    ) {
      return null
    }
    const variantId: unknown = Reflect.get(variant, "id")
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
    let defaultSalesChannelId: unknown
    if (typeof store === "object" && store !== null && !Array.isArray(store)) {
      defaultSalesChannelId = Reflect.get(store, "default_sales_channel_id")
    }
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
    const salesChannel: unknown = salesChannels[0]
    let salesChannelId: unknown
    if (
      typeof salesChannel === "object" &&
      salesChannel !== null &&
      !Array.isArray(salesChannel)
    ) {
      salesChannelId = Reflect.get(salesChannel, "id")
    }
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
    if (
      typeof workflowResult !== "object" ||
      workflowResult === null ||
      Array.isArray(workflowResult)
    ) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Product batch workflow returned an invalid result",
      )
    }
    const rawCreated: unknown = Reflect.get(workflowResult, "created")
    const rawUpdated: unknown = Reflect.get(workflowResult, "updated")
    const created = decodeCreatedProducts(rawCreated)
    const updated = decodeCreatedProducts(rawUpdated)
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
  ): Promise<object[]> {
    if (erpIds.size === 0) {
      return []
    }

    const { data } = await this.query.graph({
      entity: "product",
      fields,
      filters: { external_id: [...erpIds] },
    })
    const rows: unknown[] = data
    return rows.filter(
      (row): row is object =>
        typeof row === "object" && row !== null && !Array.isArray(row),
    )
  }

  private async queryVariantProductRefs(
    field: "sku" | "ean",
    values: Set<string>,
  ): Promise<object[]> {
    if (values.size === 0) {
      return []
    }

    const { data } = await this.query.graph({
      entity: "product_variant",
      fields: [field, "product_id"],
      filters: { [field]: [...values] },
    })
    const rows: unknown[] = data
    return rows.filter(
      (row): row is object =>
        typeof row === "object" && row !== null && !Array.isArray(row),
    )
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
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        continue
      }
      const existingProduct = this.helper.toExistingProduct(raw)
      existingProductsById.set(existingProduct.id, existingProduct)
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
      const parsedCategory = categoryLookupSchema.safeParse(category)
      if (!parsedCategory.success) {
        continue
      }
      const value =
        field === "handle"
          ? parsedCategory.data.handle
          : parsedCategory.data.name
      if (value !== undefined && !map.has(value)) {
        map.set(value, parsedCategory.data.id)
      }
    }

    return map
  }
}
