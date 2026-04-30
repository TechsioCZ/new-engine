import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type {
  UpsertProductsBatchInput,
  UpsertProductsBatchOutput,
  UpsertProductsBatchResult,
} from "../types"
import {
  buildCreatePayload,
  buildIdentifierEcho,
  findExistingProduct,
  ProductBatchClient,
} from "./client"

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

    for (const product of input.products) {
      const echo = buildIdentifierEcho(product)
      try {
        const existing = findExistingProduct(product, productCache)
        if (existing) {
          await client.updateProductCore(
            existing.id,
            product,
            resolvedCategories
          )
          const variantIds = await client.upsertVariantsForExistingProduct(
            product,
            existing
          )
          results.push({
            ...echo,
            status: "updated",
            product_id: existing.id,
            variant_ids: variantIds,
          })
          continue
        }

        const payload = buildCreatePayload(
          product,
          resolvedCategories,
          defaultSalesChannelId
        )
        const createdProduct = await client.createProduct(payload)
        results.push({
          ...echo,
          status: "created",
          product_id: createdProduct.id,
          variant_ids: (createdProduct.variants ?? []).map(
            (variant) => variant.id
          ),
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        logger.warn(
          `[symmy-plugin] Failed to upsert product (${echo.identifier_type}): ${message}`
        )
        results.push({
          ...echo,
          status: "failed",
          error: message,
        })
      }
    }

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
