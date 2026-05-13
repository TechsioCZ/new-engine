import type {
  IRegionModuleService,
  Logger,
  RegionDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export type SyncExistingPaykitRegionsStepInput = {
  id?: string
  currencyCode: string
}[]

const SyncExistingPaykitRegionsStepId = "sync-existing-paykit-regions-step"

export const syncExistingPaykitRegionsStep = createStep(
  SyncExistingPaykitRegionsStepId,
  async (input: SyncExistingPaykitRegionsStepInput, { container }) => {
    const regionsToSync = input.filter(
      (region) => region.id && region.currencyCode.trim()
    )

    if (!regionsToSync.length) {
      return new StepResponse([])
    }

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const regionService = container.resolve<IRegionModuleService>(
      Modules.REGION
    )

    logger.info("Syncing existing PayKit seed regions...")

    const updatedRegions: RegionDTO[] = []

    for (const region of regionsToSync) {
      const [updatedRegion] = await regionService.updateRegions(
        { id: region.id },
        { currency_code: region.currencyCode.toLowerCase() }
      )

      if (updatedRegion) {
        updatedRegions.push(updatedRegion)
      }
    }

    return new StepResponse(updatedRegions)
  }
)
