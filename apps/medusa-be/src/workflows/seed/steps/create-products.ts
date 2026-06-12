import type { Link } from "@medusajs/framework/modules-sdk"
import type {
  IFulfillmentModuleService,
  IProductModuleService,
  ISalesChannelModuleService,
  Logger,
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
  batchVariantImagesWorkflow,
  createProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { PRODUCER_MODULE } from "../../../modules/producer"
import type ProducerModuleService from "../../../modules/producer/service"

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
  producer?: {
    title?: string
    attributes?: {
      name: string
      value: string
    }[]
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
type ProducerRegistry = Map<
  string,
  { attributes: Map<string, string>; products: string[] }
>
type VariantImagesRegistry = Map<string, Map<string, ProductVariantImagesInput>>
type WorkflowContainer = Parameters<typeof createProductsWorkflow>[0]

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

function processProductProducerInput(
  inputProduct: ProductInput,
  producers: Map<
    string,
    { attributes: Map<string, string>; products: string[] }
  >
) {
  if (!inputProduct.producer?.title) {
    return
  }

  if (!producers.has(inputProduct.producer.title)) {
    producers.set(inputProduct.producer.title, {
      products: [],
      attributes: new Map(),
    })
  }

  const producer = producers.get(inputProduct.producer.title)

  if (!producer) {
    throw new Error(`Producer "${inputProduct.producer.title}" not found`)
  }

  producer.products.push(inputProduct.handle)

  for (const attribute of inputProduct.producer.attributes ?? []) {
    if (!producer.attributes.has(attribute.name)) {
      producer.attributes.set(attribute.name, attribute.value)
    }
  }
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
  producers: ProducerRegistry,
  productVariantImages: VariantImagesRegistry
): void {
  processProductProducerInput(inputProduct, producers)
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
}) {
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
    categories: inputProduct.categories?.map((inputCat) =>
      resolveCategory(existingCategories, inputCat.handle)
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
  producers: ProducerRegistry
  productVariantImages: VariantImagesRegistry
}) {
  return params.existingProducts.flatMap((existingProduct) => {
    const inputProduct = params.input.find(
      (product) => product.handle === existingProduct.handle
    )

    if (!inputProduct) {
      return []
    }

    registerProductSideInputs(
      inputProduct,
      params.producers,
      params.productVariantImages
    )

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
  producers: ProducerRegistry
  productVariantImages: VariantImagesRegistry
}) {
  return params.missingProducts.map((inputProduct) => {
    registerProductSideInputs(
      inputProduct,
      params.producers,
      params.productVariantImages
    )

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

async function linkProducers(params: {
  link: Link
  productService: IProductModuleService
  producerService: ProducerModuleService
  producers: ProducerRegistry
}): Promise<void> {
  for (const [key, producerData] of params.producers.entries()) {
    const attributes = [...producerData.attributes.entries()].map(
      ([name, attrValue]) => ({
        name,
        value: attrValue,
      })
    )

    const producer = await params.producerService.upsertProducer({
      name: key,
      attributes,
    })

    const products = await params.productService.listProducts(
      { handle: { $in: producerData.products } },
      {
        select: ["id"],
      }
    )

    const links = products.map((product) => ({
      [Modules.PRODUCT]: {
        product_id: product.id,
      },
      [PRODUCER_MODULE]: {
        producer_id: producer.id,
      },
    }))

    await params.link.create(links)
  }
}

export const createProductsStep = createStep(
  CreateProductsStepId,
  async (input: CreateProductsStepInput, { container }) => {
    const result: string[] = []
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
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
    const producerService =
      container.resolve<ProducerModuleService>(PRODUCER_MODULE)

    const productVariantImages: VariantImagesRegistry = new Map()
    const producers: ProducerRegistry = new Map()

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
        producers,
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
        producers,
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

      for (const updateProduct of updateProducts) {
        const updateResult = await updateProductsWorkflow(container).run({
          input: {
            selector: {
              id: updateProduct.id,
            },
            update: updateProduct,
          },
        })

        for (const updated of updateResult.result) {
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

    await linkProducers({
      link,
      productService,
      producerService,
      producers,
    })

    return new StepResponse({
      result,
    })
  }
)
