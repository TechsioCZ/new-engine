import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import type { ApiStoreModuleService } from "../../modules/api-store"
import { API_STORE_MODULE } from "../../modules/api-store"

export interface DeleteApiStoreConfigStepInput {
  id: string
}

export const deleteApiStoreConfigStep = createStep(
  "delete-api-store-config",
  async (input: DeleteApiStoreConfigStepInput, { container }) => {
    const apiStoreService =
      container.resolve<ApiStoreModuleService>(API_STORE_MODULE)

    const result = await apiStoreService.deleteApiStoreConfig(input.id)

    return new StepResponse(result)
  },
)
