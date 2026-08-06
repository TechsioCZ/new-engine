import type {
  ApiKeyDTO,
  Logger,
  Query,
  SalesChannelDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { linkSalesChannelsToApiKeyWorkflow } from "@medusajs/medusa/core-flows"
import { isRecord } from "@techsio/std/object"

export interface LinkSalesChannelsApiKeyStepInput {
  publishableApiKey: ApiKeyDTO
  salesChannels: SalesChannelDTO[]
  salesChannelNames?: string[]
}

const LinkSalesChannelsApiKeyStepId = "link-sales-channels-api-key-seed-step"

export const planSalesChannelApiKeyLinks = ({
  desiredIds,
  existingIds,
}: {
  desiredIds: string[]
  existingIds: string[]
}) => {
  const desiredIdSet = new Set(desiredIds)
  const existingIdSet = new Set(existingIds)
  return {
    add: desiredIds.filter((id) => !existingIdSet.has(id)),
    remove: existingIds.filter((id) => !desiredIdSet.has(id)),
  }
}

export const linkSalesChannelsApiKeyStep = createStep(
  LinkSalesChannelsApiKeyStepId,
  async (input: LinkSalesChannelsApiKeyStepInput, { container }) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    logger.info("Linking sales channels to API key...")

    const desiredNames =
      input.salesChannelNames ??
      input.salesChannels.map((salesChannel) => salesChannel.name)
    const desiredIds = input.salesChannels
      .filter((salesChannel) => desiredNames.includes(salesChannel.name))
      .map((salesChannel) => salesChannel.id)
    if (desiredIds.length !== new Set(desiredNames).size) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Could not resolve exact publishable-key sales channels: ${desiredNames.join(", ")}`,
      )
    }
    const existingLinksResult: unknown = await query.graph({
      entity: "publishable_api_key_sales_channel",
      fields: ["sales_channel_id"],
      filters: { publishable_key_id: input.publishableApiKey.id },
    })
    const existingLinks = isRecord(existingLinksResult)
      ? existingLinksResult["data"]
      : undefined
    if (!Array.isArray(existingLinks)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Publishable API key sales-channel query returned invalid data",
      )
    }
    const existingIds = existingLinks.flatMap((link) => {
      if (!isRecord(link)) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Publishable API key sales-channel query returned an invalid link",
        )
      }
      const salesChannelId = link["sales_channel_id"]
      return typeof salesChannelId === "string" ? [salesChannelId] : []
    })
    const { add, remove } = planSalesChannelApiKeyLinks({
      desiredIds,
      existingIds,
    })

    if (add.length > 0 || remove.length > 0) {
      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: {
          add,
          id: input.publishableApiKey.id,
          remove,
        },
      })
    }

    return new StepResponse({
      result: { add, remove },
    })
  },
)
