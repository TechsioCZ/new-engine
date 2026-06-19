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

const CreateSalesChannelsStepId = "create-sales-channels-seed-step"
export const createSalesChannelsStep = createStep(
  CreateSalesChannelsStepId,
  async (input: CreateSalesChannelsStepInput, { container }) => {
    const result: Array<SalesChannelDTO & { isDefault: boolean }> = []

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const salesChannelModuleService =
      container.resolve<ISalesChannelModuleService>(Modules.SALES_CHANNEL)

    const salesChannels = input.map((i) => i.name)

    const existingSalesChannels =
      await salesChannelModuleService.listSalesChannels({
        name: salesChannels,
      })

    const missingSalesChannels = salesChannels
      .filter((i) => !existingSalesChannels.find((j) => j.name === i))
      .map((i) => ({ name: i }))

    if (missingSalesChannels.length !== 0) {
      // create the default sales channel
      const { result: salesChannelResult } = await createSalesChannelsWorkflow(
        container
      ).run({
        input: {
          salesChannelsData: missingSalesChannels,
        },
      })

      const defaultTarget =
        input.find((i) => i.default)?.name ?? salesChannelResult[0]?.name
      for (const salesChannelResultElement of salesChannelResult) {
        result.push({
          ...salesChannelResultElement,
          isDefault: salesChannelResultElement.name === defaultTarget,
        })
      }
    } else {
      const existingDefault = existingSalesChannels.find(
        (channel) => channel.name === input.find((inp) => inp.default)?.name
      )
      if (!existingDefault) {
        throw new Error("Could not find default sales channel")
      }

      result.push({
        ...existingDefault,
        isDefault: true,
      })
    }

    const defaultSalesChannel = result.find((i) => i.isDefault)
    if (defaultSalesChannel) {
      logger.info(`Found default sales channel: ${defaultSalesChannel.name}`)
    } else {
      throw new Error("Could not find default sales channel")
    }

    return new StepResponse({
      defaultSalesChannel,
      result,
    })
  }
)
