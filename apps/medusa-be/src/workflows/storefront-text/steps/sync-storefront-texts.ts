import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STOREFRONT_TEXT_MODULE } from "../../../modules/storefront-text"
import {
  getStorefrontTextSeedRows,
  type StorefrontTextSeedRow,
} from "../../../modules/storefront-text/registry"
import type StorefrontTextModuleService from "../../../modules/storefront-text/service"

type StorefrontTextRecord = StorefrontTextSeedRow & {
  id: string
}

type SyncStorefrontTextsCompensation = {
  createdIds: string[]
  previousRecords: StorefrontTextRecord[]
}

export const syncStorefrontTextsStep = createStep(
  "sync-storefront-texts",
  async (_, { container }) => {
    const service = container.resolve<StorefrontTextModuleService>(
      STOREFRONT_TEXT_MODULE
    )
    const seedRows = getStorefrontTextSeedRows()
    const createdIds: string[] = []
    const previousRecords: StorefrontTextRecord[] = []
    let updatedCount = 0

    for (const seedRow of seedRows) {
      const [existing] = await service.listStorefrontTexts({
        key: seedRow.key,
        locale: seedRow.locale,
        market: seedRow.market,
      })

      if (!existing) {
        const created = await service.createStorefrontTexts(seedRow)
        createdIds.push(created.id)
        continue
      }

      const needsMetadataUpdate =
        existing.country !== seedRow.country ||
        existing.description !== seedRow.description ||
        existing.domain !== seedRow.domain ||
        existing.namespace !== seedRow.namespace

      if (!needsMetadataUpdate) {
        continue
      }

      previousRecords.push(existing as StorefrontTextRecord)
      await service.updateStorefrontTexts({
        id: existing.id,
        country: seedRow.country,
        description: seedRow.description,
        domain: seedRow.domain,
        namespace: seedRow.namespace,
      })
      updatedCount += 1
    }

    return new StepResponse(
      {
        created_count: createdIds.length,
        updated_count: updatedCount,
      },
      {
        createdIds,
        previousRecords,
      } satisfies SyncStorefrontTextsCompensation
    )
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return
    }

    const service = container.resolve<StorefrontTextModuleService>(
      STOREFRONT_TEXT_MODULE
    )

    if (compensation.createdIds.length) {
      await service.deleteStorefrontTexts(compensation.createdIds)
    }

    for (const previousRecord of compensation.previousRecords) {
      await service.updateStorefrontTexts(previousRecord)
    }
  }
)
