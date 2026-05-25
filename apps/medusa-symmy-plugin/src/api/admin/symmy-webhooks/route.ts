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

/**
 * @api [get] /admin/symmy-webhooks
 * operationId: GetAdminSymmyWebhookConfig
 * summary: Get Symmy webhook configuration
 * tags:
 *   - Symmy
 * responses:
 *   "200":
 *     description: The current Symmy webhook configuration.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyWebhookConfigResponse"
 *   "401":
 *     description: Missing or invalid admin authentication.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const webhookService = req.scope.resolve<SymmyWebhookConfigModuleService>(
    SYMMY_WEBHOOK_CONFIG_MODULE
  )

  const config = await webhookService.getConfig()
  res.json({ config: toConfigResponse(config) })
}

/**
 * @api [post] /admin/symmy-webhooks
 * operationId: PostAdminSymmyWebhookConfig
 * summary: Update Symmy webhook configuration
 * tags:
 *   - Symmy
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/SymmyUpdateWebhookConfigRequest"
 * responses:
 *   "200":
 *     description: The updated Symmy webhook configuration.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyWebhookConfigResponse"
 *   "400":
 *     description: Invalid webhook configuration payload.
 *   "401":
 *     description: Missing or invalid admin authentication.
 */
export async function POST(
  req: MedusaRequest<PostAdminSymmyWebhookConfigSchemaType>,
  res: MedusaResponse
) {
  const webhookService = req.scope.resolve<SymmyWebhookConfigModuleService>(
    SYMMY_WEBHOOK_CONFIG_MODULE
  )

  const config = await webhookService.updateConfig(req.validatedBody)
  res.json({ config: toConfigResponse(config) })
}
