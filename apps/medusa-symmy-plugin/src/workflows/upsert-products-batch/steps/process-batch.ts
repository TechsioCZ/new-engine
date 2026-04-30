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
  type ExistingProductIndex,
  ProductBatchClient,
  type ProductBatchPayload,
  type ResolvedCategoryMap,
  type UpdateProductPayload,
} from "./client"
import { productBatchClientMapperHelper } from "./client-mapper-helper"

type ProductIdentifierEcho = Pick<
  UpsertProductsBatchResult,
  "identifier_type" | "sku" | "ean" | "erp_id"
>

type CreateProductRequest = {
  index: number
  echo: ProductIdentifierEcho
  payload: CreateProductPayload
}

type UpdateProductRequest = {
  index: number
  echo: ProductIdentifierEcho
  existing: { id: string; variants: { id: string }[] }
  payload: UpdateProductPayload
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

const processProductForBatch = ({
  defaultSalesChannelId,
  index,
  logger,
  product,
  existingProductIndex,
  resolvedCategories,
  results,
  toCreate,
  toUpdate,
}: {
  defaultSalesChannelId: string | null
  index: number
  logger: Logger
  product: ProductInput
  existingProductIndex: ExistingProductIndex
  resolvedCategories: ResolvedCategoryMap
  results: UpsertProductsBatchResult[]
  toCreate: CreateProductRequest[]
  toUpdate: UpdateProductRequest[]
}) => {
  const echo = productBatchClientMapperHelper.buildIdentifierEcho(product)
  try {
    const existing = productBatchClientMapperHelper.findExistingProduct(
      product,
      existingProductIndex
    )
    if (!existing) {
      const payload = productBatchClientMapperHelper.buildCreatePayload(
        product,
        resolvedCategories,
        defaultSalesChannelId
      )
      toCreate.push({ index, echo, payload })
      return
    }

    const payload = productBatchClientMapperHelper.buildUpdatePayload(
      existing.id,
      product,
      existing,
      resolvedCategories
    )
    toUpdate.push({ index, echo, existing, payload })
  } catch (error) {
    const message = toErrorMessage(error)
    logger.warn(
      `[symmy-plugin] Failed to upsert product (${echo.identifier_type}): ${message}`
    )
    results[index] = buildFailedResult(echo, message)
  }
}

const getVariantIds = (
  product: { variants?: { id: string }[] } | undefined,
  fallback: { variants?: { id: string }[] } | undefined
) =>
  (product?.variants ?? fallback?.variants ?? []).map((variant) => variant.id)

const processBatchRequests = async ({
  client,
  logger,
  results,
  toCreate,
  toUpdate,
}: {
  client: ProductBatchClient
  logger: Logger
  results: UpsertProductsBatchResult[]
  toCreate: CreateProductRequest[]
  toUpdate: UpdateProductRequest[]
}) => {
  if (!(toCreate.length || toUpdate.length)) {
    return
  }

  try {
    const payload: ProductBatchPayload = {
      create: toCreate.map((item) => item.payload),
      update: toUpdate.map((item) => item.payload),
    }
    const { created, updated } = await client.applyBatch(payload)
    for (const [createIndex, item] of toCreate.entries()) {
      const createdProduct = created[createIndex]
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
            "batchProductsWorkflow returned fewer created products than requested"
          )
    }
    for (const [updateIndex, item] of toUpdate.entries()) {
      const updatedProduct = updated[updateIndex]
      results[item.index] = updatedProduct
        ? {
            ...item.echo,
            status: "updated",
            product_id: updatedProduct.id,
            variant_ids: getVariantIds(updatedProduct, item.existing),
          }
        : buildFailedResult(
            item.echo,
            "batchProductsWorkflow returned fewer updated products than requested"
          )
    }
  } catch (error) {
    const message = toErrorMessage(error)
    logger.warn(
      `[symmy-plugin] Failed to apply product batch (${toCreate.length} create, ${toUpdate.length} update): ${message}`
    )
    for (const item of [...toCreate, ...toUpdate]) {
      results[item.index] = buildFailedResult(item.echo, message)
    }
  }
}

export const processProductsBatchStep = createStep(
  "symmy-process-products-batch",
  async (input: UpsertProductsBatchInput, { container }) => {
    const client = new ProductBatchClient(container)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const [existingProductIndex, resolvedCategories, defaultSalesChannelId] =
      await Promise.all([
        client.preload(input.products),
        client.resolveCategoriesForBatch(input.products),
        client.resolveDefaultSalesChannelId(),
      ])
    const results: UpsertProductsBatchResult[] = []
    const toCreate: CreateProductRequest[] = []
    const toUpdate: UpdateProductRequest[] = []

    for (const [index, product] of input.products.entries()) {
      processProductForBatch({
        defaultSalesChannelId,
        index,
        logger,
        product,
        existingProductIndex,
        resolvedCategories,
        results,
        toCreate,
        toUpdate,
      })
    }
    await processBatchRequests({
      client,
      logger,
      results,
      toCreate,
      toUpdate,
    })

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
