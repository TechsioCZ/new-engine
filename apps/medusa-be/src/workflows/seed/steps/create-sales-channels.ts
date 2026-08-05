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
}[]

export function validateSalesChannelSeedInput(
  input: CreateSalesChannelsStepInput,
) {
  const names = input.map(({ name }) => name.trim())
  if (new Set(names).size !== names.length) {
    throw new Error("Seed sales channel names must be unique")
  }
  if (input.filter(({ default: isDefault }) => isDefault).length !== 1) {
    throw new Error("Seed sales channels must define exactly one default")
  }
  return names
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
      await salesChannelModuleService.listSalesChannels({
        name: salesChannels,
      })

    const missingSalesChannels = salesChannels
      .filter((i) => !existingSalesChannels.find((j) => j.name === i))
      .map((i) => ({ name: i }))

    let createdSalesChannels: SalesChannelDTO[] = []
    if (missingSalesChannels.length !== 0) {
      const { result: salesChannelResult } = await createSalesChannelsWorkflow(
        container,
      ).run({
        input: {
          salesChannelsData: missingSalesChannels,
        },
      })

      createdSalesChannels = salesChannelResult
    }

    const channelsByName = new Map(
      [...existingSalesChannels, ...createdSalesChannels].map((channel) => [
        channel.name,
        channel,
      ]),
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
      (channel) => channel.name === defaultName,
    )
    if (!defaultSalesChannel) {
      throw new Error("Could not find default sales channel")
    }
    logger.info(`Found default sales channel: ${defaultSalesChannel.name}`)

    return new StepResponse({
      defaultSalesChannel,
      result,
    })
  },
)
