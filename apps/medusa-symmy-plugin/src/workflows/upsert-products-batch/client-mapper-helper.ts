import { MedusaError } from "@medusajs/framework/utils"
import type {
  CreateProductsWorkflowInput,
  UpdateProductsWorkflowInputProducts,
} from "@medusajs/medusa/core-flows"

import type { JsonMetadata } from "../../lib/json-metadata"
import type {
  ExistingProduct,
  ExistingProductIndex,
  ResolvedCategoryMap,
} from "./client"
import { ExistingProductSchema, ProductVariantReferenceSchema } from "./schemas"
import type {
  CategoryRefInput,
  ImageInput,
  PriceInput,
  ProductInput,
  VariantInput,
} from "./types"

interface ExistingVariantIndex {
  byId: Map<string, string>
  bySku: Map<string, string>
  byEan: Map<string, string>
}

interface ProductIdentifierSets {
  erpIds: Set<string>
  skus: Set<string>
  eans: Set<string>
}

interface CategoryRefSets {
  handles: Set<string>
  names: Set<string>
}

const INVALID_MAPPER_RECEIVER_MESSAGE = "Invalid mapper receiver"

const toExistingProduct = (raw: unknown): ExistingProduct => {
  const parsed = ExistingProductSchema.safeParse(raw)
  if (parsed.success) {
    return parsed.data
  }
  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    "Expected existing product query result to match its schema",
  )
}

export class ProductBatchClientMapperHelper {
  readonly toExistingProduct = toExistingProduct

  private get helperInstance(): this {
    return this
  }

  findExistingProduct = (
    product: ProductInput,
    index: ExistingProductIndex,
  ): ExistingProduct | null => {
    if (this.helperInstance !== this) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        INVALID_MAPPER_RECEIVER_MESSAGE,
      )
    }
    if (product.identifier_type === "erp_id" && product.erp_id !== undefined) {
      return index.byErpId.get(product.erp_id) ?? null
    }
    if (product.identifier_type === "sku" && product.sku !== undefined) {
      return index.bySku.get(product.sku) ?? null
    }
    if (product.identifier_type === "ean" && product.ean !== undefined) {
      return index.byEan.get(product.ean) ?? null
    }
    return null
  }

  private readonly buildOptionsDefinition = (
    variants: VariantInput[] | undefined,
  ): { title: string; values: string[] }[] | undefined => {
    if (this.helperInstance !== this) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        INVALID_MAPPER_RECEIVER_MESSAGE,
      )
    }
    if (variants === undefined || variants.length === 0) {
      return undefined
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
    return [...optionMap.entries()].map(([title, values]) => ({
      title,
      values: [...values],
    }))
  }

  private readonly normalizeVariantOptions = (
    variant: VariantInput,
    productOptions: { title: string }[] | undefined,
  ): Record<string, string> => {
    if (this.helperInstance !== this) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        INVALID_MAPPER_RECEIVER_MESSAGE,
      )
    }
    if (productOptions === undefined || productOptions.length === 0) {
      return { Default: "Default" }
    }
    const result: Record<string, string> = {}
    for (const option of productOptions) {
      const raw = variant.options?.[option.title]
      result[option.title] = raw === undefined ? "Default" : String(raw)
    }
    return result
  }

  private readonly normalizePrices = (
    prices: PriceInput[] | undefined,
  ): { amount: number; currency_code: string }[] | undefined => {
    if (this.helperInstance !== this) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        INVALID_MAPPER_RECEIVER_MESSAGE,
      )
    }
    if (prices === undefined || prices.length === 0) {
      return undefined
    }
    return prices.map((price) => ({
      amount: price.amount,
      currency_code: price.currency_code.toLowerCase(),
    }))
  }

  private readonly buildVariantMetadata = (
    variant: VariantInput,
  ): JsonMetadata | undefined => {
    if (this.helperInstance !== this) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        INVALID_MAPPER_RECEIVER_MESSAGE,
      )
    }
    if (variant.vat_rate === undefined && variant.metadata === undefined) {
      return undefined
    }
    return {
      ...variant.metadata,
      ...(variant.vat_rate === undefined ? {} : { vat_rate: variant.vat_rate }),
    }
  }

  private readonly buildExistingVariantIndex = (
    existing: ExistingProduct,
  ): ExistingVariantIndex => {
    if (this.helperInstance !== this) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        INVALID_MAPPER_RECEIVER_MESSAGE,
      )
    }
    const byId = new Map<string, string>()
    const bySku = new Map<string, string>()
    const byEan = new Map<string, string>()

    for (const variant of existing.variants) {
      byId.set(variant.id, variant.id)
      if (variant.sku !== null) {
        bySku.set(variant.sku, variant.id)
      }
      if (variant.ean !== null) {
        byEan.set(variant.ean, variant.id)
      }
    }

    return { byEan, byId, bySku }
  }

  private readonly findExistingVariantId = (
    variant: VariantInput,
    index: ExistingVariantIndex,
  ): string | null => {
    if (this.helperInstance !== this) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        INVALID_MAPPER_RECEIVER_MESSAGE,
      )
    }
    if (variant.identifier_type === "variant_id") {
      return variant.variant_id === undefined
        ? null
        : (index.byId.get(variant.variant_id) ?? null)
    }
    if (variant.identifier_type === "sku" && variant.sku !== undefined) {
      return index.bySku.get(variant.sku) ?? null
    }
    if (variant.identifier_type === "ean" && variant.ean !== undefined) {
      return index.byEan.get(variant.ean) ?? null
    }
    return null
  }

  resolveCategoryIds = (
    refs: CategoryRefInput[] | undefined,
    resolved: ResolvedCategoryMap,
  ): string[] => {
    if (this.helperInstance !== this) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        INVALID_MAPPER_RECEIVER_MESSAGE,
      )
    }
    if (refs === undefined || refs.length === 0) {
      return []
    }
    const ids = new Set<string>()
    for (const ref of refs) {
      let id: string | undefined
      if (ref.handle !== undefined) {
        id = resolved.byHandle.get(ref.handle)
      }
      if (id === undefined && ref.name !== undefined) {
        id = resolved.byName.get(ref.name)
      }
      if (id !== undefined) {
        ids.add(id)
      }
    }
    return [...ids]
  }

  buildImagesPayload = (
    images: ImageInput[] | undefined,
  ): { url: string }[] | undefined => {
    if (this.helperInstance !== this) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        INVALID_MAPPER_RECEIVER_MESSAGE,
      )
    }
    if (images === undefined || images.length === 0) {
      return undefined
    }
    return images.map((image) => ({ url: image.url }))
  }

  buildIdentifierEcho = (product: ProductInput) => ({
    ...this.identifierEchoBase,
    identifier_type: product.identifier_type,
    ...(product.sku === undefined ? {} : { sku: product.sku }),
    ...(product.ean === undefined ? {} : { ean: product.ean }),
    ...(product.erp_id === undefined ? {} : { erp_id: product.erp_id }),
  })

  private readonly identifierEchoBase = {}

  buildCreatePayload(
    product: ProductInput,
    resolvedCategories: ResolvedCategoryMap,
    defaultSalesChannelId: string | null,
  ): CreateProductsWorkflowInput["products"][number] {
    const variants = product.variants ?? []
    const productOptions = this.buildOptionsDefinition(variants)
    const fallbackPrices = this.normalizePrices(product.base_prices)
    const variantPayload = variants.length
      ? variants.map((variant) => {
          const metadata = this.buildVariantMetadata(variant)
          return {
            ...(variant.ean === undefined ? {} : { ean: variant.ean }),
            manage_inventory: variant.manage_inventory ?? true,
            ...(metadata === undefined ? {} : { metadata }),
            options: this.normalizeVariantOptions(variant, productOptions),
            prices:
              this.normalizePrices(variant.prices) ?? fallbackPrices ?? [],
            ...(variant.sku === undefined ? {} : { sku: variant.sku }),
            title: variant.title,
          }
        })
      : [
          {
            manage_inventory: true,
            options: { Default: "Default" },
            prices: fallbackPrices ?? [],
            title: product.title,
          },
        ]

    const categoryIds = this.resolveCategoryIds(
      product.categories,
      resolvedCategories,
    )

    const images = this.buildImagesPayload(product.images)

    return {
      ...(categoryIds.length ? { category_ids: categoryIds } : {}),
      ...(product.description === undefined
        ? {}
        : { description: product.description }),
      discountable: product.discountable ?? true,
      ...(product.identifier_type === "erp_id" && product.erp_id !== undefined
        ? { external_id: product.erp_id }
        : {}),
      ...(product.handle === undefined ? {} : { handle: product.handle }),
      ...(product.hs_code === undefined ? {} : { hs_code: product.hs_code }),
      ...(images === undefined ? {} : { images }),
      metadata: {
        ...product.metadata,
        ...(product.identifier_type === "erp_id" && product.erp_id !== undefined
          ? { erp_id: product.erp_id }
          : {}),
      },
      ...(productOptions === undefined ? {} : { options: productOptions }),
      ...(defaultSalesChannelId === null
        ? {}
        : { sales_channels: [{ id: defaultSalesChannelId }] }),
      status: product.status ?? "published",
      ...(product.subtitle === undefined ? {} : { subtitle: product.subtitle }),
      title: product.title,
      variants: variantPayload,
      ...(product.weight === undefined ? {} : { weight: product.weight }),
    }
  }

  buildUpdatePayload(
    productId: string,
    product: ProductInput,
    existing: ExistingProduct,
    resolvedCategories: ResolvedCategoryMap,
  ): UpdateProductsWorkflowInputProducts["products"][number] {
    const variants = product.variants ?? []
    const productOptions = this.buildOptionsDefinition(variants) ?? [
      { title: "Default", values: ["Default"] },
    ]
    const fallbackPrices = this.normalizePrices(product.base_prices)
    const existingVariantIndex = this.buildExistingVariantIndex(existing)
    const categoryIds = this.resolveCategoryIds(
      product.categories,
      resolvedCategories,
    )
    const images = this.buildImagesPayload(product.images)
    let categoryIdsForUpdate: string[] | undefined

    if (product.categories?.length === 0) {
      categoryIdsForUpdate = []
    } else if (categoryIds.length) {
      categoryIdsForUpdate = categoryIds
    }

    return {
      ...(categoryIdsForUpdate === undefined
        ? {}
        : { category_ids: categoryIdsForUpdate }),
      ...(product.description === undefined
        ? {}
        : { description: product.description }),
      discountable: product.discountable ?? true,
      ...(product.identifier_type === "erp_id" && product.erp_id !== undefined
        ? { external_id: product.erp_id }
        : {}),
      ...(product.handle === undefined ? {} : { handle: product.handle }),
      ...(product.hs_code === undefined ? {} : { hs_code: product.hs_code }),
      id: productId,
      ...(images === undefined ? {} : { images }),
      metadata: {
        ...existing.metadata,
        ...product.metadata,
        ...(product.identifier_type === "erp_id" && product.erp_id !== undefined
          ? { erp_id: product.erp_id }
          : {}),
      },
      status: product.status ?? "published",
      ...(product.subtitle === undefined ? {} : { subtitle: product.subtitle }),
      title: product.title,
      ...(variants.length
        ? {
            variants: variants.map((variant) => {
              const variantId = this.findExistingVariantId(
                variant,
                existingVariantIndex,
              )
              const prices =
                this.normalizePrices(variant.prices) ?? fallbackPrices
              const metadata = this.buildVariantMetadata(variant)
              return {
                ...(variant.ean === undefined ? {} : { ean: variant.ean }),
                ...(variantId === null ? {} : { id: variantId }),
                manage_inventory: variant.manage_inventory ?? true,
                ...(metadata === undefined ? {} : { metadata }),
                ...(variantId === null
                  ? {
                      options: this.normalizeVariantOptions(
                        variant,
                        productOptions,
                      ),
                    }
                  : {}),
                ...(prices === undefined ? {} : { prices }),
                ...(variant.sku === undefined ? {} : { sku: variant.sku }),
                title: variant.title,
              }
            }),
          }
        : {}),
      ...(product.weight === undefined ? {} : { weight: product.weight }),
    }
  }

  collectProductIdentifiers = (
    products: ProductInput[],
  ): ProductIdentifierSets => {
    if (this.helperInstance !== this) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        INVALID_MAPPER_RECEIVER_MESSAGE,
      )
    }
    const erpIds = new Set<string>()
    const skus = new Set<string>()
    const eans = new Set<string>()

    for (const product of products) {
      if (
        product.identifier_type === "erp_id" &&
        product.erp_id !== undefined
      ) {
        erpIds.add(product.erp_id)
      } else if (
        product.identifier_type === "sku" &&
        product.sku !== undefined
      ) {
        skus.add(product.sku)
      } else if (
        product.identifier_type === "ean" &&
        product.ean !== undefined
      ) {
        eans.add(product.ean)
      }
    }

    return { eans, erpIds, skus }
  }

  cacheProductsByErpId(products: readonly unknown[]): {
    existingProductsById: Map<string, ExistingProduct>
    byErpId: Map<string, ExistingProduct>
  } {
    const existingProductsById = new Map<string, ExistingProduct>()
    const byErpId = new Map<string, ExistingProduct>()

    for (const raw of products) {
      const existingProduct = this.toExistingProduct(raw)
      existingProductsById.set(existingProduct.id, existingProduct)
      if (existingProduct.external_id !== null) {
        byErpId.set(existingProduct.external_id, existingProduct)
      }
    }

    return { byErpId, existingProductsById }
  }

  buildProductIdByVariantField = (
    variants: readonly unknown[],
    field: "sku" | "ean",
  ): Map<string, string> => {
    if (this.helperInstance !== this) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        INVALID_MAPPER_RECEIVER_MESSAGE,
      )
    }
    const result = new Map<string, string>()

    for (const variant of variants) {
      const parsed = ProductVariantReferenceSchema.safeParse(variant)
      if (!parsed.success) {
        continue
      }
      const value = parsed.data[field]
      if (value !== null) {
        result.set(value, parsed.data.product_id)
      }
    }

    return result
  }

  collectMissingProductIds = (
    existingProductsById: Map<string, ExistingProduct>,
    productIdMaps: Map<string, string>[],
  ): Set<string> => {
    if (this.helperInstance !== this) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        INVALID_MAPPER_RECEIVER_MESSAGE,
      )
    }
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

  buildExistingProductsByIdentifier = (
    existingProductsById: Map<string, ExistingProduct>,
    identifierToProductId: Map<string, string>,
  ): Map<string, ExistingProduct> => {
    if (this.helperInstance !== this) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        INVALID_MAPPER_RECEIVER_MESSAGE,
      )
    }
    const result = new Map<string, ExistingProduct>()

    for (const [identifier, productId] of identifierToProductId) {
      const product = existingProductsById.get(productId)
      if (product) {
        result.set(identifier, product)
      }
    }

    return result
  }

  collectCategoryRefs = (products: ProductInput[]): CategoryRefSets => {
    if (this.helperInstance !== this) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        INVALID_MAPPER_RECEIVER_MESSAGE,
      )
    }
    const handles = new Set<string>()
    const names = new Set<string>()

    for (const product of products) {
      for (const ref of product.categories ?? []) {
        if (ref.handle !== undefined) {
          handles.add(ref.handle)
        } else if (ref.name !== undefined) {
          names.add(ref.name)
        }
      }
    }

    return { handles, names }
  }
}

export const productBatchClientMapperHelper =
  new ProductBatchClientMapperHelper()
