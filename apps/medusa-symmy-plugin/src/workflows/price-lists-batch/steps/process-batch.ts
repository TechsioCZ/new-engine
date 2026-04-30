import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type {
  ListPriceListsInput,
  ListPriceListsOutput,
  PriceInput,
  PriceListInput,
  UpdatePriceListPricesBatchInput,
  UpdatePriceListPricesBatchOutput,
  UpsertPriceListsBatchInput,
  UpsertPriceListsBatchOutput,
  UpsertPriceListsBatchResult,
} from "../types"
import { PriceListsClient } from "./client"
import { priceListsClientMapperHelper } from "./client-mapper-helper"

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error"

const updatePrices = async (
  client: PriceListsClient,
  priceListId: string,
  prices: PriceInput[]
): Promise<UpdatePriceListPricesBatchOutput> => {
  const [variantMaps, existingPrices] = await Promise.all([
    client.preloadVariants(prices),
    client.preloadPrices(priceListId),
  ])
  const payload = priceListsClientMapperHelper.buildPriceBatchPayload(
    prices,
    variantMaps,
    existingPrices
  )

  try {
    await client.applyPrices(priceListId, payload.create, payload.update)
    priceListsClientMapperHelper.markPriceBatchSuccess(
      payload.owners,
      payload.results
    )
  } catch (error) {
    const message = toErrorMessage(error)
    for (const owner of payload.owners) {
      payload.results[owner.index] = {
        identifier_type: owner.input.identifier_type,
        sku: owner.input.sku,
        ean: owner.input.ean,
        variant_id: owner.input.variant_id,
        status: "failed",
        error: message,
      }
    }
  }

  const pricesUpdated = payload.results.filter(
    (result) => result?.status === "updated"
  ).length
  const pricesFailed = payload.results.length - pricesUpdated
  return {
    success: pricesFailed === 0,
    price_list_id: priceListId,
    prices_updated: pricesUpdated,
    prices_failed: pricesFailed,
    results: payload.results,
  }
}

const processPriceListForBatch = async ({
  client,
  groupIndex,
  input,
  logger,
  priceListIndex,
}: {
  client: PriceListsClient
  groupIndex: Parameters<PriceListsClient["createPriceList"]>[1]
  input: PriceListInput
  logger: Logger
  priceListIndex: Awaited<ReturnType<PriceListsClient["preloadPriceLists"]>>
}): Promise<UpsertPriceListsBatchResult> => {
  try {
    const existing = priceListIndex.byCode.get(input.code)
    if (!existing) {
      const created = await client.createPriceList(input, groupIndex)
      priceListIndex.byCode.set(input.code, created)
      const priceResult = input.prices?.length
        ? await updatePrices(client, created.id, input.prices)
        : undefined
      return {
        code: input.code,
        status: "created",
        price_list_id: created.id,
        prices_updated: priceResult?.prices_updated ?? 0,
      }
    }

    await client.updatePriceList(existing.id, input, groupIndex)
    const priceResult = input.prices?.length
      ? await updatePrices(client, existing.id, input.prices)
      : undefined
    return {
      code: input.code,
      status: "updated",
      price_list_id: existing.id,
      prices_updated: priceResult?.prices_updated ?? 0,
    }
  } catch (error) {
    const message = toErrorMessage(error)
    logger.warn(
      `[symmy-plugin] Failed to upsert price list (${input.code}): ${message}`
    )
    return {
      code: input.code,
      status: "failed",
      error: message,
    }
  }
}

export const updatePriceListPricesBatchStep = createStep(
  "symmy-update-price-list-prices-batch",
  async (input: UpdatePriceListPricesBatchInput, { container }) => {
    const client = new PriceListsClient(container)
    const priceListIndex = await client.preloadPriceLists()
    const priceList = priceListIndex.byCode.get(input.code)
    if (!priceList) {
      return new StepResponse<UpdatePriceListPricesBatchOutput>({
        success: false,
        prices_updated: 0,
        prices_failed: input.prices.length,
        results: input.prices.map((price) => ({
          identifier_type: price.identifier_type,
          sku: price.sku,
          ean: price.ean,
          variant_id: price.variant_id,
          status: "not_found",
          error: `Price list '${input.code}' was not found`,
        })),
      })
    }
    return new StepResponse(
      await updatePrices(client, priceList.id, input.prices)
    )
  }
)

export const upsertPriceListsBatchStep = createStep(
  "symmy-upsert-price-lists-batch",
  async (input: UpsertPriceListsBatchInput, { container }) => {
    const client = new PriceListsClient(container)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const [priceListIndex, groupIndex] = await Promise.all([
      client.preloadPriceLists(),
      client.preloadCustomerGroups(input.price_lists),
    ])

    const results: UpsertPriceListsBatchResult[] = []
    for (const priceList of input.price_lists) {
      results.push(
        await processPriceListForBatch({
          client,
          groupIndex,
          input: priceList,
          logger,
          priceListIndex,
        })
      )
    }

    const processed = results.filter(
      (result) => result.status !== "failed"
    ).length
    const failed = results.length - processed
    return new StepResponse<UpsertPriceListsBatchOutput>({
      success: failed === 0,
      processed,
      failed,
      results,
    })
  }
)

export const listPriceListsStep = createStep(
  "symmy-list-price-lists",
  async (input: ListPriceListsInput, { container }) => {
    const client = new PriceListsClient(container)
    const limit = Math.max(1, Math.min(input.limit ?? 50, 1000))
    const offset = Math.max(0, input.offset ?? 0)
    return new StepResponse<ListPriceListsOutput>(
      await client.listPriceLists({ code: input.code, limit, offset })
    )
  }
)
