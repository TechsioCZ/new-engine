import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type {
  ProductInput,
  UpsertProductsBatchInput,
  UpsertProductsBatchOutput,
  UpsertProductsBatchResult,
} from "../types"
import {
  type CreateProductPayload,
  ProductBatchClient,
  type ProductCache,
  type ResolvedCategoryMap,
} from "./client"
import { productBatchClientHelper } from "./client-helper"

type ProductIdentifierEcho = Pick<
  UpsertProductsBatchResult,
  "identifier_type" | "sku" | "ean" | "erp_id"
>

type CreateProductRequest = {
  index: number
  echo: ProductIdentifierEcho
  payload: CreateProductPayload
}

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error"

const buildFailedResult = (
  echo: ProductIdentifierEcho,
  error: string
): UpsertProductsBatchResult => ({
  ...echo,
  status: "failed",
  error,
})

const processProductForBatch = async ({
  client,
  defaultSalesChannelId,
  index,
  logger,
  product,
  productCache,
  resolvedCategories,
  results,
  toCreate,
}: {
  client: ProductBatchClient
  defaultSalesChannelId: string | null
  index: number
  logger: Logger
  product: ProductInput
  productCache: ProductCache
  resolvedCategories: ResolvedCategoryMap
  results: UpsertProductsBatchResult[]
  toCreate: CreateProductRequest[]
}) => {
  const echo = productBatchClientHelper.buildIdentifierEcho(product)
  try {
    const existing = productBatchClientHelper.findExistingProduct(
      product,
      productCache
    )
    if (!existing) {
      const payload = productBatchClientHelper.buildCreatePayload(
        product,
        resolvedCategories,
        defaultSalesChannelId
      )
      toCreate.push({ index, echo, payload })
      return
    }

    await client.updateProductCore(existing.id, product, resolvedCategories)
    const variantIds = await client.upsertVariantsForExistingProduct(
      product,
      existing
    )
    results[index] = {
      ...echo,
      status: "updated",
      product_id: existing.id,
      variant_ids: variantIds,
    }
  } catch (error) {
    const message = toErrorMessage(error)
    logger.warn(
      `[symmy-plugin] Failed to upsert product (${echo.identifier_type}): ${message}`
    )
    results[index] = buildFailedResult(echo, message)
  }
}

const processCreateRequests = async (
  client: ProductBatchClient,
  logger: Logger,
  results: UpsertProductsBatchResult[],
  toCreate: CreateProductRequest[]
) => {
  if (!toCreate.length) {
    return
  }

  try {
    const createdProducts = await client.createProducts(
      toCreate.map((item) => item.payload)
    )
    for (const [createIndex, item] of toCreate.entries()) {
      const createdProduct = createdProducts[createIndex]
      results[item.index] = createdProduct
        ? {
            ...item.echo,
            status: "created",
            product_id: createdProduct.id,
            variant_ids: (createdProduct.variants ?? []).map(
              (variant) => variant.id
            ),
          }
        : buildFailedResult(
            item.echo,
            "createProductsWorkflow returned fewer products than requested"
          )
    }
  } catch (error) {
    const message = toErrorMessage(error)
    logger.warn(
      `[symmy-plugin] Failed to create ${toCreate.length} products in batch: ${message}`
    )
    for (const item of toCreate) {
      results[item.index] = buildFailedResult(item.echo, message)
    }
  }
}

export const processProductsBatchStep = createStep(
  "symmy-process-products-batch",
  async (input: UpsertProductsBatchInput, { container }) => {
    const client = new ProductBatchClient(container)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const [productCache, resolvedCategories, defaultSalesChannelId] =
      await Promise.all([
        client.preload(input.products),
        client.resolveCategoriesForBatch(input.products),
        client.resolveDefaultSalesChannelId(),
      ])
    const results: UpsertProductsBatchResult[] = []
    const toCreate: CreateProductRequest[] = []

    for (const [index, product] of input.products.entries()) {
      await processProductForBatch({
        client,
        defaultSalesChannelId,
        index,
        logger,
        product,
        productCache,
        resolvedCategories,
        results,
        toCreate,
      })
    }
    await processCreateRequests(client, logger, results, toCreate)

    const processed = results.filter((r) => r.status !== "failed").length
    const failed = results.length - processed

    const output: UpsertProductsBatchOutput = {
      success: failed === 0,
      processed,
      failed,
      results,
    }
    return new StepResponse(output)
  }
)
