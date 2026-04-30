import type {
  CategoryRefInput,
  ImageInput,
  PriceInput,
  ProductInput,
  VariantInput,
} from "../types"
import type {
  ExistingProduct,
  ProductCache,
  Query,
  ResolvedCategoryMap,
} from "./client"

const PRICE_DECIMAL_REGEX = /^\d+(\.\d+)?$/

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

type VariantChanges = {
  toCreate: Record<string, unknown>[]
  toUpdate: { id: string; update: Record<string, unknown> }[]
  matchedIds: string[]
}

export class ProductBatchClientHelper {
  private toExistingProduct(raw: RawExistingProduct): ExistingProduct {
    return {
      id: raw.id,
      external_id: raw.external_id ?? null,
      metadata: (raw.metadata ?? null) as Record<string, unknown> | null,
      variants: (raw.variants ?? []).map((variant) => ({
        id: variant.id,
        sku: variant.sku ?? null,
        ean: variant.ean ?? null,
      })),
    }
  }

  findExistingProduct(
    product: ProductInput,
    cache: ProductCache
  ): ExistingProduct | null {
    if (product.identifier_type === "erp_id" && product.erp_id) {
      return cache.byErpId.get(product.erp_id) ?? null
    }
    if (product.identifier_type === "sku" && product.sku) {
      return cache.bySku.get(product.sku) ?? null
    }
    if (product.identifier_type === "ean" && product.ean) {
      return cache.byEan.get(product.ean) ?? null
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

  buildIdentifierEcho(product: ProductInput) {
    return {
      identifier_type: product.identifier_type,
      ...(product.sku ? { sku: product.sku } : {}),
      ...(product.ean ? { ean: product.ean } : {}),
      ...(product.erp_id ? { erp_id: product.erp_id } : {}),
    }
  }

  validatePrices(prices: PriceInput[] | undefined, label: string) {
    if (!prices?.length) {
      return
    }
    for (const price of prices) {
      if (
        Number.isNaN(price.amount) ||
        !PRICE_DECIMAL_REGEX.test(price.amount.toString())
      ) {
        throw new Error(
          `Invalid ${label} price amount '${price.amount}' for currency '${price.currency_code}'`
        )
      }
    }
  }

  buildCreatePayload(
    product: ProductInput,
    resolvedCategories: ResolvedCategoryMap,
    defaultSalesChannelId: string | null
  ) {
    const variants = product.variants ?? []
    const productOptions = this.buildOptionsDefinition(variants)
    this.validatePrices(product.base_prices, "base")
    for (const variant of variants) {
      this.validatePrices(variant.prices, `variant '${variant.title}'`)
    }
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
      category_ids: categoryIds.length ? categoryIds : undefined,
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

  async queryProductsByExternalIds(
    query: Query,
    erpIds: Set<string>,
    fields: string[]
  ) {
    if (erpIds.size === 0) {
      return [] as Record<string, unknown>[]
    }

    const { data } = await query.graph({
      entity: "product",
      fields,
      filters: { external_id: Array.from(erpIds) },
    })
    return data
  }

  async queryVariantProductRefs(
    query: Query,
    field: "sku" | "ean",
    values: Set<string>
  ) {
    if (values.size === 0) {
      return [] as Record<string, unknown>[]
    }

    const { data } = await query.graph({
      entity: "product_variant",
      fields: [field, "product_id"],
      filters: { [field]: Array.from(values) },
    })
    return data
  }

  cacheProductsByErpId(products: Record<string, unknown>[]): {
    productCache: Map<string, ExistingProduct>
    byErpId: Map<string, ExistingProduct>
  } {
    const productCache = new Map<string, ExistingProduct>()
    const byErpId = new Map<string, ExistingProduct>()

    for (const raw of products) {
      const existingProduct = this.toExistingProduct(raw as RawExistingProduct)
      productCache.set(existingProduct.id, existingProduct)
      if (existingProduct.external_id) {
        byErpId.set(existingProduct.external_id, existingProduct)
      }
    }

    return { productCache, byErpId }
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
    productCache: Map<string, ExistingProduct>,
    productIdMaps: Map<string, string>[]
  ): Set<string> {
    const missingProductIds = new Set<string>()

    for (const productIdMap of productIdMaps) {
      for (const id of productIdMap.values()) {
        if (!productCache.has(id)) {
          missingProductIds.add(id)
        }
      }
    }

    return missingProductIds
  }

  async hydrateMissingProducts(
    query: Query,
    productCache: Map<string, ExistingProduct>,
    missingProductIds: Set<string>,
    fields: string[]
  ) {
    if (missingProductIds.size === 0) {
      return
    }

    const { data } = await query.graph({
      entity: "product",
      fields,
      filters: { id: Array.from(missingProductIds) },
    })
    for (const raw of data) {
      const existingProduct = this.toExistingProduct(raw as RawExistingProduct)
      productCache.set(existingProduct.id, existingProduct)
    }
  }

  buildExistingProductsByIdentifier(
    productCache: Map<string, ExistingProduct>,
    identifierToProductId: Map<string, string>
  ): Map<string, ExistingProduct> {
    const result = new Map<string, ExistingProduct>()

    for (const [identifier, productId] of identifierToProductId) {
      const product = productCache.get(productId)
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

  async resolveCategoriesByField(
    query: Query,
    field: "handle" | "name",
    values: Set<string>
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    if (values.size === 0) {
      return map
    }

    const { data } = await query.graph({
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

  buildVariantChanges(
    product: ProductInput,
    existing: ExistingProduct
  ): VariantChanges {
    const fallbackPrices = this.normalizePrices(product.base_prices)
    const existingVariantIndex = this.buildExistingVariantIndex(existing)
    const toCreate: Record<string, unknown>[] = []
    const toUpdate: { id: string; update: Record<string, unknown> }[] = []
    const matchedIds: string[] = []

    for (const variant of product.variants ?? []) {
      this.validatePrices(variant.prices, `variant '${variant.title}'`)
      const existingVariantId = this.findExistingVariantId(
        variant,
        existingVariantIndex
      )
      const prices = this.normalizePrices(variant.prices) ?? fallbackPrices
      const metadata = this.buildVariantMetadata(variant)
      if (existingVariantId) {
        matchedIds.push(existingVariantId)
        const update: Record<string, unknown> = {
          title: variant.title,
          sku: variant.sku,
          ean: variant.ean,
          manage_inventory: variant.manage_inventory ?? true,
        }
        if (prices) {
          update.prices = prices
        }
        if (metadata) {
          update.metadata = metadata
        }
        toUpdate.push({ id: existingVariantId, update })
        continue
      }

      toCreate.push({
        product_id: existing.id,
        title: variant.title,
        sku: variant.sku,
        ean: variant.ean,
        manage_inventory: variant.manage_inventory ?? true,
        prices: prices ?? [],
        options: { Default: "Default" },
        metadata,
      })
    }

    return { toCreate, toUpdate, matchedIds }
  }
}

export const productBatchClientHelper = new ProductBatchClientHelper()
