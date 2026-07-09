import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STOREFRONT_TEXT_MODULE } from "../../../modules/storefront-text"
import type { StorefrontTextRecord } from "../../../modules/storefront-text/models/storefront-text"
import {
  getStorefrontTextSeedRows,
  type StorefrontTextSeedRow,
} from "../../../modules/storefront-text/registry"
import type StorefrontTextModuleService from "../../../modules/storefront-text/service"

const SYNC_STOREFRONT_TEXT_CHUNK_SIZE = 25

type SyncStorefrontTextsCompensation = {
  createdIds: string[]
  previousRecords: StorefrontTextRestoreRecord[]
}

type StorefrontTextRestoreRecord = Pick<
  StorefrontTextRecord,
  "country" | "description" | "domain" | "id" | "namespace"
>

type SyncSeedRowResult =
  | {
      createdId: string
      previousRecord?: never
      updated: false
    }
  | {
      createdId?: never
      previousRecord: StorefrontTextRestoreRecord
      updated: true
    }
  | {
      createdId?: never
      previousRecord?: never
      updated: false
    }

const chunkItems = <Item>(items: Item[], size: number) => {
  const chunks: Item[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

const syncSeedRow = async (
  service: StorefrontTextModuleService,
  seedRow: StorefrontTextSeedRow
): Promise<SyncSeedRowResult> => {
  const [existing] = await service.listStorefrontTexts({
    key: seedRow.key,
    locale: seedRow.locale,
    market: seedRow.market,
  })

  if (!existing) {
    const created = await service.createStorefrontTexts(seedRow)

    return {
      createdId: created.id,
      updated: false,
    }
  }

  const needsMetadataUpdate =
    existing.country !== seedRow.country ||
    existing.description !== seedRow.description ||
    existing.domain !== seedRow.domain ||
    existing.namespace !== seedRow.namespace

  if (!needsMetadataUpdate) {
    return { updated: false }
  }

  const previousRecord: StorefrontTextRestoreRecord = {
    country: existing.country,
    description: existing.description,
    domain: existing.domain,
    id: existing.id,
    namespace: existing.namespace,
  }

  await service.updateStorefrontTexts({
    id: existing.id,
    country: seedRow.country,
    description: seedRow.description,
    domain: seedRow.domain,
    namespace: seedRow.namespace,
  })

  return {
    previousRecord,
    updated: true,
  }
}

export const syncStorefrontTextsStep = createStep(
  "sync-storefront-texts",
  async (_, { container }) => {
    const service = container.resolve<StorefrontTextModuleService>(
      STOREFRONT_TEXT_MODULE
    )
    const seedRows = getStorefrontTextSeedRows()
    const createdIds: string[] = []
    const previousRecords: StorefrontTextRestoreRecord[] = []
    let updatedCount = 0

    for (const seedRowChunk of chunkItems(
      seedRows,
      SYNC_STOREFRONT_TEXT_CHUNK_SIZE
    )) {
      const results = await Promise.all(
        seedRowChunk.map((seedRow) => syncSeedRow(service, seedRow))
      )

      for (const result of results) {
        if (result.createdId) {
          createdIds.push(result.createdId)
        }

        if (result.updated) {
          previousRecords.push(result.previousRecord)
          updatedCount += 1
        }
      }
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
