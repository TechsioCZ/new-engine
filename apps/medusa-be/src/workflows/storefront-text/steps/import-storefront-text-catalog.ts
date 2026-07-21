import type { Context } from "@medusajs/framework/types"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { STOREFRONT_TEXT_MODULE } from "../../../modules/storefront-text"
import { validateStorefrontTextOverride } from "../../../modules/storefront-text/message-validation"
import type { StorefrontTextRecord } from "../../../modules/storefront-text/models/storefront-text"
import {
  STOREFRONT_TEXT_DEFINITIONS,
  getStorefrontTextDefaultMessages,
  parseStorefrontTextCatalogEnvelope,
} from "../../../modules/storefront-text/registry"
import type StorefrontTextModuleService from "../../../modules/storefront-text/service"
import { getEffectiveStorefrontTextValue } from "../../../modules/storefront-text/value"
import type { ImportStorefrontTextCatalogWorkflowInput } from "../types"
import {
  restoreSynchronizedStorefrontTexts,
  synchronizeStorefrontTexts,
  type StorefrontTextSyncCompensation,
} from "./sync-storefront-texts"

type PreviousStorefrontTextValue = Pick<
  StorefrontTextRecord,
  "id" | "override_value" | "status"
>

type StorefrontTextCatalogImportCompensation = {
  importedPreviousValues: PreviousStorefrontTextValue[]
  sync: StorefrontTextSyncCompensation
}

const parseImportCatalog = (
  input: ImportStorefrontTextCatalogWorkflowInput
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
        : "Invalid storefront text catalog"
    )
  }
}

const restoreImportedCatalog = async (
  service: StorefrontTextModuleService,
  compensation: StorefrontTextCatalogImportCompensation,
  sharedContext: Context
) => {
  if (compensation.importedPreviousValues.length) {
    await service.updateStorefrontTexts(
      compensation.importedPreviousValues,
      sharedContext
    )
  }

  await restoreSynchronizedStorefrontTexts(
    service,
    compensation.sync,
    sharedContext
  )
}

export const importStorefrontTextCatalogStep = createStep(
  "import-storefront-text-catalog",
  async (
    input: ImportStorefrontTextCatalogWorkflowInput,
    { container }
  ) => {
    const catalog = parseImportCatalog(input)
    const service = container.resolve<StorefrontTextModuleService>(
      STOREFRONT_TEXT_MODULE
    )
    const { compensation, result } = await service.runInTransaction(
      async (sharedContext) => {
        const sync = await synchronizeStorefrontTexts(
          service,
          { market: input.market },
          sharedContext
        )
        const records = await service.listStorefrontTexts(
          {
            locale: catalog.locale,
            market: catalog.market,
          },
          {},
          sharedContext
        )
        const recordsByKey = new Map(
          records.map((record) => [record.key, record])
        )
        const defaultMessages = getStorefrontTextDefaultMessages({
          market: input.market,
        })
        const updateInputs: Array<{
          id: string
          override_value: null | string
          status: "active"
        }> = []
        const importedPreviousValues: PreviousStorefrontTextValue[] = []

        for (const definition of STOREFRONT_TEXT_DEFINITIONS) {
          const record = recordsByKey.get(definition.key)

          if (!record) {
            throw new MedusaError(
              MedusaError.Types.UNEXPECTED_STATE,
              `Storefront text "${definition.key}" is missing after synchronization`
            )
          }

          const value = catalog.messages[definition.key].trim()

          if (!value) {
            throw new MedusaError(
              MedusaError.Types.INVALID_DATA,
              `${definition.key}: Imported value cannot be blank`
            )
          }

          const defaultValue = defaultMessages[definition.key]

          if (defaultValue === undefined) {
            throw new MedusaError(
              MedusaError.Types.UNEXPECTED_STATE,
              `${definition.key}: Default value is missing`
            )
          }

          const validation = validateStorefrontTextOverride({
            defaultValue,
            locale: catalog.locale,
            overrideValue: value,
          })

          if (!validation.success) {
            throw new MedusaError(
              validation.code === "invalid_default"
                ? MedusaError.Types.UNEXPECTED_STATE
                : MedusaError.Types.INVALID_DATA,
              `${definition.key}: ${validation.message}`
            )
          }

          if (value === getEffectiveStorefrontTextValue(record)) {
            continue
          }

          const overrideValue = value === defaultValue ? null : value

          if (
            record.override_value === overrideValue &&
            record.status === "active"
          ) {
            continue
          }

          importedPreviousValues.push({
            id: record.id,
            override_value: record.override_value,
            status: record.status,
          })
          updateInputs.push({
            id: record.id,
            override_value: overrideValue,
            status: "active",
          })
        }

        if (updateInputs.length) {
          await service.updateStorefrontTexts(updateInputs, sharedContext)
        }

        return {
          compensation: {
            importedPreviousValues,
            sync: sync.compensation,
          },
          result: {
            unchanged_count:
              STOREFRONT_TEXT_DEFINITIONS.length - updateInputs.length,
            updated_count: updateInputs.length,
          },
        }
      }
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
      restoreImportedCatalog(service, compensation, sharedContext)
    )
  }
)
