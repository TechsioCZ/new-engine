import type {
  IStoreModuleService,
  Logger,
  StoreDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows"

export type UpdateStoreCurrenciesStepCurrenciesInput = {
  code: string
  default: boolean
}[]

export interface UpdateStoreCurrenciesStepInput {
  currencies: UpdateStoreCurrenciesStepCurrenciesInput
  defaultSalesChannelId: string
}

const UpdateStoreCurrenciesStepId = "update-store-currencies-seed-step"
export const updateStoreCurrenciesStep = createStep(
  UpdateStoreCurrenciesStepId,
  async (input: UpdateStoreCurrenciesStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const storeModuleService = container.resolve<IStoreModuleService>(
      Modules.STORE,
    )

    logger.info("Updating store currencies data...")

    // medusa bug? storeModuleService interface is not exported / defined?
    const [store]: StoreDTO[] = await storeModuleService.listStores()
    if (!store) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Store not found while updating seed currencies",
      )
    }

    const currencies = input.currencies.map((i) => ({
      currency_code: i.code,
      is_default: i.default,
    }))
    const result = await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          default_sales_channel_id: input.defaultSalesChannelId,
          supported_currencies: currencies,
        },
      },
    })

    return new StepResponse({
      result: result.result,
    })
  },
)
