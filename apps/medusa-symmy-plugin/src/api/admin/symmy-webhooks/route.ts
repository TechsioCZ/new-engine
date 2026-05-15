import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  SYMMY_WEBHOOK_CONFIG_MODULE,
  type SymmyWebhookConfigDTO,
  type SymmyWebhookConfigModuleService,
} from "../../../modules/webhook-config"
import type { PostAdminSymmyWebhookConfigSchemaType } from "./validators"

const toConfigResponse = (config: SymmyWebhookConfigDTO) => ({
  id: config.id,
  is_enabled: config.is_enabled,
  endpoints: config.endpoints,
  created_at: config.created_at,
  updated_at: config.updated_at,
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const webhookService =
    req.scope.resolve<SymmyWebhookConfigModuleService>(
      SYMMY_WEBHOOK_CONFIG_MODULE
    )

  const config = await webhookService.getConfig()
  res.json({ config: toConfigResponse(config) })
}

export async function POST(
  req: MedusaRequest<PostAdminSymmyWebhookConfigSchemaType>,
  res: MedusaResponse
) {
  const webhookService =
    req.scope.resolve<SymmyWebhookConfigModuleService>(
      SYMMY_WEBHOOK_CONFIG_MODULE
    )

  const config = await webhookService.updateConfig(req.validatedBody)
  res.json({ config: toConfigResponse(config) })
}
