import type {
  ExistingProduct,
  ExistingProductIndex,
  ResolvedCategoryMap,
} from "./client"
import type {
  CategoryRefInput,
  ImageInput,
  PriceInput,
  ProductInput,
  VariantInput,
} from "./types"

type ExistingVariantIndex = {
  byId: Map<string, string>
  bySku: Map<string, string>
  byEan: Map<string, string>
}

type RawExistingProduct = {
  id: string
  external_id?: string | null
  metadata?: Record<string, unknown> | null
  variants?: { id: string; sku?: string | null; ean?: string | null }[]
}

type ProductIdentifierSets = {
  erpIds: Set<string>
  skus: Set<string>
  eans: Set<string>
}

type CategoryRefSets = {
  handles: Set<string>
  names: Set<string>
}

export class ProductBatchClientMapperHelper {
  toExistingProduct(
    raw: RawExistingProduct | Record<string, unknown>
  ): ExistingProduct {
    const product = raw as RawExistingProduct
    return {
      id: product.id,
      external_id: product.external_id ?? null,
      metadata: (product.metadata ?? null) as Record<string, unknown> | null,
      variants: (product.variants ?? []).map((variant) => ({
        id: variant.id,
        sku: variant.sku ?? null,
        ean: variant.ean ?? null,
      })),
    }
  }

  findExistingProduct(
    product: ProductInput,
    index: ExistingProductIndex
  ): ExistingProduct | null {
    if (product.identifier_type === "erp_id" && product.erp_id) {
      return index.byErpId.get(product.erp_id) ?? null
    }
    if (product.identifier_type === "sku" && product.sku) {
      return index.bySku.get(product.sku) ?? null
    }
    if (product.identifier_type === "ean" && product.ean) {
      return index.byEan.get(product.ean) ?? null
    }
    return null
  }

  private buildOptionsDefinition(
    variants: VariantInput[] | undefined
  ): { title: string; values: string[] }[] | undefined {
    if (!variants?.length) {
      return
    }
    const optionMap = new Map<string, Set<string>>()
    for (const variant of variants) {
      if (!variant.options) {
        continue
      }
      for (const [key, rawValue] of Object.entries(variant.options)) {
        const value = String(rawValue)
        const set = optionMap.get(key) ?? new Set<string>()
        set.add(value)
        optionMap.set(key, set)
      }
    }
    if (optionMap.size === 0) {
      return [{ title: "Default", values: ["Default"] }]
    }
    return Array.from(optionMap.entries()).map(([title, values]) => ({
      title,
      values: Array.from(values),
    }))
  }

  private normalizeVariantOptions(
    variant: VariantInput,
    productOptions: { title: string }[] | undefined
  ): Record<string, string> {
    if (!productOptions?.length) {
      return { Default: "Default" }
    }
    const result: Record<string, string> = {}
    for (const option of productOptions) {
      const raw = variant.options?.[option.title]
      result[option.title] = raw === undefined ? "Default" : String(raw)
    }
    return result
  }

  private normalizePrices(prices: PriceInput[] | undefined) {
    if (!prices?.length) {
      return
    }
    return prices.map((price) => ({
      currency_code: price.currency_code.toLowerCase(),
      amount: price.amount,
    }))
  }

  private buildVariantMetadata(variant: VariantInput) {
    if (variant.vat_rate === undefined && !variant.metadata) {
      return
    }
    return {
      ...(variant.metadata ?? {}),
      ...(variant.vat_rate !== undefined ? { vat_rate: variant.vat_rate } : {}),
    }
  }

  private buildExistingVariantIndex(
    existing: ExistingProduct
  ): ExistingVariantIndex {
    const byId = new Map<string, string>()
    const bySku = new Map<string, string>()
    const byEan = new Map<string, string>()

    for (const variant of existing.variants) {
      byId.set(variant.id, variant.id)
      if (variant.sku) {
        bySku.set(variant.sku, variant.id)
      }
      if (variant.ean) {
        byEan.set(variant.ean, variant.id)
      }
    }

    return { byId, bySku, byEan }
  }

  private findExistingVariantId(
    variant: VariantInput,
    index: ExistingVariantIndex
  ): string | null {
    if (variant.identifier_type === "variant_id") {
      return variant.variant_id
        ? (index.byId.get(variant.variant_id) ?? null)
        : null
    }
    if (variant.identifier_type === "sku" && variant.sku) {
      return index.bySku.get(variant.sku) ?? null
    }
    if (variant.identifier_type === "ean" && variant.ean) {
      return index.byEan.get(variant.ean) ?? null
    }
    return null
  }

  resolveCategoryIds(
    refs: CategoryRefInput[] | undefined,
    resolved: ResolvedCategoryMap
  ): string[] {
    if (!refs?.length) {
      return []
    }
    const ids = new Set<string>()
    for (const ref of refs) {
      let id: string | undefined
      if (ref.handle) {
        id = resolved.byHandle.get(ref.handle)
      }
      if (!id && ref.name) {
        id = resolved.byName.get(ref.name)
      }
      if (id) {
        ids.add(id)
      }
    }
    return Array.from(ids)
  }

  buildImagesPayload(images: ImageInput[] | undefined) {
    if (!images?.length) {
      return
    }
    return images.map((image) => ({ url: image.url }))
  }

  private buildCategoryAssociations(categoryIds: string[]) {
    if (!categoryIds.length) {
      return
    }
    return categoryIds.map((id) => ({ id }))
  }

  buildIdentifierEcho(product: ProductInput) {
    return {
      identifier_type: product.identifier_type,
      ...(product.sku ? { sku: product.sku } : {}),
      ...(product.ean ? { ean: product.ean } : {}),
      ...(product.erp_id ? { erp_id: product.erp_id } : {}),
    }
  }

  buildCreatePayload(
    product: ProductInput,
    resolvedCategories: ResolvedCategoryMap,
    defaultSalesChannelId: string | null
  ) {
    const variants = product.variants ?? []
    const productOptions = this.buildOptionsDefinition(variants)
    const fallbackPrices = this.normalizePrices(product.base_prices)
    const variantPayload = variants.length
      ? variants.map((variant) => ({
          title: variant.title,
          sku: variant.sku,
          ean: variant.ean,
          manage_inventory: variant.manage_inventory ?? true,
          prices: this.normalizePrices(variant.prices) ?? fallbackPrices ?? [],
          options: this.normalizeVariantOptions(variant, productOptions),
          metadata: this.buildVariantMetadata(variant),
        }))
      : [
          {
            title: product.title,
            manage_inventory: true,
            prices: fallbackPrices ?? [],
            options: { Default: "Default" },
          },
        ]

    const categoryIds = this.resolveCategoryIds(
      product.categories,
      resolvedCategories
    )

    return {
      title: product.title,
      subtitle: product.subtitle,
      description: product.description,
      handle: product.handle,
      status: product.status ?? "published",
      discountable: product.discountable ?? true,
      weight: product.weight,
      hs_code: product.hs_code,
      external_id:
        product.identifier_type === "erp_id" ? product.erp_id : undefined,
      options: productOptions,
      images: this.buildImagesPayload(product.images),
      metadata: {
        ...(product.metadata ?? {}),
        ...(product.identifier_type === "erp_id" && product.erp_id
          ? { erp_id: product.erp_id }
          : {}),
      },
      variants: variantPayload,
      sales_channels: defaultSalesChannelId
        ? [{ id: defaultSalesChannelId }]
        : undefined,
      categories: this.buildCategoryAssociations(categoryIds),
    }
  }

  buildUpdatePayload(
    productId: string,
    product: ProductInput,
    existing: ExistingProduct,
    resolvedCategories: ResolvedCategoryMap
  ) {
    const variants = product.variants ?? []
    const productOptions = this.buildOptionsDefinition(variants) ?? [
      { title: "Default", values: ["Default"] },
    ]
    const fallbackPrices = this.normalizePrices(product.base_prices)
    const existingVariantIndex = this.buildExistingVariantIndex(existing)
    const categoryIds = this.resolveCategoryIds(
      product.categories,
      resolvedCategories
    )
    const images = this.buildImagesPayload(product.images)

    return {
      id: productId,
      title: product.title,
      subtitle: product.subtitle,
      description: product.description,
      handle: product.handle,
      status: product.status ?? "published",
      discountable: product.discountable ?? true,
      weight: product.weight,
      hs_code: product.hs_code,
      external_id:
        product.identifier_type === "erp_id" ? product.erp_id : undefined,
      images,
      metadata: {
        ...(existing.metadata ?? {}),
        ...(product.metadata ?? {}),
        ...(product.identifier_type === "erp_id" && product.erp_id
          ? { erp_id: product.erp_id }
          : {}),
      },
      variants: variants.length
        ? variants.map((variant) => {
            const variantId = this.findExistingVariantId(
              variant,
              existingVariantIndex
            )
            return {
              ...(variantId ? { id: variantId } : {}),
              title: variant.title,
              sku: variant.sku,
              ean: variant.ean,
              manage_inventory: variant.manage_inventory ?? true,
              prices: this.normalizePrices(variant.prices) ?? fallbackPrices,
              ...(variantId
                ? {}
                : {
                    options: this.normalizeVariantOptions(
                      variant,
                      productOptions
                    ),
                  }),
              metadata: this.buildVariantMetadata(variant),
            }
        })
        : undefined,
      categories: this.buildCategoryAssociations(categoryIds),
    }
  }

  collectProductIdentifiers(products: ProductInput[]): ProductIdentifierSets {
    const erpIds = new Set<string>()
    const skus = new Set<string>()
    const eans = new Set<string>()

    for (const product of products) {
      if (product.identifier_type === "erp_id" && product.erp_id) {
        erpIds.add(product.erp_id)
      } else if (product.identifier_type === "sku" && product.sku) {
        skus.add(product.sku)
      } else if (product.identifier_type === "ean" && product.ean) {
        eans.add(product.ean)
      }
    }

    return { erpIds, skus, eans }
  }

  cacheProductsByErpId(products: Record<string, unknown>[]): {
    existingProductsById: Map<string, ExistingProduct>
    byErpId: Map<string, ExistingProduct>
  } {
    const existingProductsById = new Map<string, ExistingProduct>()
    const byErpId = new Map<string, ExistingProduct>()

    for (const raw of products) {
      const existingProduct = this.toExistingProduct(raw)
      existingProductsById.set(existingProduct.id, existingProduct)
      if (existingProduct.external_id) {
        byErpId.set(existingProduct.external_id, existingProduct)
      }
    }

    return { existingProductsById, byErpId }
  }

  buildProductIdByVariantField(
    variants: Record<string, unknown>[],
    field: "sku" | "ean"
  ): Map<string, string> {
    const result = new Map<string, string>()

    for (const variant of variants) {
      const value = variant[field]
      const productId = variant.product_id
      if (typeof value === "string" && typeof productId === "string") {
        result.set(value, productId)
      }
    }

    return result
  }

  collectMissingProductIds(
    existingProductsById: Map<string, ExistingProduct>,
    productIdMaps: Map<string, string>[]
  ): Set<string> {
    const missingProductIds = new Set<string>()

    for (const productIdMap of productIdMaps) {
      for (const id of productIdMap.values()) {
        if (!existingProductsById.has(id)) {
          missingProductIds.add(id)
        }
      }
    }

    return missingProductIds
  }

  buildExistingProductsByIdentifier(
    existingProductsById: Map<string, ExistingProduct>,
    identifierToProductId: Map<string, string>
  ): Map<string, ExistingProduct> {
    const result = new Map<string, ExistingProduct>()

    for (const [identifier, productId] of identifierToProductId) {
      const product = existingProductsById.get(productId)
      if (product) {
        result.set(identifier, product)
      }
    }

    return result
  }

  collectCategoryRefs(products: ProductInput[]): CategoryRefSets {
    const handles = new Set<string>()
    const names = new Set<string>()

    for (const product of products) {
      for (const ref of product.categories ?? []) {
        if (ref.handle) {
          handles.add(ref.handle)
        } else if (ref.name) {
          names.add(ref.name)
        }
      }
    }

    return { handles, names }
  }
}

export const productBatchClientMapperHelper =
  new ProductBatchClientMapperHelper()
