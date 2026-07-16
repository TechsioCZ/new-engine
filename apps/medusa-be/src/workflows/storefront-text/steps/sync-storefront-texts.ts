import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { STOREFRONT_TEXT_MODULE } from "../../../modules/storefront-text"
import { validateStorefrontTextOverride } from "../../../modules/storefront-text/message-validation"
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
  | "country"
  | "default_value"
  | "description"
  | "domain"
  | "id"
  | "namespace"
  | "override_value"
>

type PreparedSeedRow = {
  existing?: StorefrontTextRecord
  normalizedOverrideValue: null | string
  seedRow: StorefrontTextSeedRow
}

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

const prepareSeedRow = async (
  service: StorefrontTextModuleService,
  seedRow: StorefrontTextSeedRow
): Promise<PreparedSeedRow> => {
  const defaultValidation = validateStorefrontTextOverride({
    defaultValue: seedRow.default_value,
    locale: seedRow.locale,
    overrideValue: seedRow.default_value,
  })

  if (!defaultValidation.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${seedRow.key} (${seedRow.market}/${seedRow.locale}): ${defaultValidation.message}`
    )
  }

  const [existing] = await service.listStorefrontTexts({
    key: seedRow.key,
    locale: seedRow.locale,
    market: seedRow.market,
  })

  if (!existing) {
    return {
      normalizedOverrideValue: null,
      seedRow,
    }
  }

  const normalizedOverrideValue =
    existing.override_value === seedRow.default_value
      ? null
      : existing.override_value

  if (normalizedOverrideValue !== null) {
    const overrideValidation = validateStorefrontTextOverride({
      defaultValue: seedRow.default_value,
      locale: seedRow.locale,
      overrideValue: normalizedOverrideValue,
    })

    if (!overrideValidation.success) {
      throw new MedusaError(
        overrideValidation.code === "invalid_default"
          ? MedusaError.Types.UNEXPECTED_STATE
          : MedusaError.Types.CONFLICT,
        `${seedRow.key} (${seedRow.market}/${seedRow.locale}): ${overrideValidation.message}`
      )
    }
  }

  return {
    existing,
    normalizedOverrideValue,
    seedRow,
  }
}

const syncSeedRow = async (
  service: StorefrontTextModuleService,
  { existing, normalizedOverrideValue, seedRow }: PreparedSeedRow
): Promise<SyncSeedRowResult> => {
  if (!existing) {
    const created = await service.createStorefrontTexts(seedRow)

    return {
      createdId: created.id,
      updated: false,
    }
  }

  const needsUpdate =
    existing.country !== seedRow.country ||
    existing.default_value !== seedRow.default_value ||
    existing.description !== seedRow.description ||
    existing.domain !== seedRow.domain ||
    existing.namespace !== seedRow.namespace ||
    existing.override_value !== normalizedOverrideValue

  if (!needsUpdate) {
    return { updated: false }
  }

  const previousRecord: StorefrontTextRestoreRecord = {
    country: existing.country,
    default_value: existing.default_value,
    description: existing.description,
    domain: existing.domain,
    id: existing.id,
    namespace: existing.namespace,
    override_value: existing.override_value,
  }

  await service.updateStorefrontTexts({
    id: existing.id,
    country: seedRow.country,
    default_value: seedRow.default_value,
    description: seedRow.description,
    domain: seedRow.domain,
    namespace: seedRow.namespace,
    override_value: normalizedOverrideValue,
  })

  return {
    previousRecord,
    updated: true,
  }
}

const rollbackSyncedRows = async (
  service: StorefrontTextModuleService,
  { createdIds, previousRecords }: SyncStorefrontTextsCompensation
) => {
  const rollbackResults = await Promise.allSettled([
    ...(createdIds.length
      ? [service.deleteStorefrontTexts(createdIds)]
      : []),
    ...previousRecords.map((previousRecord) =>
      service.updateStorefrontTexts(previousRecord)
    ),
  ])
  const rollbackErrors = rollbackResults
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason)

  if (rollbackErrors.length) {
    throw new AggregateError(
      rollbackErrors,
      "Storefront text sync rollback failed"
    )
  }
}

export const syncStorefrontTextsStep = createStep(
  "sync-storefront-texts",
  async (_, { container }) => {
    const service = container.resolve<StorefrontTextModuleService>(
      STOREFRONT_TEXT_MODULE
    )
    const seedRows = getStorefrontTextSeedRows()
    const preparedRows: PreparedSeedRow[] = []
    const createdIds: string[] = []
    const previousRecords: StorefrontTextRestoreRecord[] = []
    let updatedCount = 0

    for (const seedRowChunk of chunkItems(
      seedRows,
      SYNC_STOREFRONT_TEXT_CHUNK_SIZE
    )) {
      preparedRows.push(
        ...(await Promise.all(
          seedRowChunk.map((seedRow) => prepareSeedRow(service, seedRow))
        ))
      )
    }

    for (const preparedRowChunk of chunkItems(
      preparedRows,
      SYNC_STOREFRONT_TEXT_CHUNK_SIZE
    )) {
      const settledResults = await Promise.allSettled(
        preparedRowChunk.map((preparedRow) =>
          syncSeedRow(service, preparedRow)
        )
      )
      const syncErrors: unknown[] = []

      for (const settledResult of settledResults) {
        if (settledResult.status === "rejected") {
          syncErrors.push(settledResult.reason)
          continue
        }

        const result = settledResult.value

        if (result.createdId) {
          createdIds.push(result.createdId)
        }

        if (result.updated) {
          previousRecords.push(result.previousRecord)
          updatedCount += 1
        }
      }

      if (syncErrors.length) {
        try {
          await rollbackSyncedRows(service, { createdIds, previousRecords })
        } catch (rollbackError) {
          throw new AggregateError(
            [...syncErrors, rollbackError],
            "Storefront text sync and rollback failed"
          )
        }

        const syncError = syncErrors[0]

        if (syncError instanceof Error) {
          throw syncError
        }

        throw new Error("Storefront text sync failed")
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

    await rollbackSyncedRows(
      container.resolve<StorefrontTextModuleService>(STOREFRONT_TEXT_MODULE),
      compensation
    )
  }
)
