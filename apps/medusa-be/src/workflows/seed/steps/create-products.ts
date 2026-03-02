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

function ensureUniqueVariantSkus(
  inputProducts: ProductInput[],
  existingProducts: ProductDTO[],
  logger: Logger
) {
  const existingProductsByHandle = new Map(
    existingProducts.map((product) => [product.handle, product])
  )
  const usedSkus = new Set<string>()
  let renamedSkus = 0

  for (const product of existingProducts) {
    for (const variant of product.variants ?? []) {
      if (variant.sku) {
        usedSkus.add(variant.sku)
      }
    }
  }

  for (const inputProduct of inputProducts) {
    const existingProduct = existingProductsByHandle.get(inputProduct.handle)
    const existingSkusOnProduct = new Set(
      (existingProduct?.variants ?? []).map((variant) => variant.sku).filter(Boolean)
    )

    for (const [index, variant] of (inputProduct.variants ?? []).entries()) {
      const originalSku = variant.sku?.trim()
      const baseSku = originalSku || `${inputProduct.handle}-variant-${index + 1}`
      const isExistingVariant =
        !!originalSku && existingSkusOnProduct.has(originalSku)

      if (isExistingVariant) {
        continue
      }

      let candidate = baseSku
      let suffix = 2

      while (usedSkus.has(candidate)) {
        candidate = `${baseSku}-${suffix}`
        suffix += 1
      }

      if (candidate !== variant.sku) {
        variant.metadata = {
          ...(variant.metadata ?? {}),
          source_sku: variant.sku,
        }
        variant.sku = candidate
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

  return undefined
}

function getSourceVariantId(variant: {
  metadata?: Record<string, unknown> | null
}): string | undefined {
  const metadata = variant.metadata ?? undefined
  if (!metadata) {
    return undefined
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
      const metadata = (variant as { metadata?: Record<string, unknown> | null })
        .metadata
      return getSourceVariantId({ metadata }) === sourceVariantId
    })

    if (bySourceId) {
      return bySourceId
    }
  }

  return (existingProduct.variants ?? []).find((variant) => {
    return variant.sku === inputVariant.sku
  })
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

    const productVariantImages = new Map<
      string,
      Map<string, ProductVariantImagesInput>
    >()
    const producers = new Map<
      string,
      { attributes: Map<string, string>; products: string[] }
    >()

    const existingCategories = await productService.listProductCategories(
      {
        handle: input.reduce((acc: string[], i) => {
          i.categories?.map((cat) => acc.push(cat.handle))
          return acc
        }, []),
      },
      {
        select: ["id", "handle"],
      }
    )
    const allSalesChannelNames = new Set<string>()
    for (const i of input) {
      for (const name of i.salesChannelNames) {
        allSalesChannelNames.add(name)
      }
    }
    const existingSalesChannels = await salesChannelService.listSalesChannels({
      name: [...allSalesChannelNames],
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
    const updateProducts = existingProducts.flatMap((existingProduct) => {
      const inputProduct = input.find(
        (product) => product.handle === existingProduct.handle
      )

      if (!inputProduct) {
        return []
      }

      processProductProducerInput(inputProduct, producers)
      processProductVariantImagesInput(inputProduct, productVariantImages)

      return [
        {
          id: existingProduct.id,
          title: inputProduct.title,
          categories: inputProduct.categories?.map((inputCat) => {
            const existingCategory = existingCategories.find(
              (cat) => cat.handle === inputCat.handle
            )
            if (!existingCategory) {
              throw new Error(`Category "${inputCat.handle}" not found`)
            }
            return existingCategory
          }),
          description: inputProduct.description,
          weight: inputProduct.weight,
          status: inputProduct.status || ProductStatus.PUBLISHED,
          metadata: inputProduct.metadata,
          shipping_profile_id: (() => {
            const profile = existingShippingProfiles.find(
              (sp) => sp.name === inputProduct.shippingProfileName
            )
            if (!profile) {
              throw new Error(
                `Shipping profile "${inputProduct.shippingProfileName}" not found`
              )
            }
            return profile.id
          })(),
          thumbnail: inputProduct.thumbnail || existingProduct.thumbnail,
          images: inputProduct.images ?? [],
          options: inputProduct.options,
          variants: inputProduct.variants?.map((inputVariant) => {
            const existingVariant = findExistingVariant(
              existingProduct,
              inputVariant
            )
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
          }),
          sales_channels: inputProduct.salesChannelNames.map((name) => {
            const channel = existingSalesChannels.find((sc) => sc.name === name)
            if (!channel) {
              throw new Error(`Sales channel "${name}" not found`)
            }
            return channel
          }),
        },
      ]
    })

    if (missingProducts.length !== 0) {
      logger.info("Creating missing products...")

      const createProducts = missingProducts.map((p) => {
        processProductProducerInput(p, producers)
        processProductVariantImagesInput(p, productVariantImages)

        return {
          title: p.title,
          category_ids: p.categories?.map((inputCat) => {
            const existingCategory = existingCategories.find(
              (cat) => cat.handle === inputCat.handle
            )
            if (!existingCategory) {
              throw new Error(`Category "${inputCat.handle}" not found`)
            }
            return existingCategory.id
          }),
          description: p.description,
          handle: p.handle,
          weight: p.weight,
          status: p.status || ProductStatus.PUBLISHED,
          metadata: p.metadata,
          shipping_profile_id: (() => {
            const profile = existingShippingProfiles.find(
              (sp) => sp.name === p.shippingProfileName
            )
            if (!profile) {
              throw new Error(
                `Shipping profile "${p.shippingProfileName}" not found`
              )
            }
            return profile.id
          })(),
          thumbnail: p.thumbnail,
          images: p.images ?? [],
          options: p.options,
          variants: p.variants?.map((v) => ({
            title: v.title,
            sku: v.sku,
            ean: v.ean,
            material: v.material,
            options: v.options,
            thumbnail: v.thumbnail,
            prices: v.prices?.map((price) => ({
              amount: price.amount,
              currency_code: price.currency_code,
            })),
            metadata: v.metadata,
          })),
          sales_channels: p.salesChannelNames.map((name) => {
            const channel = existingSalesChannels.find((sc) => sc.name === name)
            if (!channel) {
              throw new Error(`Sales channel "${name}" not found`)
            }
            return channel
          }),
        }
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

      for (const product of products) {
        const variantImageInputs = prepareVariantImagesWorkflowInput(
          product,
          productVariantImages
        )
        if (variantImageInputs !== undefined) {
          for (const variantImageInput of variantImageInputs) {
            await batchVariantImagesWorkflow(container).run({
              input: variantImageInput,
            })
          }
        }

        result.push(product.id)
      }
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

      for (const product of products) {
        const variantImageInputs = prepareVariantImagesWorkflowInput(
          product,
          productVariantImages
        )
        if (variantImageInputs !== undefined) {
          for (const variantImageInput of variantImageInputs) {
            await batchVariantImagesWorkflow(container).run({
              input: variantImageInput,
            })
          }
        }
        result.push(product.id)
      }
    }

    // add producer info
    for (const [key, producerData] of producers.entries()) {
      const attributes = [...producerData.attributes.entries()].map(
        ([name, attrValue]) => ({
          name,
          value: attrValue,
        })
      )

      const producer = await producerService.upsertProducer({
        name: key,
        attributes,
      })

      const products = await productService.listProducts(
        { handle: { $in: producerData.products } },
        {
          select: ["id"],
        }
      )

      const links = products.map((p) => ({
        [Modules.PRODUCT]: {
          product_id: p.id,
        },
        [PRODUCER_MODULE]: {
          producer_id: producer.id,
        },
      }))

      await link.create(links)
    }

    return new StepResponse({
      result,
    })
  }
)
