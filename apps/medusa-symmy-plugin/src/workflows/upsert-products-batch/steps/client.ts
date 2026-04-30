import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  createProductVariantsWorkflow,
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"
import type { ProductInput } from "../types"
import { productBatchClientHelper } from "./client-helper"

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

export type ProductCache = {
  byErpId: Map<string, ExistingProduct>
  bySku: Map<string, ExistingProduct>
  byEan: Map<string, ExistingProduct>
}

export type CreatedProduct = {
  id: string
  variants?: { id: string }[]
}

export type CreateProductPayload = ReturnType<
  typeof productBatchClientHelper.buildCreatePayload
>

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
  private readonly helper = productBatchClientHelper
  private readonly query: Query

  constructor(container: MedusaContainer) {
    this.container = container
    this.query = getQuery(container)
  }

  async preload(products: ProductInput[]): Promise<ProductCache> {
    const { erpIds, skus, eans } =
      this.helper.collectProductIdentifiers(products)
    const fields = PRODUCT_PREFETCH_FIELDS as unknown as string[]
    const [erpProducts, skuVariants, eanVariants] = await Promise.all([
      this.helper.queryProductsByExternalIds(this.query, erpIds, fields),
      this.helper.queryVariantProductRefs(this.query, "sku", skus),
      this.helper.queryVariantProductRefs(this.query, "ean", eans),
    ])

    const { productCache, byErpId } =
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
      productCache,
      [skuToProductId, eanToProductId]
    )
    await this.helper.hydrateMissingProducts(
      this.query,
      productCache,
      missingProductIds,
      fields
    )

    return {
      byErpId,
      bySku: this.helper.buildExistingProductsByIdentifier(
        productCache,
        skuToProductId
      ),
      byEan: this.helper.buildExistingProductsByIdentifier(
        productCache,
        eanToProductId
      ),
    }
  }

  async resolveCategoriesForBatch(
    products: ProductInput[]
  ): Promise<ResolvedCategoryMap> {
    const { handles, names } = this.helper.collectCategoryRefs(products)
    const [byHandle, byName] = await Promise.all([
      this.helper.resolveCategoriesByHandle(this.query, handles),
      this.helper.resolveCategoriesByName(this.query, names),
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

  async createProducts(
    payloads: CreateProductPayload[]
  ): Promise<CreatedProduct[]> {
    if (payloads.length === 0) {
      return []
    }
    const created = await createProductsWorkflow(this.container).run({
      input: { products: payloads as never },
    })
    const createdProducts = (created.result ?? []) as CreatedProduct[]
    if (createdProducts.length === 0) {
      throw new Error("createProductsWorkflow returned empty result")
    }
    return createdProducts
  }

  async updateProductCore(
    productId: string,
    product: ProductInput,
    resolvedCategories: ResolvedCategoryMap
  ): Promise<void> {
    this.helper.validateProductBasePrices(product)
    const categoryIds = this.helper.resolveProductCategoryIds(
      product.categories,
      resolvedCategories
    )
    const update: Record<string, unknown> = {
      title: product.title,
      subtitle: product.subtitle,
      description: product.description,
      handle: product.handle,
      status: product.status ?? "published",
      discountable: product.discountable ?? true,
      weight: product.weight,
      hs_code: product.hs_code,
    }
    if (product.identifier_type === "erp_id" && product.erp_id) {
      update.external_id = product.erp_id
      update.metadata = {
        ...(product.metadata ?? {}),
        erp_id: product.erp_id,
      }
    } else if (product.metadata) {
      update.metadata = product.metadata
    }
    const images = this.helper.buildProductImagesPayload(product.images)
    if (images) {
      update.images = images
    }
    if (categoryIds.length) {
      update.category_ids = categoryIds
    }
    await updateProductsWorkflow(this.container).run({
      input: {
        selector: { id: productId },
        update,
      },
    })
  }

  async upsertVariantsForExistingProduct(
    product: ProductInput,
    existing: ExistingProduct
  ): Promise<string[]> {
    const variants = product.variants ?? []
    if (!variants.length) {
      return existing.variants.map((variant) => variant.id)
    }

    const { toCreate, toUpdate, matchedIds } = this.helper.buildVariantChanges(
      product,
      existing
    )

    for (const item of toUpdate) {
      await updateProductVariantsWorkflow(this.container).run({
        input: {
          selector: { id: item.id },
          update: item.update,
        },
      })
    }
    if (toCreate.length) {
      const created = await createProductVariantsWorkflow(this.container).run({
        input: {
          product_variants: toCreate as never,
        },
      })
      const createdVariants = (created.result ?? []) as { id: string }[]
      for (const variant of createdVariants) {
        matchedIds.push(variant.id)
      }
    }
    return matchedIds
  }
}
