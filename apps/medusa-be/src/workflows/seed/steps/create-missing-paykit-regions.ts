import type { Logger, RegionDTO } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { createRegionsWorkflow } from "@medusajs/medusa/core-flows"

export type CreateMissingPaykitRegionsStepInput = {
  name: string
  currencyCode: string
  countries?: string[] | undefined
  paymentProviders: string[]
  isTaxInclusive?: boolean | undefined
}[]

const CreateMissingPaykitRegionsStepId = "create-missing-paykit-regions-step"

export const createMissingPaykitRegionsStep = createStep(
  CreateMissingPaykitRegionsStepId,
  async (input: CreateMissingPaykitRegionsStepInput, { container }) => {
    if (!input.length) {
      return new StepResponse<RegionDTO[]>([])
    }

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

    logger.info("Creating missing PayKit seed regions...")

    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: input.map((region) => ({
          name: region.name,
          currency_code: region.currencyCode,
          ...(region.countries ? { countries: region.countries } : {}),
          payment_providers: region.paymentProviders,
          // Match the existing region seed default when PayKit creates fallback regions.
          is_tax_inclusive: region.isTaxInclusive ?? true,
        })),
      },
    })

    return new StepResponse(result)
  }
)
