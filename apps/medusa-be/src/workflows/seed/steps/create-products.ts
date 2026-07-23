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
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  type BatchVariantImagesWorkflowInput,
  batchProductsWorkflow,
  batchVariantImagesWorkflow,
  createProductsWorkflow,
  type ProcessProductOptionsForImportInput,
} from "@medusajs/medusa/core-flows"
import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/service"
import {
  type BrandInput,
  type BrandScalarWriteInput,
  createBrandsWorkflow,
  getCurrentProductBrandLinks,
  setProductBrandsWorkflow,
  updateBrandsWorkflow,
  validateBrandGpsrState,
} from "../../brand"

type ProductInput = {
  title: string
  categories: {
    name?: string
    handle: string
  }[]
  description: string
  handle: string
  weight?: number
  status?: ProductStatus
  metadata?: Record<string, unknown>
  shippingProfileName: string
  thumbnail?: string
  images: {
    url: string
  }[]
  options?: {
    title: string
    values: string[]
  }[]
  brand?: {
    title?: string
    attributes?: {
      name: string
      value: string
    }[]
    gpsr_contact_email?: string | null
    gpsr_european_reseller_contact_email?: string | null
    gpsr_european_reseller_manufacturing_company_name?: string | null
    gpsr_european_reseller_postal_address?: string | null
    gpsr_manufactured_outside_eu?: boolean
    gpsr_manufacturing_company_name?: string | null
    gpsr_postal_address?: string | null
  } | null
  variants?: {
    title: string
    sku: string
    ean?: string
    material?: string
    options?: {
      [key: string]: string
    }
    images?: {
      url: string
    }[]
    thumbnail?: string
    metadata?: {
      attributes?: {
        name: string
        value?: string
      }[]
      user_code?: string
      [key: string]: unknown
    }
    quantities?: {
      quantity?: number
      supplier_quantity?: number
      locations?: {
        stockLocationName: string
        quantity: number
      }[]
    }
    prices?: {
      amount: number
      currency_code: string
    }[]
  }[]
  salesChannelNames: string[]
}

type ProductVariantImagesInput = {
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
type BrandRegistry = Map<
  string,
  {
    attributes: Map<string, string>
    gpsr_contact_email?: string
    gpsr_european_reseller_contact_email?: string
    gpsr_european_reseller_manufacturing_company_name?: string
    gpsr_european_reseller_postal_address?: string
    gpsr_manufactured_outside_eu?: boolean
    gpsr_manufacturing_company_name?: string
    gpsr_postal_address?: string
    handle: string
    products: string[]
    title: string
  }
>
type VariantImagesRegistry = Map<string, Map<string, ProductVariantImagesInput>>
type WorkflowContainer = MedusaContainer
type BrandRegistryEntry =
  BrandRegistry extends Map<string, infer Entry> ? Entry : never
type SeedBrandScalarField = Exclude<
  keyof BrandRegistryEntry,
  "attributes" | "handle" | "products" | "title"
>
type ProductBrandLinkRecord = {
  brand_id?: string
  product_id?: string
}
type ExistingBrand = {
  attributes?: Array<{
    value: string
    attributeType?: {
      name?: string
    }
  }>
  deleted_at?: string | Date | null
  gpsr_contact_email?: string | null
  gpsr_european_reseller_contact_email?: string | null
  gpsr_european_reseller_manufacturing_company_name?: string | null
  gpsr_european_reseller_postal_address?: string | null
  gpsr_manufactured_outside_eu?: boolean | null
  gpsr_manufacturing_company_name?: string | null
  gpsr_postal_address?: string | null
  handle: string
  id: string
  title: string
}

const SEED_BRAND_STRING_FIELDS = [
  "gpsr_contact_email",
  "gpsr_european_reseller_contact_email",
  "gpsr_european_reseller_manufacturing_company_name",
  "gpsr_european_reseller_postal_address",
  "gpsr_manufacturing_company_name",
  "gpsr_postal_address",
] as const
const SEED_QUERY_CHUNK_SIZE = 500

function chunkArray<T>(items: T[], size = SEED_QUERY_CHUNK_SIZE): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function normalizeSeedText(value?: string | null): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function normalizeBrandRegistryKey(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function mergeBrandScalar(
  brand: BrandRegistryEntry,
  field: SeedBrandScalarField,
  value: boolean | string | null | undefined,
  productHandle: string
) {
  const normalizedValue =
    typeof value === "string" ? normalizeSeedText(value) : (value ?? undefined)
  if (normalizedValue === undefined) {
    return
  }

  const currentValue = brand[field]
  if (currentValue !== undefined && currentValue !== normalizedValue) {
    throw new Error(
      `Conflicting ${field} values for brand "${brand.title}" from products "${brand.products[0]}" and "${productHandle}"`
    )
  }

  Object.assign(brand, { [field]: normalizedValue })
}

function mergeBrandAttribute(
  brand: BrandRegistryEntry,
  attribute: { name: string; value: string },
  productHandle: string
) {
  const name = attribute.name.trim().toLowerCase()
  if (!name) {
    throw new Error(
      `Brand "${brand.title}" has an attribute with an empty name on product "${productHandle}"`
    )
  }

  const value = attribute.value.trim()
  const currentValue = brand.attributes.get(name)
  if (currentValue !== undefined && currentValue !== value) {
    throw new Error(
      `Conflicting attribute "${name}" values for brand "${brand.title}" from products "${brand.products[0]}" and "${productHandle}"`
    )
  }

  brand.attributes.set(name, value)
}

export function buildBrandRegistry(
  inputProducts: Pick<ProductInput, "brand" | "handle">[]
): BrandRegistry {
  const brands: BrandRegistry = new Map()

  for (const inputProduct of inputProducts) {
    const title = normalizeSeedText(inputProduct.brand?.title)
    if (!title) {
      continue
    }

    const handle = normalizeBrandRegistryKey(title)
    if (!handle) {
      throw new Error(
        `Product "${inputProduct.handle}" has a brand title that cannot produce a valid handle`
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
        inputProduct.handle
      )
    }
    mergeBrandScalar(
      brand,
      "gpsr_manufactured_outside_eu",
      inputProduct.brand?.gpsr_manufactured_outside_eu,
      inputProduct.handle
    )
  }

  return brands
}

function collectUsedVariantSkus(existingProducts: ProductDTO[]): Set<string> {
  const usedSkus = new Set<string>()

  for (const product of existingProducts) {
    for (const variant of product.variants ?? []) {
      if (variant.sku) {
        usedSkus.add(variant.sku)
      }
    }
  }

  return usedSkus
}

function getExistingVariantSkus(product?: ProductDTO): Set<string> {
  return new Set(
    (product?.variants ?? [])
      .map((variant) => variant.sku)
      .filter((sku): sku is string => typeof sku === "string" && sku.length > 0)
  )
}

function buildUniqueVariantSku(params: {
  originalSku: string | undefined
  inputProduct: ProductInput
  index: number
  usedSkus: Set<string>
}): string {
  const baseSku =
    params.originalSku ||
    `${params.inputProduct.handle}-variant-${params.index + 1}`
  let candidate = baseSku
  let suffix = 2

  while (params.usedSkus.has(candidate)) {
    candidate = `${baseSku}-${suffix}`
    suffix += 1
  }

  return candidate
}

function renameVariantSku(
  variant: NonNullable<ProductInput["variants"]>[number],
  candidate: string
): boolean {
  if (candidate === variant.sku) {
    return false
  }

  variant.metadata = {
    ...(variant.metadata ?? {}),
    source_sku: variant.sku,
  }
  variant.sku = candidate

  return true
}

function ensureUniqueVariantSkus(
  inputProducts: ProductInput[],
  existingProducts: ProductDTO[],
  logger: Logger
) {
  const existingProductsByHandle = new Map(
    existingProducts.map((product) => [product.handle, product])
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
        originalSku,
        inputProduct,
        index,
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
      `Detected duplicate or empty SKUs in seed input, renamed ${renamedSkus} variant SKUs to keep them unique`
    )
  }
}

function toMetadataId(value: unknown): string | undefined {
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized === "" ? undefined : normalized
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return
}

function getSourceVariantId(variant: {
  metadata?: Record<string, unknown> | null
}): string | undefined {
  const metadata = variant.metadata ?? undefined
  if (!metadata) {
    return
  }

  return toMetadataId(metadata.source_variant_id ?? metadata.variant_id)
}

function findExistingVariant(
  existingProduct: ProductDTO,
  inputVariant: NonNullable<ProductInput["variants"]>[number]
) {
  const sourceVariantId = getSourceVariantId(inputVariant)
  if (sourceVariantId) {
    const bySourceId = (existingProduct.variants ?? []).find((variant) => {
      const metadata = (
        variant as { metadata?: Record<string, unknown> | null }
      ).metadata
      return getSourceVariantId({ metadata }) === sourceVariantId
    })

    if (bySourceId) {
      return bySourceId
    }
  }

  return (existingProduct.variants ?? []).find(
    (variant) => variant.sku === inputVariant.sku
  )
}

function processProductVariantImagesInput(
  inputProduct: ProductInput,
  productVariantImages: Map<string, Map<string, ProductVariantImagesInput>>
) {
  if (inputProduct.variants?.length === 0) {
    return
  }

  if (!productVariantImages.has(inputProduct.handle)) {
    productVariantImages.set(inputProduct.handle, new Map())
  }

  const variantImages = productVariantImages.get(inputProduct.handle)

  if (!variantImages) {
    throw new Error(`Product "${inputProduct.handle}" not found`)
  }

  for (const variant of inputProduct.variants ?? []) {
    if (!variant.images?.length) {
      continue
    }

    if (!variantImages.has(variant.sku)) {
      variantImages.set(variant.sku, {
        images: variant.images.map((i) => i.url),
      })
    }
  }
}

function prepareVariantImagesWorkflowInput(
  product: ProductDTO,
  productVariantImages: Map<string, Map<string, ProductVariantImagesInput>>
): BatchVariantImagesWorkflowInput[] | undefined {
  if (product.variants?.length === 0) {
    return
  }

  const variantImages = productVariantImages.get(product.handle)
  if (!variantImages) {
    throw new Error(
      `Product "${product.handle}" not found when processing variant images`
    )
  }

  const result: BatchVariantImagesWorkflowInput[] = []

  for (const variant of product.variants) {
    if (!variant.sku) {
      throw new Error(`Variant SKU is empty for product "${product.handle}"`)
    }

    const variantImage = variantImages.get(variant.sku)

    // Defensive normalization: ensure we always work with arrays, never undefined
    const productImages = product.images ?? []
    const variantImagesCurrent = variant.images ?? []

    if (!variantImage) {
      // if no images are specified for variant, use base images from the product entity
      const toAdd = productImages
        .map(
          (image) => productImages.find((v) => v.url === image.url)?.id ?? null
        )
        .filter((id): id is string => id !== null)

      const toRemove = variantImagesCurrent
        .filter((img) => !toAdd.includes(img.id))
        .map((img) => img.id)

      result.push({
        variant_id: variant.id,
        add: toAdd,
        remove: toRemove,
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
      variant_id: variant.id,
      add: toAdd,
      remove: toRemove,
    })
  }
  return result
}

function collectCategoryHandles(input: CreateProductsStepInput): string[] {
  return [
    ...new Set(
      input.flatMap((product) => product.categories.map((cat) => cat.handle))
    ),
  ]
}

function collectSalesChannelNames(input: CreateProductsStepInput): string[] {
  return [...new Set(input.flatMap((product) => product.salesChannelNames))]
}

function resolveCategory(
  existingCategories: ExistingCategory[],
  handle: string
): ExistingCategory {
  const existingCategory = existingCategories.find(
    (cat) => cat.handle === handle
  )
  if (!existingCategory) {
    throw new Error(`Category "${handle}" not found`)
  }

  return existingCategory
}

function resolveShippingProfileId(
  existingShippingProfiles: ExistingShippingProfile[],
  name: string
): string {
  const profile = existingShippingProfiles.find((sp) => sp.name === name)
  if (!profile) {
    throw new Error(`Shipping profile "${name}" not found`)
  }

  return profile.id
}

function resolveSalesChannel(
  existingSalesChannels: ExistingSalesChannel[],
  name: string
): ExistingSalesChannel {
  const channel = existingSalesChannels.find((sc) => sc.name === name)
  if (!channel) {
    throw new Error(`Sales channel "${name}" not found`)
  }

  return channel
}

function registerProductSideInputs(
  inputProduct: ProductInput,
  productVariantImages: VariantImagesRegistry
): void {
  processProductVariantImagesInput(inputProduct, productVariantImages)
}

function buildUpdateVariant(
  existingProduct: ProductDTO,
  inputVariant: NonNullable<ProductInput["variants"]>[number]
) {
  const existingVariant = findExistingVariant(existingProduct, inputVariant)

  return existingVariant
    ? {
        title: inputVariant.title,
        sku: inputVariant.sku,
        ean: inputVariant.ean,
        material: inputVariant.material,
        options: inputVariant.options,
        prices: inputVariant.prices?.map((p) => ({
          amount: p.amount,
          currency_code: p.currency_code,
        })),
        thumbnail: inputVariant.thumbnail,
        metadata: inputVariant.metadata,
        id: existingVariant.id,
      }
    : inputVariant
}

function buildUpdateProductPayload(params: {
  existingProduct: ProductDTO
  inputProduct: ProductInput
  existingCategories: ExistingCategory[]
  existingShippingProfiles: ExistingShippingProfile[]
  existingSalesChannels: ExistingSalesChannel[]
}): ProcessProductOptionsForImportInput["products"][number] {
  const {
    existingProduct,
    inputProduct,
    existingCategories,
    existingShippingProfiles,
    existingSalesChannels,
  } = params

  return {
    id: existingProduct.id,
    title: inputProduct.title,
    category_ids: inputProduct.categories?.map(
      (inputCat) => resolveCategory(existingCategories, inputCat.handle).id
    ),
    description: inputProduct.description,
    weight: inputProduct.weight,
    status: inputProduct.status || ProductStatus.PUBLISHED,
    metadata: inputProduct.metadata,
    shipping_profile_id: resolveShippingProfileId(
      existingShippingProfiles,
      inputProduct.shippingProfileName
    ),
    thumbnail: inputProduct.thumbnail || existingProduct.thumbnail,
    images: inputProduct.images ?? [],
    options: inputProduct.options,
    variants: inputProduct.variants?.map((inputVariant) =>
      buildUpdateVariant(existingProduct, inputVariant)
    ),
    sales_channels: inputProduct.salesChannelNames.map((name) =>
      resolveSalesChannel(existingSalesChannels, name)
    ),
  }
}

function buildCreateVariant(
  inputVariant: NonNullable<ProductInput["variants"]>[number]
) {
  return {
    title: inputVariant.title,
    sku: inputVariant.sku,
    ean: inputVariant.ean,
    material: inputVariant.material,
    options: inputVariant.options,
    thumbnail: inputVariant.thumbnail,
    prices: inputVariant.prices?.map((price) => ({
      amount: price.amount,
      currency_code: price.currency_code,
    })),
    metadata: inputVariant.metadata,
  }
}

function buildCreateProductPayload(params: {
  inputProduct: ProductInput
  existingCategories: ExistingCategory[]
  existingShippingProfiles: ExistingShippingProfile[]
  existingSalesChannels: ExistingSalesChannel[]
}) {
  const {
    inputProduct,
    existingCategories,
    existingShippingProfiles,
    existingSalesChannels,
  } = params

  return {
    title: inputProduct.title,
    category_ids: inputProduct.categories?.map(
      (inputCat) => resolveCategory(existingCategories, inputCat.handle).id
    ),
    description: inputProduct.description,
    handle: inputProduct.handle,
    weight: inputProduct.weight,
    status: inputProduct.status || ProductStatus.PUBLISHED,
    metadata: inputProduct.metadata,
    shipping_profile_id: resolveShippingProfileId(
      existingShippingProfiles,
      inputProduct.shippingProfileName
    ),
    thumbnail: inputProduct.thumbnail,
    images: inputProduct.images ?? [],
    options: inputProduct.options,
    variants: inputProduct.variants?.map(buildCreateVariant),
    sales_channels: inputProduct.salesChannelNames.map((name) =>
      resolveSalesChannel(existingSalesChannels, name)
    ),
  }
}

function buildUpdateProductPayloads(params: {
  input: CreateProductsStepInput
  existingProducts: ProductDTO[]
  existingCategories: ExistingCategory[]
  existingShippingProfiles: ExistingShippingProfile[]
  existingSalesChannels: ExistingSalesChannel[]
  productVariantImages: VariantImagesRegistry
}) {
  return params.existingProducts.flatMap((existingProduct) => {
    const inputProduct = params.input.find(
      (product) => product.handle === existingProduct.handle
    )

    if (!inputProduct) {
      return []
    }

    registerProductSideInputs(inputProduct, params.productVariantImages)

    return [
      buildUpdateProductPayload({
        existingProduct,
        inputProduct,
        existingCategories: params.existingCategories,
        existingShippingProfiles: params.existingShippingProfiles,
        existingSalesChannels: params.existingSalesChannels,
      }),
    ]
  })
}

function buildCreateProductPayloads(params: {
  missingProducts: ProductInput[]
  existingCategories: ExistingCategory[]
  existingShippingProfiles: ExistingShippingProfile[]
  existingSalesChannels: ExistingSalesChannel[]
  productVariantImages: VariantImagesRegistry
}) {
  return params.missingProducts.map((inputProduct) => {
    registerProductSideInputs(inputProduct, params.productVariantImages)

    return buildCreateProductPayload({
      inputProduct,
      existingCategories: params.existingCategories,
      existingShippingProfiles: params.existingShippingProfiles,
      existingSalesChannels: params.existingSalesChannels,
    })
  })
}

async function applyVariantImageUpdates(params: {
  container: WorkflowContainer
  products: ProductDTO[]
  productVariantImages: VariantImagesRegistry
  result: string[]
}): Promise<void> {
  for (const product of params.products) {
    const variantImageInputs = prepareVariantImagesWorkflowInput(
      product,
      params.productVariantImages
    )

    for (const variantImageInput of variantImageInputs ?? []) {
      await batchVariantImagesWorkflow(params.container).run({
        input: variantImageInput,
      })
    }

    params.result.push(product.id)
  }
}

function getDesiredBrandHandleByProduct(brands: BrandRegistry) {
  const desiredBrandHandleByProduct = new Map<string, string>()

  for (const brand of brands.values()) {
    for (const productHandle of brand.products) {
      const existing = desiredBrandHandleByProduct.get(productHandle)
      if (existing && existing !== brand.handle) {
        throw new Error(
          `Product "${productHandle}" resolves to multiple brands: "${existing}" and "${brand.handle}"`
        )
      }
      desiredBrandHandleByProduct.set(productHandle, brand.handle)
    }
  }

  return desiredBrandHandleByProduct
}

async function listExistingBrandsById(
  brandService: BrandModuleService,
  brandIds: string[]
) {
  const brands: ExistingBrand[] = []

  for (const brandIdChunk of chunkArray(brandIds)) {
    const chunkBrands = await brandService.listBrands(
      {
        id: { $in: brandIdChunk },
      },
      {
        select: ["id", "handle", "title", "deleted_at"],
        take: brandIdChunk.length,
        withDeleted: true,
      }
    )
    brands.push(...(chunkBrands as ExistingBrand[]))
  }

  return new Map(brands.map((brand) => [brand.id, brand]))
}

function groupProductBrandLinks(links: ProductBrandLinkRecord[]) {
  const linksByProductId = new Map<string, ProductBrandLinkRecord[]>()

  for (const link of links) {
    if (!(link.product_id && link.brand_id)) {
      throw new Error(
        "Product-brand link query returned a row without product_id or brand_id"
      )
    }
    const productLinks = linksByProductId.get(link.product_id) ?? []
    productLinks.push(link)
    linksByProductId.set(link.product_id, productLinks)
  }

  return linksByProductId
}

export function filterSeedLinksToActiveBrands(params: {
  linkedBrandsById: Map<string, ExistingBrand>
  productHandle: string
  productLinks: ProductBrandLinkRecord[]
}) {
  return params.productLinks.filter((link) => {
    const linkedBrandId = link.brand_id
    const linkedBrand = linkedBrandId
      ? params.linkedBrandsById.get(linkedBrandId)
      : undefined

    if (!linkedBrand) {
      throw new Error(
        `Product "${params.productHandle}" links to missing brand "${linkedBrandId}"`
      )
    }

    return !linkedBrand.deleted_at
  })
}

function assertExistingProductBrandLinkMatchesSeed(params: {
  desiredBrandHandleByProduct: Map<string, string>
  linkedBrandsById: Map<string, ExistingBrand>
  productHandleById: Map<string, string>
  productId: string
  productLinks: ProductBrandLinkRecord[]
}) {
  const productHandle = params.productHandleById.get(params.productId)
  if (!productHandle) {
    throw new Error(
      `Linked product "${params.productId}" was not found in seed input`
    )
  }
  const activeProductLinks = filterSeedLinksToActiveBrands({
    linkedBrandsById: params.linkedBrandsById,
    productHandle,
    productLinks: params.productLinks,
  })

  if (!activeProductLinks.length) {
    return
  }

  if (activeProductLinks.length > 1) {
    throw new Error(
      `Product "${productHandle}" already has ${activeProductLinks.length} active brand links`
    )
  }

  const linkedBrandId = activeProductLinks[0]?.brand_id
  const linkedBrand = linkedBrandId
    ? params.linkedBrandsById.get(linkedBrandId)
    : undefined
  if (!linkedBrand) {
    throw new Error(
      `Product "${productHandle}" links to missing brand "${linkedBrandId}"`
    )
  }

  const desiredHandle = params.desiredBrandHandleByProduct.get(productHandle)
  if (linkedBrand.handle !== desiredHandle) {
    throw new Error(
      `Product "${productHandle}" is already linked to brand "${linkedBrand.title}" (${linkedBrand.handle}), not requested brand "${desiredHandle}"`
    )
  }
}

async function assertNoConflictingExistingProductBrandLinks(params: {
  brandService: BrandModuleService
  brands: BrandRegistry
  container: WorkflowContainer
  existingProducts: ProductDTO[]
}) {
  const desiredBrandHandleByProduct = getDesiredBrandHandleByProduct(
    params.brands
  )
  const relevantProducts = params.existingProducts.filter((product) =>
    desiredBrandHandleByProduct.has(product.handle)
  )
  const links = await getCurrentProductBrandLinks(
    params.container,
    relevantProducts.map((product) => product.id)
  )
  const linkedBrandIds = [
    ...new Set(
      links
        .map((link) => link.brand_id)
        .filter((brandId): brandId is string => !!brandId)
    ),
  ]
  const linkedBrandsById = await listExistingBrandsById(
    params.brandService,
    linkedBrandIds
  )
  const productHandleById = new Map(
    relevantProducts.map((product) => [product.id, product.handle])
  )
  const linksByProductId = groupProductBrandLinks(links)

  for (const [productId, productLinks] of linksByProductId) {
    assertExistingProductBrandLinkMatchesSeed({
      desiredBrandHandleByProduct,
      linkedBrandsById,
      productHandleById,
      productId,
      productLinks,
    })
  }
}

function mergeExistingBrandAttributes(
  existing: ExistingBrand,
  incoming: BrandRegistryEntry
) {
  const attributes = new Map<string, { name: string; value: string }>()
  for (const attribute of existing.attributes ?? []) {
    const persistedName = attribute.attributeType?.name?.trim()
    if (!persistedName) {
      throw new Error(
        `Existing brand "${existing.title}" has an attribute without an attribute type name`
      )
    }
    const key = persistedName.toLowerCase()
    const prior = attributes.get(key)
    if (prior !== undefined && prior.value !== attribute.value) {
      throw new Error(
        `Existing brand "${existing.title}" has conflicting values for attribute "${key}"`
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
    if (existingAttribute !== undefined && existingAttribute.value !== value) {
      throw new Error(
        `Seed attribute "${name}" conflicts with persisted brand "${existing.title}"`
      )
    }
    if (existingAttribute === undefined) {
      attributes.set(name, { name, value })
      changed = true
    }
  }

  return {
    attributes: [...attributes.values()],
    changed,
  }
}

function buildExistingBrandEnrichment(
  existing: ExistingBrand,
  incoming: BrandRegistryEntry
): Partial<BrandInput> {
  const update: Partial<BrandInput> = {}
  const mergedAttributes = mergeExistingBrandAttributes(existing, incoming)
  if (mergedAttributes.changed) {
    update.attributes = mergedAttributes.attributes
  }

  for (const field of SEED_BRAND_STRING_FIELDS) {
    const incomingValue = incoming[field]
    if (incomingValue === undefined) {
      continue
    }

    const existingValue = normalizeSeedText(existing[field])
    if (existingValue !== undefined && existingValue !== incomingValue) {
      throw new Error(
        `Seed ${field} conflicts with persisted brand "${existing.title}"`
      )
    }
    if (existingValue === undefined) {
      update[field] = incomingValue
    }
  }

  if (
    incoming.gpsr_manufactured_outside_eu === true &&
    existing.gpsr_manufactured_outside_eu !== true
  ) {
    update.gpsr_manufactured_outside_eu = true
  }

  return update
}

function toCreateBrandInput(brand: BrandRegistryEntry) {
  return {
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
  }
}

async function findExistingSeedBrand(
  brandService: BrandModuleService,
  brandData: BrandRegistryEntry
): Promise<ExistingBrand | undefined> {
  const existingBrands = (await brandService.listBrands(
    {
      handle: brandData.handle,
    },
    {
      relations: ["attributes", "attributes.attributeType"],
      withDeleted: true,
    }
  )) as ExistingBrand[]

  if (existingBrands.length > 1) {
    throw new Error(`Multiple brands use seed handle "${brandData.handle}"`)
  }

  return existingBrands[0]
}

function assertExistingSeedBrandIsUsable(
  existing: ExistingBrand,
  brandData: BrandRegistryEntry
) {
  if (existing.deleted_at) {
    throw new Error(
      `Brand handle "${brandData.handle}" belongs to soft-deleted brand "${existing.title}"; restore it explicitly before seeding`
    )
  }

  const enrichment = buildExistingBrandEnrichment(existing, brandData)
  const effectiveState: BrandScalarWriteInput = {
    gpsr_contact_email:
      enrichment.gpsr_contact_email ?? existing.gpsr_contact_email,
    gpsr_european_reseller_contact_email:
      enrichment.gpsr_european_reseller_contact_email ??
      existing.gpsr_european_reseller_contact_email,
    gpsr_european_reseller_manufacturing_company_name:
      enrichment.gpsr_european_reseller_manufacturing_company_name ??
      existing.gpsr_european_reseller_manufacturing_company_name,
    gpsr_european_reseller_postal_address:
      enrichment.gpsr_european_reseller_postal_address ??
      existing.gpsr_european_reseller_postal_address,
    gpsr_manufactured_outside_eu:
      enrichment.gpsr_manufactured_outside_eu ??
      existing.gpsr_manufactured_outside_eu ??
      false,
    gpsr_manufacturing_company_name:
      enrichment.gpsr_manufacturing_company_name ??
      existing.gpsr_manufacturing_company_name,
    gpsr_postal_address:
      enrichment.gpsr_postal_address ?? existing.gpsr_postal_address,
    handle: existing.handle,
    title: existing.title,
  }
  validateBrandGpsrState(effectiveState, existing.handle)
}

async function assertSeedBrandsCompatibleWithPersistence(
  brandService: BrandModuleService,
  brands: BrandRegistry
) {
  for (const brandData of brands.values()) {
    const existing = await findExistingSeedBrand(brandService, brandData)
    if (existing) {
      assertExistingSeedBrandIsUsable(existing, brandData)
    } else {
      validateBrandGpsrState(toCreateBrandInput(brandData), brandData.handle)
    }
  }
}

async function upsertSeedBrand(params: {
  brandData: BrandRegistryEntry
  brandService: BrandModuleService
  container: WorkflowContainer
}): Promise<ExistingBrand> {
  const existing = await findExistingSeedBrand(
    params.brandService,
    params.brandData
  )
  if (!existing) {
    const { result } = await createBrandsWorkflow(params.container).run({
      input: {
        brands: [toCreateBrandInput(params.brandData)],
      },
    })
    const created = result[0] as ExistingBrand | undefined
    if (!created) {
      throw new Error(`Brand "${params.brandData.title}" was not created`)
    }
    return created
  }

  assertExistingSeedBrandIsUsable(existing, params.brandData)

  const update = buildExistingBrandEnrichment(existing, params.brandData)
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

async function upsertSeedBrandsByHandle(params: {
  brandService: BrandModuleService
  brands: BrandRegistry
  container: WorkflowContainer
}) {
  const brandIdsByHandle = new Map<string, string>()

  for (const brandData of params.brands.values()) {
    const brand = await upsertSeedBrand({
      brandData,
      brandService: params.brandService,
      container: params.container,
    })
    brandIdsByHandle.set(brandData.handle, brand.id)
  }

  return brandIdsByHandle
}

async function listSeedProductsByHandle(params: {
  desiredBrandHandleByProduct: Map<string, string>
  productService: IProductModuleService
}) {
  const products: ProductDTO[] = []

  for (const handleChunk of chunkArray([
    ...params.desiredBrandHandleByProduct.keys(),
  ])) {
    const chunkProducts = await params.productService.listProducts(
      { handle: { $in: handleChunk } },
      {
        select: ["id", "handle"],
        take: handleChunk.length,
      }
    )
    products.push(...chunkProducts)
  }

  if (products.length !== params.desiredBrandHandleByProduct.size) {
    const foundHandles = new Set(products.map((product) => product.handle))
    const missingHandles = [
      ...params.desiredBrandHandleByProduct.keys(),
    ].filter((handle) => !foundHandles.has(handle))
    throw new Error(
      `Products were not found for brand linking: ${missingHandles.join(", ")}`
    )
  }

  return products
}

export function buildDesiredProductBrandLinks(params: {
  brandIdsByHandle: Map<string, string>
  desiredBrandHandleByProduct: Map<string, string>
  products: ProductDTO[]
}) {
  const desiredLinks: { brandId: string; productId: string }[] = []

  for (const product of params.products) {
    const desiredHandle = params.desiredBrandHandleByProduct.get(product.handle)
    const desiredBrandId = desiredHandle
      ? params.brandIdsByHandle.get(desiredHandle)
      : undefined
    if (!desiredBrandId) {
      throw new Error(
        `Resolved brand was not found for product "${product.handle}"`
      )
    }

    desiredLinks.push({
      brandId: desiredBrandId,
      productId: product.id,
    })
  }

  return desiredLinks
}

async function reconcileProductBrandLinks(
  container: WorkflowContainer,
  links: { brandId: string; productId: string }[]
) {
  for (const link of links) {
    await setProductBrandsWorkflow(container).run({
      input: {
        brand_ids: [link.brandId],
        fail_on_conflict: true,
        product_id: link.productId,
      },
    })
  }
}

async function linkBrands(params: {
  container: WorkflowContainer
  productService: IProductModuleService
  brandService: BrandModuleService
  brands: BrandRegistry
}): Promise<void> {
  if (!params.brands.size) {
    return
  }

  const brandIdsByHandle = await upsertSeedBrandsByHandle(params)
  const desiredBrandHandleByProduct = getDesiredBrandHandleByProduct(
    params.brands
  )
  const products = await listSeedProductsByHandle({
    desiredBrandHandleByProduct,
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
      Modules.PRODUCT
    )
    const fulfillmentService = container.resolve<IFulfillmentModuleService>(
      Modules.FULFILLMENT
    )
    const salesChannelService = container.resolve<ISalesChannelModuleService>(
      Modules.SALES_CHANNEL
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
      }
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
      }
    )

    await assertNoConflictingExistingProductBrandLinks({
      brandService,
      brands,
      container,
      existingProducts,
    })
    await assertSeedBrandsCompatibleWithPersistence(brandService, brands)

    ensureUniqueVariantSkus(input, existingProducts, logger)

    const missingProducts = input.filter(
      (i) => !existingProducts.find((j) => j.handle === i.handle)
    )
    const updateProducts = existingProducts.flatMap((existingProduct) =>
      buildUpdateProductPayloads({
        input,
        existingProducts: [existingProduct],
        existingCategories,
        existingShippingProfiles,
        existingSalesChannels,
        productVariantImages,
      })
    )

    if (missingProducts.length !== 0) {
      logger.info("Creating missing products...")

      const createProducts = buildCreateProductPayloads({
        missingProducts,
        existingCategories,
        existingShippingProfiles,
        existingSalesChannels,
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
          select: [
            "id",
            "handle",
            "images.id",
            "images.url",
            "variants.sku",
            "variants.images.id",
            "variants.images.url",
          ],
          relations: ["images", "variants", "variants.images"],
        }
      )

      logger.info("Creating product variant images...")

      await applyVariantImageUpdates({
        container,
        products,
        productVariantImages,
        result,
      })
    }

    if (updateProducts.length !== 0) {
      logger.info("Updating existing products...")

      const updatedIds: string[] = []

      for (const updateProductsChunk of chunkArray(updateProducts)) {
        const updateResult = await batchProductsWorkflow(container).run({
          input: {
            update: updateProductsChunk,
          },
        })

        for (const updated of updateResult.result.updated) {
          updatedIds.push(updated.id)
        }
      }

      const products = await productService.listProducts(
        { id: { $in: updatedIds } },
        {
          select: [
            "id",
            "handle",
            "images.id",
            "images.url",
            "variants.sku",
            "variants.images.id",
            "variants.images.url",
          ],
          relations: ["images", "variants", "variants.images"],
        }
      )

      logger.info("Updating product variant images...")

      await applyVariantImageUpdates({
        container,
        products,
        productVariantImages,
        result,
      })
    }

    await linkBrands({
      container,
      productService,
      brandService,
      brands,
    })

    return new StepResponse({
      result,
    })
  }
)
