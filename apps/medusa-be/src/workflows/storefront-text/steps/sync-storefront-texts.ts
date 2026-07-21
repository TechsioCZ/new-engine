import type { Context } from "@medusajs/framework/types"
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
import type { SyncStorefrontTextsWorkflowInput } from "../types"

export type StorefrontTextSyncCompensation = {
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

type StorefrontTextSyncResult = {
  created_count: number
  updated_count: number
}

const getRecordIdentity = ({
  key,
  locale,
  market,
}: Pick<StorefrontTextRecord, "key" | "locale" | "market">) =>
  `${market}:${locale}:${key}`

const validateSeedRow = (
  seedRow: StorefrontTextSeedRow,
  existing?: StorefrontTextRecord
) => {
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

  const normalizedOverrideValue =
    existing?.override_value === seedRow.default_value
      ? null
      : (existing?.override_value ?? null)

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

  return normalizedOverrideValue
}

export const synchronizeStorefrontTexts = async (
  service: StorefrontTextModuleService,
  input: SyncStorefrontTextsWorkflowInput,
  sharedContext: Context
): Promise<{
  compensation: StorefrontTextSyncCompensation
  result: StorefrontTextSyncResult
}> => {
  const seedRows = getStorefrontTextSeedRows(input)
  const existingRecords = await service.listStorefrontTexts(
    input.market ? { market: input.market } : {},
    {},
    sharedContext
  )
  const existingByIdentity = new Map(
    existingRecords.map((record) => [getRecordIdentity(record), record])
  )
  const createInputs: StorefrontTextSeedRow[] = []
  const updateInputs: Array<
    StorefrontTextRestoreRecord & { override_value: null | string }
  > = []
  const previousRecords: StorefrontTextRestoreRecord[] = []

  for (const seedRow of seedRows) {
    const existing = existingByIdentity.get(getRecordIdentity(seedRow))
    const normalizedOverrideValue = validateSeedRow(seedRow, existing)

    if (!existing) {
      createInputs.push(seedRow)
      continue
    }

    const needsUpdate =
      existing.country !== seedRow.country ||
      existing.default_value !== seedRow.default_value ||
      existing.description !== seedRow.description ||
      existing.domain !== seedRow.domain ||
      existing.namespace !== seedRow.namespace ||
      existing.override_value !== normalizedOverrideValue

    if (!needsUpdate) {
      continue
    }

    previousRecords.push({
      country: existing.country,
      default_value: existing.default_value,
      description: existing.description,
      domain: existing.domain,
      id: existing.id,
      namespace: existing.namespace,
      override_value: existing.override_value,
    })
    updateInputs.push({
      country: seedRow.country,
      default_value: seedRow.default_value,
      description: seedRow.description,
      domain: seedRow.domain,
      id: existing.id,
      namespace: seedRow.namespace,
      override_value: normalizedOverrideValue,
    })
  }

  const createdRecords = createInputs.length
    ? await service.createStorefrontTexts(createInputs, sharedContext)
    : []

  if (updateInputs.length) {
    await service.updateStorefrontTexts(updateInputs, sharedContext)
  }

  const createdIds = createdRecords.map((record) => record.id)

  return {
    compensation: { createdIds, previousRecords },
    result: {
      created_count: createdIds.length,
      updated_count: updateInputs.length,
    },
  }
}

export const restoreSynchronizedStorefrontTexts = async (
  service: StorefrontTextModuleService,
  { createdIds, previousRecords }: StorefrontTextSyncCompensation,
  sharedContext: Context
) => {
  if (previousRecords.length) {
    await service.updateStorefrontTexts(previousRecords, sharedContext)
  }

  if (createdIds.length) {
    await service.deleteStorefrontTexts(createdIds, sharedContext)
  }
}

export const syncStorefrontTextsStep = createStep(
  "sync-storefront-texts",
  async (
    input: SyncStorefrontTextsWorkflowInput = {},
    { container }
  ) => {
    const service = container.resolve<StorefrontTextModuleService>(
      STOREFRONT_TEXT_MODULE
    )
    const { compensation, result } = await service.runInTransaction(
      (sharedContext) =>
        synchronizeStorefrontTexts(service, input, sharedContext)
    )

    return new StepResponse(result, compensation)
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return
    }

    const service = container.resolve<StorefrontTextModuleService>(
      STOREFRONT_TEXT_MODULE
    )

    await service.runInTransaction((sharedContext) =>
      restoreSynchronizedStorefrontTexts(
        service,
        compensation,
        sharedContext
      )
    )
  }
)
