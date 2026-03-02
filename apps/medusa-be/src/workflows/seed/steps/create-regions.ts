import type {
  IRegionModuleService,
  Logger,
  WorkflowTypes,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  createRegionsWorkflow,
  updateRegionsWorkflow,
} from "@medusajs/medusa/core-flows"

export type CreateRegionsStepInput = {
  name: string
  currencyCode: string
  countries?: string[]
  paymentProviders?: string[]
  isTaxInclusive?: boolean
}[]

const CreateRegionsStepId = "create-regions-seed-step"
export const createRegionsStep = createStep(
  CreateRegionsStepId,
  async (input: CreateRegionsStepInput, { container }) => {
    const result: WorkflowTypes.RegionWorkflow.CreateRegionsWorkflowOutput = []

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const regionService = container.resolve<IRegionModuleService>(
      Modules.REGION
    )

    const regionNames = input.map((i) => i.name)

    const existingRegions = await regionService.listRegions({
      name: { $in: regionNames },
    })

    const missingRegions = input.filter(
      (i) => !existingRegions.find((j) => j.name === i.name)
    )
    const updateRegions = input.flatMap((inputRegion) => {
      const existingRegion = existingRegions.find(
        (existing) => existing.name === inputRegion.name
      )
      if (existingRegion) {
        return [
          {
            ...existingRegion,
            currency_code: inputRegion.currencyCode,
            countries: inputRegion.countries,
            payment_providers: inputRegion.paymentProviders,
            is_tax_inclusive: inputRegion.isTaxInclusive ?? true,
          },
        ]
      }
      return []
    })

    if (missingRegions.length !== 0) {
      logger.info("Creating missing region data...")

      const { result: createRegionsResult } = await createRegionsWorkflow(
        container
      ).run({
        input: {
          regions: missingRegions.map((i) => ({
            name: i.name,
            currency_code: i.currencyCode,
            countries: i.countries,
            payment_providers: i.paymentProviders ?? ["pp_system_default"],
            is_tax_inclusive: i.isTaxInclusive ?? true,
          })),
        },
      })

      result.push(...createRegionsResult)
    }

    if (updateRegions.length !== 0) {
      logger.info("Updating existing region data...")

      const toUpdate = updateRegions.map((i) => ({
        selector: { name: i.name },
        update: {
          currency_code: i.currency_code,
          countries: i.countries,
          payment_providers: i.payment_providers ?? ["pp_system_default"],
          is_tax_inclusive: i.is_tax_inclusive,
        },
      }))

      for (const regionToUpdate of toUpdate) {
        const { result: updateResult } = await updateRegionsWorkflow(
          container
        ).run({
          input: regionToUpdate,
        })

        result.push(...updateResult)
      }
    }

    return new StepResponse({
      result,
    })
  }
)
