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
  countries?: string[] | undefined
  paymentProviders?: string[] | undefined
  isTaxInclusive?: boolean | undefined
}[]

const CreateRegionsStepId = "create-regions-seed-step"
export const createRegionsStep = createStep(
  CreateRegionsStepId,
  async (input: CreateRegionsStepInput, { container }) => {
    const result: WorkflowTypes.RegionWorkflow.CreateRegionsWorkflowOutput = []

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const regionService = container.resolve<IRegionModuleService>(
      Modules.REGION,
    )

    const regionNames = input.map((i) => i.name)

    const existingRegions = await regionService.listRegions({
      name: { $in: regionNames },
    })

    const missingRegions = input.filter(
      (i) => !existingRegions.some((j) => j.name === i.name),
    )
    const updateRegions = input.flatMap((inputRegion) => {
      const existingRegion = existingRegions.find(
        (existing) => existing.name === inputRegion.name,
      )
      if (existingRegion) {
        return [
          {
            ...existingRegion,
            countries: inputRegion.countries,
            currency_code: inputRegion.currencyCode,
            is_tax_inclusive: inputRegion.isTaxInclusive ?? true,
            payment_providers: inputRegion.paymentProviders,
          },
        ]
      }
      return []
    })

    if (missingRegions.length !== 0) {
      logger.info("Creating missing region data...")

      const { result: createRegionsResult } = await createRegionsWorkflow(
        container,
      ).run({
        input: {
          regions: missingRegions.map((i) => ({
            ...(i.countries === undefined ? {} : { countries: i.countries }),
            currency_code: i.currencyCode,
            is_tax_inclusive: i.isTaxInclusive ?? true,
            name: i.name,
            payment_providers: i.paymentProviders ?? ["pp_system_default"],
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
          ...(i.countries === undefined ? {} : { countries: i.countries }),
          currency_code: i.currency_code,
          is_tax_inclusive: i.is_tax_inclusive,
          payment_providers: i.payment_providers ?? ["pp_system_default"],
        },
      }))

      const updateResults = await Promise.all(
        toUpdate.map(
          async (regionToUpdate) =>
            await updateRegionsWorkflow(container).run({
              input: regionToUpdate,
            }),
        ),
      )
      result.push(
        ...updateResults.flatMap(({ result: updateResult }) => updateResult),
      )
    }

    return new StepResponse({
      result,
    })
  },
)
