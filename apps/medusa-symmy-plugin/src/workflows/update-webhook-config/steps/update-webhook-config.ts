import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import {
  SYMMY_WEBHOOK_CONFIG_MODULE,
  type SymmyWebhookConfigModuleService,
  type UpdateSymmyWebhookConfigInput,
} from "../../../modules/webhook-config"

export const symmyUpdateWebhookConfigStep = createStep(
  "symmy-update-webhook-config",
  async (input: UpdateSymmyWebhookConfigInput, { container }) => {
    const service = container.resolve<SymmyWebhookConfigModuleService>(
      SYMMY_WEBHOOK_CONFIG_MODULE
    )
    const previous = await service.getConfig()
    const updated = await service.updateConfig(input)

    return new StepResponse(updated, {
      endpoints: previous.endpoints,
      is_enabled: previous.is_enabled,
    })
  },
  async (
    previous: UpdateSymmyWebhookConfigInput | undefined,
    { container }
  ) => {
    if (!previous) {
      return
    }

    const service = container.resolve<SymmyWebhookConfigModuleService>(
      SYMMY_WEBHOOK_CONFIG_MODULE
    )
    await service.updateConfig(previous)
  }
)
