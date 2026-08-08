import type {
  IFulfillmentModuleService,
  IProductModuleService,
  ISalesChannelModuleService,
  Logger,
  MedusaContainer,
  ProductDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  kebabCase,
  MedusaError,
  Modules,
  ProductStatus,
  toHandle,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  batchProductsWorkflow,
  batchVariantImagesWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import type {
  BatchVariantImagesWorkflowInput,
  ProcessProductOptionsForImportInput,
} from "@medusajs/medusa/core-flows"

import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/service"
import {
  createBrandsWorkflow,
  restoreBrandsWorkflow,
  setProductBrandsWorkflow,
  updateBrandsWorkflow,
  validateBrandGpsrState,
} from "../../brand"
import type { BrandInput, BrandScalarWriteInput } from "../../brand"

export interface SeedProductAttributeInput {
  input_type: "select" | "text"
  is_public: boolean
  key: string
  label: string
  option?:
    | {
        key?: string | undefined
        label: string
      }
    | null
    | undefined
  text_value?: string | null | undefined
}

export interface SeedMeasurementUnitInput {
  base_quantity: number
  code: string
  description?: null | string | undefined
  name: string
  symbol: string
}

export interface SeedVariantMeasurementInput {
  product_unit_quantity: number
}

export interface SeedProductMeasurementInput {
  unit: SeedMeasurementUnitInput
}

export interface ProductInput {
  title: string
  categories: {
    name?: string | undefined
    handle: string
  }[]
  description: string
  handle: string
  weight?: number | undefined
  status?: ProductStatus | undefined
  metadata?: Record<string, unknown> | undefined
  shippingProfileName: string
  thumbnail?: string | undefined
  images: {
    url: string
  }[]
  options?:
    | {
        title: string
        values: string[]
      }[]
    | undefined
  brand?:
    | {
        title?: string | undefined
        attributes?:
          | {
              name: string
              value: string
            }[]
          | undefined
        gpsr_contact_email?: string | null | undefined
        gpsr_european_reseller_contact_email?: string | null | undefined
        gpsr_european_reseller_manufacturing_company_name?:
          | string
          | null
          | undefined
        gpsr_european_reseller_postal_address?: string | null | undefined
        gpsr_manufactured_outside_eu?: boolean | undefined
        gpsr_manufacturing_company_name?: string | null | undefined
        gpsr_postal_address?: string | null | undefined
      }
    | null
    | undefined
  variants?:
    | {
        title: string
        sku: string
        ean?: string | null | undefined
        material?: string | undefined
        options?: Record<string, string> | undefined
        images?:
          | {
              url: string
            }[]
          | undefined
        thumbnail?: string | undefined
        metadata?:
          | {
              attributes?:
                | {
                    name: string
                    value?: string | undefined
                  }[]
                | undefined
              user_code?: string | undefined
              [key: string]: unknown
            }
          | undefined
        quantities?:
          | {
              quantity?: number | undefined
              supplier_quantity?: number | undefined
              locations?:
                | {
                    stockLocationName: string
                    quantity: number
                  }[]
                | undefined
            }
          | undefined
        prices?:
          | {
              amount: number
              currency_code: string
            }[]
          | undefined
        measurement?: SeedVariantMeasurementInput | null | undefined
      }[]
    | undefined
  salesChannelNames: string[]
  measurement?: SeedProductMeasurementInput | null | undefined
  productAttributes?: SeedProductAttributeInput[] | undefined
}

interface ProductVariantImagesInput {
  images?: string[]
}

export type CreateProductsStepInput = ProductInput[]

const CreateProductsStepId = "create-products-seed-step"

type ExistingCategory = Awaited<
  ReturnType<IProductModuleService["listProductCategories"]>
>[number]
type ExistingSalesChannel = Awaited<
  ReturnType<ISalesChannelModuleService["listSalesChannels"]>
>[number]
type ExistingShippingProfile = Awaited<
  ReturnType<IFulfillmentModuleService["listShippingProfiles"]>
>[number]
const SEED_BRAND_STRING_FIELDS = [
  "gpsr_contact_email",
  "gpsr_european_reseller_contact_email",
  "gpsr_european_reseller_manufacturing_company_name",
  "gpsr_european_reseller_postal_address",
  "gpsr_manufacturing_company_name",
  "gpsr_postal_address",
] as const
type BrandRegistry = Map<
  string,
  {
    attributes: Map<string, string>
    gpsr_contact_email?: string | null
    gpsr_european_reseller_contact_email?: string | null
    gpsr_european_reseller_manufacturing_company_name?: string | null
    gpsr_european_reseller_postal_address?: string | null
    gpsr_manufactured_outside_eu?: boolean
    gpsr_manufacturing_company_name?: string | null
    gpsr_postal_address?: string | null
    handle: string
    products: string[]
    title: string
  }
>
type VariantImagesRegistry = Map<string, Map<string, ProductVariantImagesInput>>
type WorkflowContainer = MedusaContainer
type BrandRegistryEntry =
  BrandRegistry extends Map<string, infer Entry> ? Entry : never
type SeedBrandScalarField =
  | (typeof SEED_BRAND_STRING_FIELDS)[number]
  | "gpsr_manufactured_outside_eu"
type SeedBrandScalarValue = BrandRegistryEntry[SeedBrandScalarField]

interface ExistingBrand {
  attributes?:
    | {
        value: string
        attributeType?:
          | {
              name?: string | undefined
            }
          | undefined
      }[]
    | undefined
  deleted_at?: Date | string | null
  gpsr_contact_email?: string | null | undefined
  gpsr_european_reseller_contact_email?: string | null | undefined
  gpsr_european_reseller_manufacturing_company_name?: string | null | undefined
  gpsr_european_reseller_postal_address?: string | null | undefined
  gpsr_manufactured_outside_eu?: boolean | null | undefined
  gpsr_manufacturing_company_name?: string | null | undefined
  gpsr_postal_address?: string | null | undefined
  handle: string
  id: string
  title: string
}

const SEED_QUERY_CHUNK_SIZE = 500
const BRAND_HANDLE_CONTENT_PATTERN = /[\p{L}\p{N}]/u

const chunkArray = <T>(items: T[], size = SEED_QUERY_CHUNK_SIZE): T[][] => {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

const normalizeSeedText = (value?: string | null): string | undefined => {
  const normalized = value?.trim()
  return normalized === "" ? undefined : normalized
}

const stripBrandHandleDiacritics = (title: string) =>
  title.normalize("NFKD").replaceAll(/[\u0300-\u036F]/gu, "")

export const normalizeBrandRegistryKey = (title: string): string => {
  const separated = stripBrandHandleDiacritics(title).replaceAll(
    /[^\p{L}\p{N}]+/gu,
    "-",
  )
  const kebab = kebabCase(separated)
    .replaceAll(/-+/gu, "-")
    .replaceAll(/^-|-$/gu, "")

  if (!BRAND_HANDLE_CONTENT_PATTERN.test(kebab)) {
    return ""
  }

  return toHandle(kebab)
}

const getLegacyBrandHandles = (title: string): string[] => {
  const historicalKebabHandle = kebabCase(title.trim())
  const previousAsciiHandle = stripBrandHandleDiacritics(title)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/-+/gu, "-")
    .replaceAll(/^-|-$/gu, "")

  return [...new Set([historicalKebabHandle, previousAsciiHandle])].filter(
    Boolean,
  )
}

export const getBrandSeedHandleCandidates = (
  title: string,
  canonicalHandle = normalizeBrandRegistryKey(title),
): string[] =>
  [...new Set([canonicalHandle, ...getLegacyBrandHandles(title)])].filter(
    Boolean,
  )

const mergeBrandScalar = (
  brand: BrandRegistryEntry,
  field: SeedBrandScalarField,
  value: SeedBrandScalarValue,
  productHandle: string,
) => {
  const normalizedValue =
    typeof value === "string" ? normalizeSeedText(value) : value
  if (normalizedValue === undefined) {
    return
  }

  const currentValue = brand[field]
  if (currentValue !== undefined && currentValue !== normalizedValue) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Conflicting ${field} values for brand "${brand.title}" from products "${brand.products[0]}" and "${productHandle}"`,
    )
  }

  Object.assign(brand, { [field]: normalizedValue })
}

const mergeBrandAttribute = (
  brand: BrandRegistryEntry,
  attribute: { name: string; value: string },
  productHandle: string,
) => {
  const name = attribute.name.trim().toLowerCase()
  if (name === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Brand "${brand.title}" has an attribute with an empty name on product "${productHandle}"`,
    )
  }

  const value = attribute.value.trim()
  const currentValue = brand.attributes.get(name)
  if (currentValue !== undefined && currentValue !== value) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Conflicting attribute "${name}" values for brand "${brand.title}" from products "${brand.products[0]}" and "${productHandle}"`,
    )
  }

  brand.attributes.set(name, value)
}

export const buildBrandRegistry = (
  inputProducts: Pick<ProductInput, "brand" | "handle" | "productAttributes">[],
): BrandRegistry => {
  const brands: BrandRegistry = new Map()

  for (const inputProduct of inputProducts) {
    const title = normalizeSeedText(inputProduct.brand?.title)
    if (title === undefined) {
      continue
    }

    const handle = normalizeBrandRegistryKey(title)
    if (handle === "") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Product "${inputProduct.handle}" has a brand title that cannot produce a valid handle`,
      )
    }

    const brand: BrandRegistryEntry = brands.get(handle) ?? {
      attributes: new Map(),
      handle,
      products: [],
      title,
    }

    if (!brands.has(handle)) {
      brands.set(handle, brand)
    }
    if (!brand.products.includes(inputProduct.handle)) {
      brand.products.push(inputProduct.handle)
    }

    for (const attribute of inputProduct.brand?.attributes ?? []) {
      mergeBrandAttribute(brand, attribute, inputProduct.handle)
    }

    for (const field of SEED_BRAND_STRING_FIELDS) {
      mergeBrandScalar(
        brand,
        field,
        inputProduct.brand?.[field],
        inputProduct.handle,
      )
    }
    mergeBrandScalar(
      brand,
      "gpsr_manufactured_outside_eu",
      inputProduct.brand?.gpsr_manufactured_outside_eu,
      inputProduct.handle,
    )
  }

  return brands
}

const collectUsedVariantSkus = (
  existingProducts: ProductDTO[],
): Set<string> => {
  const usedSkus = new Set<string>()

  for (const product of existingProducts) {
    for (const variant of product.variants ?? []) {
      if (variant.sku !== null && variant.sku !== "") {
        usedSkus.add(variant.sku)
      }
    }
  }

  return usedSkus
}

const getExistingVariantSkus = (product?: ProductDTO): Set<string> =>
  new Set(
    (product?.variants ?? [])
      .map((variant) => variant.sku)
      .filter(
        (sku): sku is string => typeof sku === "string" && sku.length > 0,
      ),
  )

const buildUniqueVariantSku = (params: {
  originalSku: string | undefined
  inputProduct: ProductInput
  index: number
  usedSkus: Set<string>
}): string => {
  const baseSku =
    params.originalSku?.trim() === "" || params.originalSku === undefined
      ? `${params.inputProduct.handle}-variant-${params.index + 1}`
      : params.originalSku
  let candidate = baseSku
  let suffix = 2

  while (params.usedSkus.has(candidate)) {
    candidate = `${baseSku}-${suffix}`
    suffix += 1
  }

  return candidate
}

const renameVariantSku = (
  variant: NonNullable<ProductInput["variants"]>[number],
  candidate: string,
): boolean => {
  if (candidate === variant.sku) {
    return false
  }

  variant.metadata = {
    ...variant.metadata,
    source_sku: variant.sku,
  }
  variant.sku = candidate

  return true
}

const ensureUniqueVariantSkus = (
  inputProducts: ProductInput[],
  existingProducts: ProductDTO[],
  logger: Logger,
) => {
  const existingProductsByHandle = new Map(
    existingProducts.map((product) => [product.handle, product]),
  )
  const usedSkus = collectUsedVariantSkus(existingProducts)
  let renamedSkus = 0

  for (const inputProduct of inputProducts) {
    const existingProduct = existingProductsByHandle.get(inputProduct.handle)
    const existingSkusOnProduct = getExistingVariantSkus(existingProduct)

    for (const [index, variant] of (inputProduct.variants ?? []).entries()) {
      const originalSku = variant.sku?.trim()
      const isExistingVariant =
        !!originalSku && existingSkusOnProduct.has(originalSku)

      if (isExistingVariant) {
        continue
      }

      const candidate = buildUniqueVariantSku({
        index,
        inputProduct,
        originalSku,
        usedSkus,
      })
      if (renameVariantSku(variant, candidate)) {
        renamedSkus += 1
      }

      usedSkus.add(candidate)
    }
  }

  if (renamedSkus > 0) {
    logger.warn(
      `Detected duplicate or empty SKUs in seed input, renamed ${renamedSkus} variant SKUs to keep them unique`,
    )
  }
}

const toMetadataId = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized === "" ? undefined : normalized
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return undefined
}

export const getSourceVariantId = (variant: {
  metadata?: Record<string, unknown> | null | undefined
}): string | undefined => {
  const metadata = variant.metadata ?? undefined
  if (metadata === undefined) {
    return undefined
  }

  return toMetadataId(metadata["source_variant_id"] ?? metadata["variant_id"])
}

const findExistingVariant = (
  existingProduct: ProductDTO,
  inputVariant: NonNullable<ProductInput["variants"]>[number],
) => {
  const sourceVariantId = getSourceVariantId(inputVariant)
  if (sourceVariantId !== undefined) {
    const bySourceId = (existingProduct.variants ?? []).find((variant) => {
      const { metadata } = variant as {
        metadata?: Record<string, unknown> | null
      }
      return getSourceVariantId({ metadata }) === sourceVariantId
    })

    if (bySourceId) {
      return bySourceId
    }
  }

  return (existingProduct.variants ?? []).find(
    (variant) => variant.sku === inputVariant.sku,
  )
}

const processProductVariantImagesInput = (
  inputProduct: ProductInput,
  productVariantImages: Map<string, Map<string, ProductVariantImagesInput>>,
) => {
  if (inputProduct.variants?.length === 0) {
    return
  }

  if (!productVariantImages.has(inputProduct.handle)) {
    productVariantImages.set(inputProduct.handle, new Map())
  }

  const variantImages = productVariantImages.get(inputProduct.handle)

  if (!variantImages) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Product "${inputProduct.handle}" not found`,
    )
  }

  for (const variant of inputProduct.variants ?? []) {
    const images = variant.images ?? []
    if (images.length === 0) {
      continue
    }

    if (!variantImages.has(variant.sku)) {
      variantImages.set(variant.sku, {
        images: images.map((image) => image.url),
      })
    }
  }
}

const prepareVariantImagesWorkflowInput = (
  product: ProductDTO,
  productVariantImages: Map<string, Map<string, ProductVariantImagesInput>>,
): BatchVariantImagesWorkflowInput[] | undefined => {
  if (product.variants?.length === 0) {
    return undefined
  }

  const variantImages = productVariantImages.get(product.handle)
  if (!variantImages) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Product "${product.handle}" not found when processing variant images`,
    )
  }

  const result: BatchVariantImagesWorkflowInput[] = []

  for (const variant of product.variants) {
    if (variant.sku === null || variant.sku === "") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Variant SKU is empty for product "${product.handle}"`,
      )
    }

    const variantImage = variantImages.get(variant.sku)

    // Defensive normalization: ensure we always work with arrays, never undefined
    const productImages = product.images ?? []
    const variantImagesCurrent = variant.images ?? []

    if (!variantImage) {
      // if no images are specified for variant, use base images from the product entity
      const toAdd = productImages
        .map(
          (image) => productImages.find((v) => v.url === image.url)?.id ?? null,
        )
        .filter((id): id is string => id !== null)

      const toRemove = variantImagesCurrent
        .filter((img) => !toAdd.includes(img.id))
        .map((img) => img.id)

      result.push({
        add: toAdd,
        remove: toRemove,
        variant_id: variant.id,
      })
      continue
    }

    const toAdd = (variantImage.images ?? [])
      .map((image) => productImages.find((v) => v.url === image)?.id ?? null)
      .filter((id): id is string => id !== null)
    const toRemove = variantImagesCurrent
      .filter((img) => !toAdd.includes(img.id))
      .map((img) => img.id)

    result.push({
      add: toAdd,
      remove: toRemove,
      variant_id: variant.id,
    })
  }

  return result
}

const collectCategoryHandles = (input: CreateProductsStepInput): string[] => [
  ...new Set(
    input.flatMap((product) => product.categories.map((cat) => cat.handle)),
  ),
]

const collectSalesChannelNames = (input: CreateProductsStepInput): string[] => [
  ...new Set(input.flatMap((product) => product.salesChannelNames)),
]

const resolveCategory = (
  existingCategories: ExistingCategory[],
  handle: string,
): ExistingCategory => {
  const existingCategory = existingCategories.find(
    (cat) => cat.handle === handle,
  )
  if (!existingCategory) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Category "${handle}" not found`,
    )
  }

  return existingCategory
}

const resolveShippingProfileId = (
  existingShippingProfiles: ExistingShippingProfile[],
  name: string,
): string => {
  const profile = existingShippingProfiles.find((sp) => sp.name === name)
  if (!profile) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shipping profile "${name}" not found`,
    )
  }

  return profile.id
}

const resolveSalesChannel = (
  existingSalesChannels: ExistingSalesChannel[],
  name: string,
): ExistingSalesChannel => {
  const channel = existingSalesChannels.find((sc) => sc.name === name)
  if (!channel) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Sales channel "${name}" not found`,
    )
  }

  return channel
}

const registerProductSideInputs = (
  inputProduct: ProductInput,
  productVariantImages: VariantImagesRegistry,
): void => {
  processProductVariantImagesInput(inputProduct, productVariantImages)
}

const buildUpdateVariant = (
  existingProduct: ProductDTO,
  inputVariant: NonNullable<ProductInput["variants"]>[number],
) => {
  const existingVariant = findExistingVariant(existingProduct, inputVariant)

  const variantPayload = {
    sku: inputVariant.sku,
    title: inputVariant.title,
    ...(inputVariant.ean === undefined ? {} : { ean: inputVariant.ean }),
    ...(inputVariant.material === undefined
      ? {}
      : { material: inputVariant.material }),
    ...(inputVariant.options === undefined
      ? {}
      : { options: inputVariant.options }),
    ...(inputVariant.prices === undefined
      ? {}
      : {
          prices: inputVariant.prices.map((p) => ({
            amount: p.amount,
            currency_code: p.currency_code,
          })),
        }),
    ...(inputVariant.thumbnail === undefined
      ? {}
      : { thumbnail: inputVariant.thumbnail }),
    ...(inputVariant.metadata === undefined
      ? {}
      : { metadata: inputVariant.metadata }),
  }

  return existingVariant
    ? { ...variantPayload, id: existingVariant.id }
    : {
        ...variantPayload,
        ...(inputVariant.images === undefined
          ? {}
          : { images: inputVariant.images }),
      }
}

const buildUpdateProductPayload = (params: {
  existingProduct: ProductDTO
  inputProduct: ProductInput
  existingCategories: ExistingCategory[]
  existingShippingProfiles: ExistingShippingProfile[]
  existingSalesChannels: ExistingSalesChannel[]
}): ProcessProductOptionsForImportInput["products"][number] => {
  const {
    existingProduct,
    inputProduct,
    existingCategories,
    existingShippingProfiles,
    existingSalesChannels,
  } = params

  return {
    category_ids: inputProduct.categories?.map(
      (inputCat) => resolveCategory(existingCategories, inputCat.handle).id,
    ),
    description: inputProduct.description,
    id: existingProduct.id,
    images: inputProduct.images ?? [],
    ...(inputProduct.metadata === undefined
      ? {}
      : { metadata: inputProduct.metadata }),
    ...(inputProduct.options === undefined
      ? {}
      : { options: inputProduct.options }),
    sales_channels: inputProduct.salesChannelNames.map((name) =>
      resolveSalesChannel(existingSalesChannels, name),
    ),
    shipping_profile_id: resolveShippingProfileId(
      existingShippingProfiles,
      inputProduct.shippingProfileName,
    ),
    status: inputProduct.status ?? ProductStatus.PUBLISHED,
    thumbnail: inputProduct.thumbnail ?? existingProduct.thumbnail,
    title: inputProduct.title,
    ...(inputProduct.variants === undefined
      ? {}
      : {
          variants: inputProduct.variants.map((inputVariant) =>
            buildUpdateVariant(existingProduct, inputVariant),
          ),
        }),
    ...(inputProduct.weight === undefined
      ? {}
      : { weight: inputProduct.weight }),
  }
}

const buildCreateVariant = (
  inputVariant: NonNullable<ProductInput["variants"]>[number],
) => ({
  sku: inputVariant.sku,
  title: inputVariant.title,
  ...(inputVariant.ean === undefined ? {} : { ean: inputVariant.ean }),
  ...(inputVariant.material === undefined
    ? {}
    : { material: inputVariant.material }),
  ...(inputVariant.options === undefined
    ? {}
    : { options: inputVariant.options }),
  ...(inputVariant.thumbnail === undefined
    ? {}
    : { thumbnail: inputVariant.thumbnail }),
  ...(inputVariant.prices === undefined
    ? {}
    : {
        prices: inputVariant.prices.map((price) => ({
          amount: price.amount,
          currency_code: price.currency_code,
        })),
      }),
  ...(inputVariant.metadata === undefined
    ? {}
    : { metadata: inputVariant.metadata }),
})

const buildCreateProductPayload = (params: {
  inputProduct: ProductInput
  existingCategories: ExistingCategory[]
  existingShippingProfiles: ExistingShippingProfile[]
  existingSalesChannels: ExistingSalesChannel[]
}) => {
  const {
    inputProduct,
    existingCategories,
    existingShippingProfiles,
    existingSalesChannels,
  } = params

  return {
    category_ids: inputProduct.categories?.map(
      (inputCat) => resolveCategory(existingCategories, inputCat.handle).id,
    ),
    description: inputProduct.description,
    handle: inputProduct.handle,
    images: inputProduct.images ?? [],
    ...(inputProduct.metadata === undefined
      ? {}
      : { metadata: inputProduct.metadata }),
    ...(inputProduct.options === undefined
      ? {}
      : { options: inputProduct.options }),
    sales_channels: inputProduct.salesChannelNames.map((name) =>
      resolveSalesChannel(existingSalesChannels, name),
    ),
    shipping_profile_id: resolveShippingProfileId(
      existingShippingProfiles,
      inputProduct.shippingProfileName,
    ),
    status: inputProduct.status ?? ProductStatus.PUBLISHED,
    ...(inputProduct.thumbnail === undefined
      ? {}
      : { thumbnail: inputProduct.thumbnail }),
    title: inputProduct.title,
    ...(inputProduct.variants === undefined
      ? {}
      : { variants: inputProduct.variants.map(buildCreateVariant) }),
    ...(inputProduct.weight === undefined
      ? {}
      : { weight: inputProduct.weight }),
  }
}

const buildUpdateProductPayloads = (params: {
  input: CreateProductsStepInput
  existingProducts: ProductDTO[]
  existingCategories: ExistingCategory[]
  existingShippingProfiles: ExistingShippingProfile[]
  existingSalesChannels: ExistingSalesChannel[]
  productVariantImages: VariantImagesRegistry
}) =>
  params.existingProducts.flatMap((existingProduct) => {
    const inputProduct = params.input.find(
      (product) => product.handle === existingProduct.handle,
    )

    if (!inputProduct) {
      return []
    }

    registerProductSideInputs(inputProduct, params.productVariantImages)

    return [
      buildUpdateProductPayload({
        existingCategories: params.existingCategories,
        existingProduct,
        existingSalesChannels: params.existingSalesChannels,
        existingShippingProfiles: params.existingShippingProfiles,
        inputProduct,
      }),
    ]
  })

const buildCreateProductPayloads = (params: {
  missingProducts: ProductInput[]
  existingCategories: ExistingCategory[]
  existingShippingProfiles: ExistingShippingProfile[]
  existingSalesChannels: ExistingSalesChannel[]
  productVariantImages: VariantImagesRegistry
}) =>
  params.missingProducts.map((inputProduct) => {
    registerProductSideInputs(inputProduct, params.productVariantImages)

    return buildCreateProductPayload({
      existingCategories: params.existingCategories,
      existingSalesChannels: params.existingSalesChannels,
      existingShippingProfiles: params.existingShippingProfiles,
      inputProduct,
    })
  })

const applyVariantImageUpdates = async (params: {
  container: WorkflowContainer
  products: ProductDTO[]
  productVariantImages: VariantImagesRegistry
  result: string[]
}): Promise<void> => {
  await Promise.all(
    params.products.map(async (product) => {
      const variantImageInputs = prepareVariantImagesWorkflowInput(
        product,
        params.productVariantImages,
      )
      await Promise.all(
        (variantImageInputs ?? []).map(async (variantImageInput) => {
          await batchVariantImagesWorkflow(params.container).run({
            input: variantImageInput,
          })
        }),
      )
      params.result.push(product.id)
    }),
  )
}

const getDesiredBrandHandleByProduct = (brands: BrandRegistry) => {
  const desiredBrandHandleByProduct = new Map<string, string>()

  for (const brand of brands.values()) {
    for (const productHandle of brand.products) {
      const existing = desiredBrandHandleByProduct.get(productHandle)
      if (existing !== undefined && existing !== brand.handle) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Product "${productHandle}" resolves to multiple brands: "${existing}" and "${brand.handle}"`,
        )
      }
      desiredBrandHandleByProduct.set(productHandle, brand.handle)
    }
  }

  return desiredBrandHandleByProduct
}

const mergeExistingBrandAttributes = (
  existing: ExistingBrand,
  incoming: BrandRegistryEntry,
) => {
  const attributes = new Map<string, { name: string; value: string }>()
  for (const attribute of existing.attributes ?? []) {
    const persistedName = attribute.attributeType?.name?.trim()
    if (persistedName === undefined || persistedName === "") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Existing brand "${existing.title}" has an attribute without an attribute type name`,
      )
    }
    const key = persistedName.toLowerCase()
    const prior = attributes.get(key)
    if (prior !== undefined && prior.value !== attribute.value) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Existing brand "${existing.title}" has conflicting values for attribute "${key}"`,
      )
    }
    attributes.set(key, {
      name: persistedName,
      value: attribute.value,
    })
  }

  let changed = false
  for (const [name, value] of incoming.attributes) {
    const existingAttribute = attributes.get(name)
    if (existingAttribute?.value !== value) {
      attributes.set(name, {
        name: existingAttribute?.name ?? name,
        value,
      })
      changed = true
    }
  }

  return {
    attributes: [...attributes.values()],
    changed,
  }
}

export const buildExistingBrandReconciliation = (
  existing: ExistingBrand,
  incoming: BrandRegistryEntry,
): Partial<BrandInput> => {
  const update: Partial<BrandInput> = {}
  if (existing.title !== incoming.title) {
    update.title = incoming.title
  }
  if (existing.handle !== incoming.handle) {
    update.handle = incoming.handle
  }

  const mergedAttributes = mergeExistingBrandAttributes(existing, incoming)
  if (mergedAttributes.changed) {
    update.attributes = mergedAttributes.attributes
  }

  for (const field of SEED_BRAND_STRING_FIELDS) {
    const incomingValue = incoming[field]
    if (incomingValue === undefined) {
      continue
    }

    const existingValue =
      existing[field] === null
        ? null
        : (normalizeSeedText(existing[field]) ?? null)
    if (existingValue !== incomingValue) {
      update[field] = incomingValue
    }
  }

  if (
    incoming.gpsr_manufactured_outside_eu !== undefined &&
    existing.gpsr_manufactured_outside_eu !==
      incoming.gpsr_manufactured_outside_eu
  ) {
    update.gpsr_manufactured_outside_eu = incoming.gpsr_manufactured_outside_eu
  }

  return update
}

const toCreateBrandInput = (brand: BrandRegistryEntry) => ({
  attributes: [...brand.attributes].map(([name, value]) => ({ name, value })),
  gpsr_contact_email: brand.gpsr_contact_email,
  gpsr_european_reseller_contact_email:
    brand.gpsr_european_reseller_contact_email,
  gpsr_european_reseller_manufacturing_company_name:
    brand.gpsr_european_reseller_manufacturing_company_name,
  gpsr_european_reseller_postal_address:
    brand.gpsr_european_reseller_postal_address,
  gpsr_manufactured_outside_eu: brand.gpsr_manufactured_outside_eu ?? false,
  gpsr_manufacturing_company_name: brand.gpsr_manufacturing_company_name,
  gpsr_postal_address: brand.gpsr_postal_address,
  handle: brand.handle,
  title: brand.title,
})

const findExistingSeedBrand = async (
  brandService: BrandModuleService,
  brandData: BrandRegistryEntry,
): Promise<ExistingBrand | undefined> => {
  const candidateHandles = getBrandSeedHandleCandidates(
    brandData.title,
    brandData.handle,
  )
  const existingBrands: ExistingBrand[] = await brandService.listBrands(
    {
      handle: { $in: candidateHandles },
    },
    {
      relations: ["attributes", "attributes.attributeType"],
      take: Math.max(candidateHandles.length * 2, 1),
      withDeleted: true,
    },
  )

  if (existingBrands.length > 1) {
    const formattedHandles = candidateHandles
      .map((handle) => `"${handle}"`)
      .join(", ")
    const formattedBrands = existingBrands
      .map((brand) => `"${brand.title}" (${brand.handle})`)
      .join(", ")
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `Brand "${brandData.title}" resolves to multiple persisted records for handles ${formattedHandles}: ${formattedBrands}`,
    )
  }

  return existingBrands[0]
}

const validateExistingSeedBrandReconciliation = (
  existing: ExistingBrand,
  brandData: BrandRegistryEntry,
) => {
  const update = buildExistingBrandReconciliation(existing, brandData)
  const effectiveState: BrandScalarWriteInput = {
    gpsr_contact_email: existing.gpsr_contact_email,
    gpsr_european_reseller_contact_email:
      existing.gpsr_european_reseller_contact_email,
    gpsr_european_reseller_manufacturing_company_name:
      existing.gpsr_european_reseller_manufacturing_company_name,
    gpsr_european_reseller_postal_address:
      existing.gpsr_european_reseller_postal_address,
    gpsr_manufactured_outside_eu:
      existing.gpsr_manufactured_outside_eu ?? false,
    gpsr_manufacturing_company_name: existing.gpsr_manufacturing_company_name,
    gpsr_postal_address: existing.gpsr_postal_address,
    handle: existing.handle,
    title: existing.title,
    ...update,
  }
  validateBrandGpsrState(effectiveState, brandData.handle)
}

const assertSeedBrandsCompatibleWithPersistence = async (
  brandService: BrandModuleService,
  brands: BrandRegistry,
) => {
  const existingBrands = await Promise.all(
    [...brands.values()].map(async (brandData) => ({
      brandData,
      existing: await findExistingSeedBrand(brandService, brandData),
    })),
  )
  const desiredHandleByExistingBrandId = new Map<string, string>()

  for (const { brandData, existing } of existingBrands) {
    if (existing === undefined) {
      validateBrandGpsrState(toCreateBrandInput(brandData), brandData.handle)
      continue
    }

    const priorDesiredHandle = desiredHandleByExistingBrandId.get(existing.id)
    if (
      priorDesiredHandle !== undefined &&
      priorDesiredHandle !== brandData.handle
    ) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        `Persisted brand "${existing.title}" (${existing.handle}) resolves to multiple seed handles: "${priorDesiredHandle}" and "${brandData.handle}"`,
      )
    }
    desiredHandleByExistingBrandId.set(existing.id, brandData.handle)
    validateExistingSeedBrandReconciliation(existing, brandData)
  }
}

const upsertSeedBrand = async (params: {
  brandData: BrandRegistryEntry
  brandService: BrandModuleService
  container: WorkflowContainer
}): Promise<ExistingBrand> => {
  const existing = await findExistingSeedBrand(
    params.brandService,
    params.brandData,
  )
  if (!existing) {
    const { result } = await createBrandsWorkflow(params.container).run({
      input: {
        brands: [toCreateBrandInput(params.brandData)],
      },
    })
    const [created] = result
    if (created === undefined) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Brand "${params.brandData.title}" was not created`,
      )
    }
    return {
      ...created,
      title: params.brandData.title,
    }
  }

  validateExistingSeedBrandReconciliation(existing, params.brandData)

  if (existing.deleted_at !== null && existing.deleted_at !== undefined) {
    await restoreBrandsWorkflow(params.container).run({
      input: {
        ids: [existing.id],
      },
    })
  }

  const update = buildExistingBrandReconciliation(existing, params.brandData)
  if (Object.keys(update).length) {
    await updateBrandsWorkflow(params.container).run({
      input: {
        selector: {
          id: existing.id,
        },
        update,
      },
    })
  }

  return existing
}

const upsertSeedBrandsByHandle = async (params: {
  brandService: BrandModuleService
  brands: BrandRegistry
  container: WorkflowContainer
}) => {
  const upsertedBrands = await Promise.all(
    [...params.brands.values()].map(async (brandData) => ({
      brand: await upsertSeedBrand({
        brandData,
        brandService: params.brandService,
        container: params.container,
      }),
      brandData,
    })),
  )

  return new Map(
    upsertedBrands.map(({ brand, brandData }) => [brandData.handle, brand.id]),
  )
}

const listSeedProductsByHandle = async (params: {
  productHandles: string[]
  productService: IProductModuleService
}) => {
  const uniqueHandles = [...new Set(params.productHandles)]
  const productChunks = await Promise.all(
    chunkArray(uniqueHandles).map(
      async (handleChunk) =>
        await params.productService.listProducts(
          { handle: { $in: handleChunk } },
          {
            select: ["id", "handle"],
            take: handleChunk.length,
          },
        ),
    ),
  )
  const products = productChunks.flat()

  if (products.length !== uniqueHandles.length) {
    const foundHandles = new Set(products.map((product) => product.handle))
    const missingHandles = uniqueHandles.filter(
      (handle) => !foundHandles.has(handle),
    )
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Products were not found for brand linking: ${missingHandles.join(", ")}`,
    )
  }

  return products
}

export const buildDesiredProductBrandLinks = (params: {
  brandIdsByHandle: Map<string, string>
  desiredBrandHandleByProduct: Map<string, string>
  products: ProductDTO[]
}) => {
  const desiredLinks: { brandIds: string[]; productId: string }[] = []

  for (const product of params.products) {
    const desiredHandle = params.desiredBrandHandleByProduct.get(product.handle)
    const desiredBrandId =
      desiredHandle === undefined
        ? undefined
        : params.brandIdsByHandle.get(desiredHandle)
    if (desiredHandle !== undefined && desiredBrandId === undefined) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resolved brand was not found for product "${product.handle}"`,
      )
    }

    desiredLinks.push({
      brandIds: desiredBrandId === undefined ? [] : [desiredBrandId],
      productId: product.id,
    })
  }

  return desiredLinks
}

const reconcileProductBrandLinks = async (
  container: WorkflowContainer,
  links: { brandIds: string[]; productId: string }[],
) => {
  await Promise.all(
    links.map(async (link) => {
      await setProductBrandsWorkflow(container).run({
        input: {
          brand_ids: link.brandIds,
          dismiss_inactive: true,
          fail_on_conflict: false,
          product_id: link.productId,
        },
      })
    }),
  )
}

const linkBrands = async (params: {
  container: WorkflowContainer
  productService: IProductModuleService
  brandService: BrandModuleService
  brands: BrandRegistry
  seedProducts: ProductInput[]
}): Promise<void> => {
  if (!params.seedProducts.length) {
    return
  }

  const brandIdsByHandle = await upsertSeedBrandsByHandle(params)
  const desiredBrandHandleByProduct = getDesiredBrandHandleByProduct(
    params.brands,
  )
  const products = await listSeedProductsByHandle({
    productHandles: params.seedProducts.map((product) => product.handle),
    productService: params.productService,
  })
  const desiredLinks = buildDesiredProductBrandLinks({
    brandIdsByHandle,
    desiredBrandHandleByProduct,
    products,
  })

  await reconcileProductBrandLinks(params.container, desiredLinks)
}

export const createProductsStep = createStep(
  CreateProductsStepId,
  async (input: CreateProductsStepInput, { container }) => {
    const result: string[] = []
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const productService = container.resolve<IProductModuleService>(
      Modules.PRODUCT,
    )
    const fulfillmentService = container.resolve<IFulfillmentModuleService>(
      Modules.FULFILLMENT,
    )
    const salesChannelService = container.resolve<ISalesChannelModuleService>(
      Modules.SALES_CHANNEL,
    )
    const brandService = container.resolve<BrandModuleService>(BRAND_MODULE)

    const productVariantImages: VariantImagesRegistry = new Map()
    const brands = buildBrandRegistry(input)

    const existingCategories = await productService.listProductCategories(
      {
        handle: collectCategoryHandles(input),
      },
      {
        select: ["id", "handle"],
      },
    )
    const existingSalesChannels = await salesChannelService.listSalesChannels({
      name: collectSalesChannelNames(input),
    })

    const existingShippingProfiles =
      await fulfillmentService.listShippingProfiles({
        name: input.map((i) => i.shippingProfileName),
      })

    const existingProducts = await productService.listProducts(
      {
        handle: input.map((i) => i.handle),
      },
      {
        relations: ["variants", "variants.options"],
        select: ["variants.*", "variants.options.*", "*"],
      },
    )

    await assertSeedBrandsCompatibleWithPersistence(brandService, brands)

    ensureUniqueVariantSkus(input, existingProducts, logger)

    const missingProducts = input.filter(
      (i) => !existingProducts.some((j) => j.handle === i.handle),
    )
    const updateProducts = existingProducts.flatMap((existingProduct) =>
      buildUpdateProductPayloads({
        existingCategories,
        existingProducts: [existingProduct],
        existingSalesChannels,
        existingShippingProfiles,
        input,
        productVariantImages,
      }),
    )

    if (missingProducts.length !== 0) {
      logger.info("Creating missing products...")

      const createProducts = buildCreateProductPayloads({
        existingCategories,
        existingSalesChannels,
        existingShippingProfiles,
        missingProducts,
        productVariantImages,
      })

      const createResult = await createProductsWorkflow(container).run({
        input: {
          products: createProducts,
        },
      })

      const productIds = createResult.result.map((r) => r.id)
      const products = await productService.listProducts(
        { id: { $in: productIds } },
        {
          relations: ["images", "variants", "variants.images"],
          select: [
            "id",
            "handle",
            "images.id",
            "images.url",
            "variants.sku",
            "variants.images.id",
            "variants.images.url",
          ],
        },
      )

      logger.info("Creating product variant images...")

      await applyVariantImageUpdates({
        container,
        productVariantImages,
        products,
        result,
      })
    }

    if (updateProducts.length !== 0) {
      logger.info("Updating existing products...")

      const updateResults = await Promise.all(
        chunkArray(updateProducts).map(
          async (updateProductsChunk) =>
            await batchProductsWorkflow(container).run({
              input: {
                update: updateProductsChunk,
              },
            }),
        ),
      )
      const updatedIds = updateResults.flatMap(({ result: updateResult }) =>
        updateResult.updated.map((updated) => updated.id),
      )

      const products = await productService.listProducts(
        { id: { $in: updatedIds } },
        {
          relations: ["images", "variants", "variants.images"],
          select: [
            "id",
            "handle",
            "images.id",
            "images.url",
            "variants.sku",
            "variants.images.id",
            "variants.images.url",
          ],
        },
      )

      logger.info("Updating product variant images...")

      await applyVariantImageUpdates({
        container,
        productVariantImages,
        products,
        result,
      })
    }

    await linkBrands({
      brandService,
      brands,
      container,
      productService,
      seedProducts: input,
    })

    return new StepResponse({
      result,
    })
  },
)
