import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  RESEND_CONFIG_MODULE,
  type ResendConfigModuleService,
  type ResendConfigUpdateInput,
} from "../../../modules/resend-config"

export const updateResendConfigStep = createStep(
  "update-resend-config",
  async (input: ResendConfigUpdateInput, { container }) => {
    const service =
      container.resolve<ResendConfigModuleService>(RESEND_CONFIG_MODULE)

    return new StepResponse(await service.updateConfig(input))
  }
)
