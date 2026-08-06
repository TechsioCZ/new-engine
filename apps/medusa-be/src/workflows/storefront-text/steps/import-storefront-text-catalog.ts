import type { Context } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { STOREFRONT_TEXT_MODULE } from "../../../modules/storefront-text"
import { validateStorefrontTextOverride } from "../../../modules/storefront-text/message-validation"
import type { StorefrontTextRecord } from "../../../modules/storefront-text/models/storefront-text"
import {
  getStorefrontTextDefaultMessages,
  parseStorefrontTextCatalogEnvelope,
  STOREFRONT_TEXT_DEFINITIONS,
} from "../../../modules/storefront-text/registry"
import type StorefrontTextModuleService from "../../../modules/storefront-text/service"
import { getEffectiveStorefrontTextValue } from "../../../modules/storefront-text/value"
import type { ImportStorefrontTextCatalogWorkflowInput } from "../types"
import {
  restoreSynchronizedStorefrontTexts,
  synchronizeStorefrontTexts,
} from "./sync-storefront-texts"
import type {
  StorefrontTextSyncCompensation,
  SynchronizeStorefrontTextsService,
} from "./sync-storefront-texts"

type PreviousStorefrontTextValue = Pick<
  StorefrontTextRecord,
  "id" | "override_value" | "status"
>

interface StorefrontTextCatalogImportCompensation {
  importedPreviousValues: PreviousStorefrontTextValue[]
  sync: StorefrontTextSyncCompensation
}

interface StorefrontTextUpdateInput {
  id: string
  override_value: null | string
  status: "active"
}

const parseImportCatalog = (
  input: ImportStorefrontTextCatalogWorkflowInput,
) => {
  try {
    return parseStorefrontTextCatalogEnvelope({
      catalog: input.catalog,
      targetMarket: input.market,
    })
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      error instanceof Error
        ? error.message
        : "Invalid storefront text catalog",
    )
  }
}

export type ImportStorefrontTextCatalogService =
  SynchronizeStorefrontTextsService

const restoreImportedCatalog = async (
  service: ImportStorefrontTextCatalogService,
  compensation: StorefrontTextCatalogImportCompensation,
  sharedContext: Context,
) => {
  if (compensation.importedPreviousValues.length > 0) {
    await service.updateStorefrontTexts(
      compensation.importedPreviousValues,
      sharedContext,
    )
  }

  await restoreSynchronizedStorefrontTexts(
    service,
    compensation.sync,
    sharedContext,
  )
}

const resolveImportedStorefrontTextUpdate = ({
  defaultValue,
  definition,
  locale,
  record,
  value,
}: {
  defaultValue: string | undefined
  definition: (typeof STOREFRONT_TEXT_DEFINITIONS)[number]
  locale: string
  record: StorefrontTextRecord | undefined
  value: string
}): {
  previousValue: PreviousStorefrontTextValue
  updateInput: StorefrontTextUpdateInput
} | null => {
  if (record === undefined) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Storefront text "${definition.key}" is missing after synchronization`,
    )
  }

  const importedValue = value.trim()

  if (importedValue.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${definition.key}: Imported value cannot be blank`,
    )
  }

  if (defaultValue === undefined) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${definition.key}: Default value is missing`,
    )
  }

  const validation = validateStorefrontTextOverride({
    defaultValue,
    locale,
    overrideValue: importedValue,
  })

  if (!validation.success) {
    throw new MedusaError(
      validation.code === "invalid_default"
        ? MedusaError.Types.UNEXPECTED_STATE
        : MedusaError.Types.INVALID_DATA,
      `${definition.key}: ${validation.message}`,
    )
  }

  if (importedValue === getEffectiveStorefrontTextValue(record)) {
    return null
  }

  const overrideValue = importedValue === defaultValue ? null : importedValue

  if (record.override_value === overrideValue && record.status === "active") {
    return null
  }

  return {
    previousValue: {
      id: record.id,
      override_value: record.override_value,
      status: record.status,
    },
    updateInput: {
      id: record.id,
      override_value: overrideValue,
      status: "active",
    },
  }
}

const listStorefrontTextsAfterSynchronization = async (
  service: ImportStorefrontTextCatalogService,
  catalog: ReturnType<typeof parseImportCatalog>,
  sharedContext: Context,
  synchronization: Awaited<ReturnType<typeof synchronizeStorefrontTexts>>,
) => ({
  records: await service.listStorefrontTexts(
    {
      locale: catalog.locale,
      market: catalog.market,
    },
    {},
    sharedContext,
  ),
  synchronization,
})

const importStorefrontTextCatalogInTransaction = async ({
  catalog,
  input,
  service,
  sharedContext,
}: {
  catalog: ReturnType<typeof parseImportCatalog>
  input: ImportStorefrontTextCatalogWorkflowInput
  service: ImportStorefrontTextCatalogService
  sharedContext: Context
}) => {
  const synchronization = await synchronizeStorefrontTexts(
    service,
    { market: input.market },
    sharedContext,
  )
  const { records, synchronization: sync } =
    await listStorefrontTextsAfterSynchronization(
      service,
      catalog,
      sharedContext,
      synchronization,
    )
  const recordsByKey = new Map(records.map((record) => [record.key, record]))
  const defaultMessages = getStorefrontTextDefaultMessages({
    market: input.market,
  })
  const updateInputs: StorefrontTextUpdateInput[] = []
  const importedPreviousValues: PreviousStorefrontTextValue[] = []

  for (const definition of STOREFRONT_TEXT_DEFINITIONS) {
    const update = resolveImportedStorefrontTextUpdate({
      defaultValue: defaultMessages[definition.key],
      definition,
      locale: catalog.locale,
      record: recordsByKey.get(definition.key),
      value: catalog.messages[definition.key],
    })

    if (!update) {
      continue
    }

    importedPreviousValues.push(update.previousValue)
    updateInputs.push(update.updateInput)
  }

  if (updateInputs.length > 0) {
    await service.updateStorefrontTexts(updateInputs, sharedContext)
  }

  return {
    compensation: {
      importedPreviousValues,
      sync: sync.compensation,
    },
    result: {
      unchanged_count: STOREFRONT_TEXT_DEFINITIONS.length - updateInputs.length,
      updated_count: updateInputs.length,
    },
  }
}

export const importStorefrontTextCatalog = async (
  service: ImportStorefrontTextCatalogService,
  input: ImportStorefrontTextCatalogWorkflowInput,
  sharedContext: Context,
) =>
  await importStorefrontTextCatalogInTransaction({
    catalog: parseImportCatalog(input),
    input,
    service,
    sharedContext,
  })

export const importStorefrontTextCatalogStep = createStep(
  "import-storefront-text-catalog",
  async (input: ImportStorefrontTextCatalogWorkflowInput, { container }) => {
    const catalog = parseImportCatalog(input)
    const service = container.resolve<StorefrontTextModuleService>(
      STOREFRONT_TEXT_MODULE,
    )
    const { compensation, result } = await service.runInTransaction(
      async (sharedContext) =>
        await importStorefrontTextCatalogInTransaction({
          catalog,
          input,
          service,
          sharedContext,
        }),
    )

    return new StepResponse(result, compensation)
  },
  async (compensation, { container }) => {
    if (compensation === undefined) {
      return
    }

    const service = container.resolve<StorefrontTextModuleService>(
      STOREFRONT_TEXT_MODULE,
    )

    await service.runInTransaction(async (sharedContext) => {
      await restoreImportedCatalog(service, compensation, sharedContext)
    })
  },
)
