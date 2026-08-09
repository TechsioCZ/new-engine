import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type {
  ApiStoreCreateInput,
  ApiStoreModuleService,
} from "../../modules/api-store"
import { API_STORE_MODULE } from "../../modules/api-store"

export const createApiStoreConfigStep = createStep(
  "create-api-store-config",
  async (input: ApiStoreCreateInput, { container }) => {
    const apiStoreService =
      container.resolve<ApiStoreModuleService>(API_STORE_MODULE)

    const config = await apiStoreService.createApiStoreConfig(input)

    return new StepResponse(config, config.id)
  },
  async (id, { container }) => {
    if (!id) {
      return
    }

    const apiStoreService =
      container.resolve<ApiStoreModuleService>(API_STORE_MODULE)

    await apiStoreService.deleteApiStoreConfig(id)
  }
)
