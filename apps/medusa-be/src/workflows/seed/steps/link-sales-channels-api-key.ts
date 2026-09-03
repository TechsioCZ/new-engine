import type { Logger, Query, SalesChannelDTO } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { linkSalesChannelsToApiKeyWorkflow } from "@medusajs/medusa/core-flows"
import type { SeedPublishableKeyResult } from "./create-publishable-key"

export type LinkSalesChannelsApiKeyStepInput = {
  publishableApiKey: { id: string }
  salesChannels: SalesChannelDTO[]
  salesChannelNames?: string[]
}

const LinkSalesChannelsApiKeyStepId = "link-sales-channels-api-key-seed-step"

export function planSalesChannelApiKeyLinks({
  desiredIds,
  existingIds,
}: {
  desiredIds: string[]
  existingIds: string[]
}) {
  const desiredIdSet = new Set(desiredIds)
  const existingIdSet = new Set(existingIds)
  return {
    add: desiredIds.filter((id) => !existingIdSet.has(id)),
    remove: existingIds.filter((id) => !desiredIdSet.has(id)),
  }
}

type PublishableKeySalesChannelAssociation = {
  publishableKeyId: string
  salesChannelId: string
}

type PublishableKeyLinkResult = {
  add: string[]
  publishableKeyId: string
  remove: string[]
  salesChannelIds: string[]
}

export function resolveLegacySharedPublishableKeySalesChannels({
  publishableKeys,
  salesChannels,
}: {
  publishableKeys: Array<{
    associationMode: string
    publishableApiKey: { id: string }
    salesChannelNames: string[]
  }>
  salesChannels: Array<{ id: string; name: string }>
}): { publishableKeyId: string; salesChannelIds: string[] } {
  const [publishableKey] = publishableKeys
  if (
    !publishableKey ||
    publishableKeys.length !== 1 ||
    publishableKey.associationMode !== "legacy-shared"
  ) {
    throw new Error(
      "Legacy shared publishable-key mode requires exactly one configured key"
    )
  }
  const desiredNames = publishableKey.salesChannelNames
  if (
    !desiredNames.length ||
    new Set(desiredNames).size !== desiredNames.length
  ) {
    throw new Error(
      "Legacy shared publishable-key mode requires unique sales channels"
    )
  }
  const salesChannelIds = desiredNames.map((desiredName) => {
    const matches = salesChannels.filter(({ name }) => name === desiredName)
    const [match] = matches
    if (!match || matches.length !== 1) {
      throw new Error(
        `Could not resolve exact legacy publishable-key sales channel: ${desiredName}`
      )
    }
    return match.id
  })
  return {
    publishableKeyId: publishableKey.publishableApiKey.id,
    salesChannelIds,
  }
}

export function resolveExclusivePublishableKeySalesChannels({
  publishableKeys,
  salesChannels,
}: {
  publishableKeys: Array<{
    publishableApiKey: { id: string }
    salesChannelNames: string[]
    title: string
  }>
  salesChannels: Array<{ id: string; name: string }>
}): PublishableKeySalesChannelAssociation[] {
  const desired = publishableKeys.map(
    ({ publishableApiKey, salesChannelNames, title }) => {
      if (salesChannelNames.length !== 1) {
        throw new Error(
          `Publishable key "${title}" must target exactly one sales channel`
        )
      }
      const matches = salesChannels.filter(
        ({ name }) => name === salesChannelNames[0]
      )
      const [match] = matches
      if (!match || matches.length !== 1) {
        throw new Error(
          `Could not resolve exact publishable-key sales channel: ${salesChannelNames[0]}`
        )
      }
      return {
        publishableKeyId: publishableApiKey.id,
        salesChannelId: match.id,
      }
    }
  )
  validateExclusivePublishableKeyAssociations({ desired, existing: [] })
  return desired
}

export function validateExclusivePublishableKeyAssociations({
  desired,
  existing,
}: {
  desired: PublishableKeySalesChannelAssociation[]
  existing: PublishableKeySalesChannelAssociation[]
}) {
  if (
    new Set(desired.map(({ publishableKeyId }) => publishableKeyId)).size !==
      desired.length ||
    new Set(desired.map(({ salesChannelId }) => salesChannelId)).size !==
      desired.length
  ) {
    throw new Error("Ambiguous publishable-key sales-channel linkage")
  }
  const desiredByKey = new Map(
    desired.map((association) => [association.publishableKeyId, association])
  )
  const desiredByChannel = new Map(
    desired.map((association) => [association.salesChannelId, association])
  )

  for (const association of existing) {
    const desiredForKey = desiredByKey.get(association.publishableKeyId)
    const desiredForChannel = desiredByChannel.get(association.salesChannelId)
    if (
      (desiredForKey &&
        desiredForKey.salesChannelId !== association.salesChannelId) ||
      (desiredForChannel &&
        desiredForChannel.publishableKeyId !== association.publishableKeyId)
    ) {
      throw new Error("Ambiguous publishable-key sales-channel linkage")
    }
  }
}

export type LinkSalesChannelsApiKeysStepInput = {
  publishableKeys: SeedPublishableKeyResult[]
  salesChannels: SalesChannelDTO[]
}

const LinkSalesChannelsApiKeysStepId = "link-sales-channels-api-keys-seed-step"
export const linkSalesChannelsApiKeysStep = createStep(
  LinkSalesChannelsApiKeysStepId,
  async (input: LinkSalesChannelsApiKeysStepInput, { container }) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    if (
      input.publishableKeys.some(
        ({ associationMode }) => associationMode === "legacy-shared"
      )
    ) {
      const legacy = resolveLegacySharedPublishableKeySalesChannels(input)
      const { data: existingLinks } = await query.graph({
        entity: "publishable_api_key_sales_channel",
        fields: ["sales_channel_id"],
        filters: { publishable_key_id: legacy.publishableKeyId },
      })
      const existingIds = existingLinks.flatMap((link) =>
        typeof link.sales_channel_id === "string" ? [link.sales_channel_id] : []
      )
      const plan = planSalesChannelApiKeyLinks({
        desiredIds: legacy.salesChannelIds,
        existingIds,
      })
      if (plan.add.length || plan.remove.length) {
        await linkSalesChannelsToApiKeyWorkflow(container).run({
          input: {
            id: legacy.publishableKeyId,
            add: plan.add,
            remove: plan.remove,
          },
        })
      }
      logger.info("Reconciled explicit legacy shared publishable-key links")
      return new StepResponse({ result: [{ ...legacy, ...plan }] })
    }
    const desired = resolveExclusivePublishableKeySalesChannels(input)
    const { data: rawExisting } = await query.graph({
      entity: "publishable_api_key_sales_channel",
      fields: ["publishable_key_id", "sales_channel_id"],
    })
    const existing = rawExisting.flatMap((link) =>
      typeof link.publishable_key_id === "string" &&
      typeof link.sales_channel_id === "string"
        ? [
            {
              publishableKeyId: link.publishable_key_id,
              salesChannelId: link.sales_channel_id,
            },
          ]
        : []
    )
    validateExclusivePublishableKeyAssociations({ desired, existing })

    const result: PublishableKeyLinkResult[] = []
    for (const association of desired) {
      const existingForKey = existing
        .filter(
          ({ publishableKeyId }) =>
            publishableKeyId === association.publishableKeyId
        )
        .map(({ salesChannelId }) => salesChannelId)
      const plan = planSalesChannelApiKeyLinks({
        desiredIds: [association.salesChannelId],
        existingIds: existingForKey,
      })
      if (plan.add.length || plan.remove.length) {
        await linkSalesChannelsToApiKeyWorkflow(container).run({
          input: {
            id: association.publishableKeyId,
            add: plan.add,
            remove: plan.remove,
          },
        })
      }
      result.push({
        ...plan,
        publishableKeyId: association.publishableKeyId,
        salesChannelIds: [association.salesChannelId],
      })
    }
    logger.info(`Reconciled ${result.length} exclusive publishable-key links`)

    return new StepResponse({ result })
  }
)

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
      throw new Error(
        `Could not resolve exact publishable-key sales channels: ${desiredNames.join(", ")}`
      )
    }
    const { data: existingLinks } = await query.graph({
      entity: "publishable_api_key_sales_channel",
      fields: ["sales_channel_id"],
      filters: { publishable_key_id: input.publishableApiKey.id },
    })
    const existingIds = existingLinks.flatMap((link) =>
      typeof link.sales_channel_id === "string" ? [link.sales_channel_id] : []
    )
    const { add, remove } = planSalesChannelApiKeyLinks({
      desiredIds,
      existingIds,
    })

    if (add.length || remove.length) {
      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: {
          id: input.publishableApiKey.id,
          add,
          remove,
        },
      })
    }

    return new StepResponse({
      result: { add, remove },
    })
  }
)
