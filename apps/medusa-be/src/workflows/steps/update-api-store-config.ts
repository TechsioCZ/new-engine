import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import type {
  ApiStoreModuleService,
  ApiStoreUpdateInput,
} from "../../modules/api-store"
import { API_STORE_MODULE } from "../../modules/api-store"

export type UpdateApiStoreConfigStepInput = ApiStoreUpdateInput & {
  id: string
}

export const updateApiStoreConfigStep = createStep(
  "update-api-store-config",
  async (input: UpdateApiStoreConfigStepInput, { container }) => {
    const apiStoreService =
      container.resolve<ApiStoreModuleService>(API_STORE_MODULE)

    const { id, ...data } = input
    const config = await apiStoreService.updateApiStoreConfig(id, data)

    return new StepResponse(config)
  },
)
