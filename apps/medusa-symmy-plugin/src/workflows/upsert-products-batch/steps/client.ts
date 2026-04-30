import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  createProductVariantsWorkflow,
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"
import type {
  CategoryRefInput,
  ImageInput,
  PriceInput,
  ProductInput,
  VariantInput,
} from "../types"

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

const PRODUCT_PREFETCH_FIELDS = [
  "id",
  "external_id",
  "metadata",
  "variants.id",
  "variants.sku",
  "variants.ean",
] as const

const toExistingProduct = (raw: {
  id: string
  external_id?: string | null
  metadata?: Record<string, unknown> | null
  variants?: { id: string; sku?: string | null; ean?: string | null }[]
}): ExistingProduct => ({
  id: raw.id,
  external_id: raw.external_id ?? null,
  metadata: (raw.metadata ?? null) as Record<string, unknown> | null,
  variants: (raw.variants ?? []).map((variant) => ({
    id: variant.id,
    sku: variant.sku ?? null,
    ean: variant.ean ?? null,
  })),
})

export const findExistingProduct = (
  product: ProductInput,
  cache: ProductCache
): ExistingProduct | null => {
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

const PRICE_DECIMAL_REGEX = /^\d+(\.\d+)?$/

const getQuery = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.QUERY)

type Query = ReturnType<typeof getQuery>

export const buildOptionsDefinition = (
  variants: VariantInput[] | undefined
): { title: string; values: string[] }[] | undefined => {
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

export const normalizeVariantOptions = (
  variant: VariantInput,
  productOptions: { title: string }[] | undefined
): Record<string, string> => {
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

export const normalizePrices = (prices: PriceInput[] | undefined) => {
  if (!prices?.length) {
    return
  }
  return prices.map((price) => ({
    currency_code: price.currency_code.toLowerCase(),
    amount: price.amount,
  }))
}

export const buildVariantMetadata = (variant: VariantInput) => {
  if (variant.vat_rate === undefined && !variant.metadata) {
    return
  }
  return {
    ...(variant.metadata ?? {}),
    ...(variant.vat_rate !== undefined ? { vat_rate: variant.vat_rate } : {}),
  }
}

export const findExistingVariantId = (
  variant: VariantInput,
  existing: ExistingProduct
): string | null => {
  if (variant.identifier_type === "variant_id") {
    const match = existing.variants.find(
      (current) => current.id === variant.variant_id
    )
    return match?.id ?? null
  }
  if (variant.identifier_type === "sku" && variant.sku) {
    const match = existing.variants.find(
      (current) => current.sku === variant.sku
    )
    return match?.id ?? null
  }
  if (variant.identifier_type === "ean" && variant.ean) {
    const match = existing.variants.find(
      (current) => current.ean === variant.ean
    )
    return match?.id ?? null
  }
  return null
}

export const resolveCategoryIds = (
  refs: CategoryRefInput[] | undefined,
  resolved: ResolvedCategoryMap
): string[] => {
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

export const buildImagesPayload = (images: ImageInput[] | undefined) => {
  if (!images?.length) {
    return
  }
  return images.map((image) => ({ url: image.url }))
}

export const buildIdentifierEcho = (product: ProductInput) => ({
  identifier_type: product.identifier_type,
  ...(product.sku ? { sku: product.sku } : {}),
  ...(product.ean ? { ean: product.ean } : {}),
  ...(product.erp_id ? { erp_id: product.erp_id } : {}),
})

export const validatePrices = (
  prices: PriceInput[] | undefined,
  label: string
) => {
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

export const buildCreatePayload = (
  product: ProductInput,
  resolvedCategories: ResolvedCategoryMap,
  defaultSalesChannelId: string | null
) => {
  const variants = product.variants ?? []
  const productOptions = buildOptionsDefinition(variants)
  validatePrices(product.base_prices, "base")
  for (const variant of variants) {
    validatePrices(variant.prices, `variant '${variant.title}'`)
  }
  const fallbackPrices = normalizePrices(product.base_prices)
  const variantPayload = variants.length
    ? variants.map((variant) => ({
        title: variant.title,
        sku: variant.sku,
        ean: variant.ean,
        manage_inventory: variant.manage_inventory ?? true,
        prices: normalizePrices(variant.prices) ?? fallbackPrices ?? [],
        options: normalizeVariantOptions(variant, productOptions),
        metadata: buildVariantMetadata(variant),
      }))
    : [
        {
          title: product.title,
          manage_inventory: true,
          prices: fallbackPrices ?? [],
          options: { Default: "Default" },
        },
      ]

  const categoryIds = resolveCategoryIds(product.categories, resolvedCategories)

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
    images: buildImagesPayload(product.images),
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

export class ProductBatchClient {
  private readonly query: Query

  constructor(private readonly container: MedusaContainer) {
    this.query = getQuery(container)
  }

  async preload(products: ProductInput[]): Promise<ProductCache> {
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

    const fields = PRODUCT_PREFETCH_FIELDS as unknown as string[]

    const [erpProducts, skuVariants, eanVariants] = await Promise.all([
      erpIds.size > 0
        ? this.query
            .graph({
              entity: "product",
              fields,
              filters: { external_id: Array.from(erpIds) },
            })
            .then((r) => r.data)
        : Promise.resolve([] as Record<string, unknown>[]),
      skus.size > 0
        ? this.query
            .graph({
              entity: "product_variant",
              fields: ["sku", "product_id"],
              filters: { sku: Array.from(skus) },
            })
            .then((r) => r.data)
        : Promise.resolve([] as Record<string, unknown>[]),
      eans.size > 0
        ? this.query
            .graph({
              entity: "product_variant",
              fields: ["ean", "product_id"],
              filters: { ean: Array.from(eans) },
            })
            .then((r) => r.data)
        : Promise.resolve([] as Record<string, unknown>[]),
    ])

    const productCache = new Map<string, ExistingProduct>()
    const byErpId = new Map<string, ExistingProduct>()

    for (const raw of erpProducts) {
      const ep = toExistingProduct(
        raw as Parameters<typeof toExistingProduct>[0]
      )
      productCache.set(ep.id, ep)
      if (ep.external_id) {
        byErpId.set(ep.external_id, ep)
      }
    }

    const skuToProductId = new Map<string, string>()
    for (const variant of skuVariants as {
      sku?: string
      product_id?: string
    }[]) {
      if (variant.sku && variant.product_id) {
        skuToProductId.set(variant.sku, variant.product_id)
      }
    }

    const eanToProductId = new Map<string, string>()
    for (const variant of eanVariants as {
      ean?: string
      product_id?: string
    }[]) {
      if (variant.ean && variant.product_id) {
        eanToProductId.set(variant.ean, variant.product_id)
      }
    }

    const missingProductIds = new Set<string>()
    for (const id of skuToProductId.values()) {
      if (!productCache.has(id)) missingProductIds.add(id)
    }
    for (const id of eanToProductId.values()) {
      if (!productCache.has(id)) missingProductIds.add(id)
    }

    if (missingProductIds.size > 0) {
      const { data } = await this.query.graph({
        entity: "product",
        fields,
        filters: { id: Array.from(missingProductIds) },
      })
      for (const raw of data) {
        const ep = toExistingProduct(
          raw as Parameters<typeof toExistingProduct>[0]
        )
        productCache.set(ep.id, ep)
      }
    }

    const bySku = new Map<string, ExistingProduct>()
    const byEan = new Map<string, ExistingProduct>()
    for (const [sku, productId] of skuToProductId) {
      const product = productCache.get(productId)
      if (product) bySku.set(sku, product)
    }
    for (const [ean, productId] of eanToProductId) {
      const product = productCache.get(productId)
      if (product) byEan.set(ean, product)
    }

    return { byErpId, bySku, byEan }
  }

  async resolveCategoriesForBatch(
    products: ProductInput[]
  ): Promise<ResolvedCategoryMap> {
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
    const byHandle = new Map<string, string>()
    const byName = new Map<string, string>()
    if (handles.size === 0 && names.size === 0) {
      return { byHandle, byName }
    }
    if (handles.size > 0) {
      const { data } = await this.query.graph({
        entity: "product_category",
        fields: ["id", "handle"],
        filters: { handle: Array.from(handles) },
      })
      for (const category of data) {
        if (category.handle) {
          byHandle.set(category.handle, category.id)
        }
      }
    }
    if (names.size > 0) {
      const { data } = await this.query.graph({
        entity: "product_category",
        fields: ["id", "name"],
        filters: { name: Array.from(names) },
      })
      for (const category of data) {
        if (category.name && !byName.has(category.name)) {
          byName.set(category.name, category.id)
        }
      }
    }
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

  async createProduct(
    payload: ReturnType<typeof buildCreatePayload>
  ): Promise<CreatedProduct> {
    const created = await createProductsWorkflow(this.container).run({
      input: { products: [payload as never] },
    })
    const createdProducts = (created.result ?? []) as CreatedProduct[]
    const createdProduct = createdProducts[0]
    if (!createdProduct) {
      throw new Error("createProductsWorkflow returned empty result")
    }
    return createdProduct
  }

  async updateProductCore(
    productId: string,
    product: ProductInput,
    resolvedCategories: ResolvedCategoryMap
  ): Promise<void> {
    validatePrices(product.base_prices, "base")
    const categoryIds = resolveCategoryIds(
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
    const images = buildImagesPayload(product.images)
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

    const fallbackPrices = normalizePrices(product.base_prices)
    const toCreate: Record<string, unknown>[] = []
    const toUpdate: { id: string; update: Record<string, unknown> }[] = []
    const matchedIds: string[] = []

    for (const variant of variants) {
      validatePrices(variant.prices, `variant '${variant.title}'`)
      const existingVariantId = findExistingVariantId(variant, existing)
      const prices = normalizePrices(variant.prices) ?? fallbackPrices
      const metadata = buildVariantMetadata(variant)
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
      } else {
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
    }

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
