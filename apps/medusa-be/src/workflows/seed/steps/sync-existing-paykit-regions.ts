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

type SyncExistingPaykitRegion = SyncExistingPaykitRegionsStepInput[number] & {
  id: string
}

const SyncExistingPaykitRegionsStepId = "sync-existing-paykit-regions-step"

const hasIdAndCurrency = (
  region: SyncExistingPaykitRegionsStepInput[number],
): region is SyncExistingPaykitRegion =>
  typeof region.id === "string" &&
  region.id.length > 0 &&
  region.currencyCode.trim().length > 0

export const syncExistingPaykitRegionsStep = createStep(
  SyncExistingPaykitRegionsStepId,
  async (input: SyncExistingPaykitRegionsStepInput, { container }) => {
    const regionsToSync = input.filter(hasIdAndCurrency)

    if (regionsToSync.length === 0) {
      return new StepResponse([])
    }

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const regionService = container.resolve<IRegionModuleService>(
      Modules.REGION,
    )

    logger.info("Syncing existing PayKit seed regions...")

    const updateResults = await Promise.all(
      regionsToSync.map(
        async (region) =>
          await regionService.updateRegions(
            { id: region.id },
            { currency_code: region.currencyCode.trim().toLowerCase() },
          ),
      ),
    )
    const updatedRegions: RegionDTO[] = updateResults.flatMap(
      ([updatedRegion]) => (updatedRegion === undefined ? [] : [updatedRegion]),
    )

    return new StepResponse(updatedRegions)
  },
)
