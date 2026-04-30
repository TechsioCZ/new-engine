import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { batchProductsWorkflow } from "@medusajs/medusa/core-flows"
import type { ProductInput } from "../types"
import { productBatchClientMapperHelper } from "./client-mapper-helper"

export type ResolvedCategoryMap = {
  byHandle: Map<string, string>
  byName: Map<string, string>
}

export type ExistingProduct = {
  id: string
  external_id: string | null
  metadata: Record<string, unknown> | null
  variants: { id: string; sku: string | null; ean: string | null }[]
}

export type ExistingProductIndex = {
  byErpId: Map<string, ExistingProduct>
  bySku: Map<string, ExistingProduct>
  byEan: Map<string, ExistingProduct>
}

export type CreatedProduct = {
  id: string
  variants?: { id: string }[]
}

export type CreateProductPayload = ReturnType<
  typeof productBatchClientMapperHelper.buildCreatePayload
>
export type UpdateProductPayload = ReturnType<
  typeof productBatchClientMapperHelper.buildUpdatePayload
>

export type ProductBatchPayload = {
  create: CreateProductPayload[]
  update: UpdateProductPayload[]
}

export type ProductBatchApplyResult = {
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
    const fields = PRODUCT_PREFETCH_FIELDS as unknown as string[]
    const [erpProducts, skuVariants, eanVariants] = await Promise.all([
      this.queryProductsByExternalIds(erpIds, fields),
      this.queryVariantProductRefs("sku", skus),
      this.queryVariantProductRefs("ean", eans),
    ])

    const { existingProductsById, byErpId } =
      this.helper.cacheProductsByErpId(erpProducts)
    const skuToProductId = this.helper.buildProductIdByVariantField(
      skuVariants,
      "sku"
    )
    const eanToProductId = this.helper.buildProductIdByVariantField(
      eanVariants,
      "ean"
    )
    const missingProductIds = this.helper.collectMissingProductIds(
      existingProductsById,
      [skuToProductId, eanToProductId]
    )
    await this.hydrateMissingProducts(
      existingProductsById,
      missingProductIds,
      fields
    )

    return {
      byErpId,
      bySku: this.helper.buildExistingProductsByIdentifier(
        existingProductsById,
        skuToProductId
      ),
      byEan: this.helper.buildExistingProductsByIdentifier(
        existingProductsById,
        eanToProductId
      ),
    }
  }

  async resolveCategoriesForBatch(
    products: ProductInput[]
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
    const defaultId = stores[0]?.default_sales_channel_id
    if (defaultId) {
      return defaultId
    }
    const { data: salesChannels } = await this.query.graph({
      entity: "sales_channel",
      fields: ["id"],
      pagination: { take: 1 },
    })
    return salesChannels[0]?.id ?? null
  }

  async applyBatch(
    payload: ProductBatchPayload
  ): Promise<ProductBatchApplyResult> {
    if (!(payload.create.length || payload.update.length)) {
      return { created: [], updated: [] }
    }
    const { result } = await batchProductsWorkflow(this.container).run({
      input: {
        create: payload.create as never,
        update: payload.update as never,
      },
    })

    return {
      created: (result?.created ?? []) as CreatedProduct[],
      updated: (result?.updated ?? []) as CreatedProduct[],
    }
  }

  private async queryProductsByExternalIds(
    erpIds: Set<string>,
    fields: string[]
  ) {
    if (erpIds.size === 0) {
      return [] as Record<string, unknown>[]
    }

    const { data } = await this.query.graph({
      entity: "product",
      fields,
      filters: { external_id: Array.from(erpIds) },
    })
    return data
  }

  private async queryVariantProductRefs(
    field: "sku" | "ean",
    values: Set<string>
  ) {
    if (values.size === 0) {
      return [] as Record<string, unknown>[]
    }

    const { data } = await this.query.graph({
      entity: "product_variant",
      fields: [field, "product_id"],
      filters: { [field]: Array.from(values) },
    })
    return data
  }

  private async hydrateMissingProducts(
    existingProductsById: Map<string, ExistingProduct>,
    missingProductIds: Set<string>,
    fields: string[]
  ) {
    if (missingProductIds.size === 0) {
      return
    }

    const { data } = await this.query.graph({
      entity: "product",
      fields,
      filters: { id: Array.from(missingProductIds) },
    })
    for (const raw of data) {
      const existingProduct = this.helper.toExistingProduct(
        raw as Record<string, unknown>
      )
      existingProductsById.set(existingProduct.id, existingProduct)
    }
  }

  private async resolveCategoriesByField(
    field: "handle" | "name",
    values: Set<string>
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    if (values.size === 0) {
      return map
    }

    const { data } = await this.query.graph({
      entity: "product_category",
      fields: ["id", field],
      filters: { [field]: Array.from(values) },
    })

    for (const category of data) {
      const value = category[field] as string | null | undefined
      if (value && !map.has(value)) {
        map.set(value, category.id)
      }
    }

    return map
  }
}
