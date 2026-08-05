import type {
  ITaxModuleService,
  Logger,
  TaxRegionDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  createTaxRegionsWorkflow,
  updateTaxRegionsWorkflow,
} from "@medusajs/medusa/core-flows"

export interface CreateTaxRegionsStepInput {
  countries: string[]
  taxProviderId?: string
}

const CreateTaxRegionsStepId = "create-tax-regions-seed-step"
export const createTaxRegionsStep = createStep(
  CreateTaxRegionsStepId,
  async (input: CreateTaxRegionsStepInput, { container }) => {
    const result: TaxRegionDTO[] = []

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const taxService = container.resolve<ITaxModuleService>(Modules.TAX)

    const existingTaxRegions = await taxService.listTaxRegions({
      country_code: { $in: input.countries },
    })

    const missingTaxRegions = input.countries.filter(
      (i) => !existingTaxRegions.find((j) => j.country_code === i)
    )

    if (missingTaxRegions.length !== 0) {
      logger.info("Creating missing tax regions...")

      const { result: createTaxRegionsResult } = await createTaxRegionsWorkflow(
        container
      ).run({
        input: missingTaxRegions.map((country_code) => ({
          country_code,
          provider_id: input.taxProviderId || "tp_system",
        })),
      })

      result.push(...createTaxRegionsResult)
    }

    if (existingTaxRegions.length !== 0) {
      logger.info("Updating existing tax regions...")

      const toUpdate = existingTaxRegions.map((i) => ({
        id: i.id,
        provider_id: input.taxProviderId || "tp_system",
      }))

      const { result: updateTaxRegionResult } = await updateTaxRegionsWorkflow(
        container
      ).run({
        input: toUpdate,
      })

      result.push(...updateTaxRegionResult)
    }

    return new StepResponse({
      result,
    })
  }
)
