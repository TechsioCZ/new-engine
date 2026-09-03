import type {
  ISalesChannelModuleService,
  Logger,
  SalesChannelDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { createSalesChannelsWorkflow } from "@medusajs/medusa/core-flows"

export type CreateSalesChannelsStepInput = {
  name: string
  default: boolean
  metadata?: Record<string, unknown>
  seedHandle?: string
}[]

type ExistingSalesChannelSeedCandidate = Pick<
  SalesChannelDTO,
  "id" | "metadata" | "name"
>

export function validateSalesChannelSeedInput(
  input: CreateSalesChannelsStepInput
) {
  const names = input.map(({ name }) => name.trim())
  if (names.some((name) => !name)) {
    throw new Error("Seed sales channel names must not be empty")
  }
  if (new Set(names).size !== names.length) {
    throw new Error("Seed sales channel names must be unique")
  }
  if (input.filter(({ default: isDefault }) => isDefault).length !== 1) {
    throw new Error("Seed sales channels must define exactly one default")
  }
  const handles = input.flatMap(({ seedHandle }) => {
    const handle = seedHandle?.trim()
    return handle ? [handle] : []
  })
  if (handles.length !== new Set(handles).size) {
    throw new Error("Seed sales channel handles must be unique")
  }
  return names
}

function configuredMetadata(
  channel: CreateSalesChannelsStepInput[number]
): Record<string, unknown> | undefined {
  const seedHandle = channel.seedHandle?.trim()
  if (!(channel.metadata || seedHandle)) {
    return
  }
  return {
    ...(channel.metadata ?? {}),
    ...(seedHandle ? { seed_handle: seedHandle } : {}),
  }
}

export function planSalesChannelSeedReconciliation(
  input: CreateSalesChannelsStepInput,
  existing: ExistingSalesChannelSeedCandidate[]
) {
  validateSalesChannelSeedInput(input)
  const claimedExistingIds = new Set<string>()

  return input.map((configured) => {
    const configuredName = configured.name.trim()
    const seedHandle = configured.seedHandle?.trim()
    const conflictingNameOwner = existing.find((candidate) => {
      const existingHandle = candidate.metadata?.seed_handle
      return (
        candidate.name === configuredName &&
        seedHandle &&
        typeof existingHandle === "string" &&
        existingHandle.trim() !== "" &&
        existingHandle !== seedHandle
      )
    })
    if (conflictingNameOwner) {
      throw new Error(
        `Conflicting seed sales channel handle: ${configuredName}`
      )
    }
    const matches = existing.filter((candidate) => {
      const existingHandle = candidate.metadata?.seed_handle
      return (
        candidate.name === configuredName ||
        (seedHandle && existingHandle === seedHandle)
      )
    })
    const uniqueMatches = [
      ...new Map(matches.map((item) => [item.id, item])).values(),
    ]

    if (uniqueMatches.length > 1) {
      throw new Error(
        `Ambiguous seed sales channel identity: ${configuredName}`
      )
    }
    const matched = uniqueMatches[0]
    if (matched && claimedExistingIds.has(matched.id)) {
      throw new Error(
        `Ambiguous seed sales channel identity: ${configuredName}`
      )
    }
    if (matched) {
      claimedExistingIds.add(matched.id)
    }

    return {
      configuredName,
      existingId: matched?.id,
      metadata: configuredMetadata(configured),
    }
  })
}

export function mergeSalesChannelMetadata(
  existing: Record<string, unknown> | null | undefined,
  configured: Record<string, unknown>
) {
  return { ...(existing ?? {}), ...configured }
}

const CreateSalesChannelsStepId = "create-sales-channels-seed-step"
export const createSalesChannelsStep = createStep(
  CreateSalesChannelsStepId,
  async (input: CreateSalesChannelsStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const salesChannelModuleService =
      container.resolve<ISalesChannelModuleService>(Modules.SALES_CHANNEL)

    const salesChannels = validateSalesChannelSeedInput(input)
    const existingSalesChannels =
      await salesChannelModuleService.listSalesChannels({})
    const reconciliationPlan = planSalesChannelSeedReconciliation(
      input,
      existingSalesChannels
    )

    const missingSalesChannels = reconciliationPlan
      .filter(({ existingId }) => !existingId)
      .map(({ configuredName: name, metadata }) => ({ metadata, name }))

    let createdSalesChannels: SalesChannelDTO[] = []
    if (missingSalesChannels.length !== 0) {
      const { result: salesChannelResult } = await createSalesChannelsWorkflow(
        container
      ).run({
        input: {
          salesChannelsData: missingSalesChannels,
        },
      })

      createdSalesChannels = salesChannelResult
    }

    const synchronizedExistingSalesChannels = await Promise.all(
      reconciliationPlan.flatMap(({ configuredName, existingId, metadata }) => {
        if (!existingId) {
          return []
        }
        const channel = existingSalesChannels.find(
          ({ id }) => id === existingId
        )
        if (!channel) {
          throw new Error(
            `Could not find existing sales channel "${existingId}"`
          )
        }
        return [
          salesChannelModuleService.updateSalesChannels(channel.id, {
            name: configuredName,
            ...(metadata
              ? {
                  metadata: mergeSalesChannelMetadata(
                    channel.metadata,
                    metadata
                  ),
                }
              : {}),
          }),
        ]
      })
    )

    const channelsByName = new Map(
      [...synchronizedExistingSalesChannels, ...createdSalesChannels].map(
        (channel) => [channel.name, channel]
      )
    )
    const defaultIndex = input.findIndex(({ default: isDefault }) => isDefault)
    const defaultName = salesChannels[defaultIndex]
    const result = salesChannels.map((name, index) => {
      const channel = channelsByName.get(name)
      if (!channel) {
        throw new Error(`Could not find configured sales channel "${name}"`)
      }
      return { ...channel, isDefault: input[index]?.default ?? false }
    })
    const defaultSalesChannel = result.find(
      (channel) => channel.name === defaultName
    )
    if (!defaultSalesChannel) {
      throw new Error("Could not find default sales channel")
    }
    logger.info(`Found default sales channel: ${defaultSalesChannel.name}`)

    return new StepResponse({
      defaultSalesChannel,
      result,
    })
  }
)
