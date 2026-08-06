import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { SYMMY_WEBHOOK_CONFIG_MODULE } from "../../../modules/webhook-config"
import type {
  SymmyWebhookConfigDTO,
  SymmyWebhookConfigModuleService,
} from "../../../modules/webhook-config"
import { symmyUpdateWebhookConfigWorkflow } from "../../../workflows/update-webhook-config/workflow"
import type { PostAdminSymmyWebhookConfigSchemaType } from "./validators"

const toConfigResponse = (config: SymmyWebhookConfigDTO) => ({
  created_at: config.created_at,
  endpoints: config.endpoints,
  id: config.id,
  is_enabled: config.is_enabled,
  updated_at: config.updated_at,
})

/*
 * @api [get] /admin/symmy-webhooks
 * operationId: GetAdminSymmyWebhookConfig
 * summary: Get Symmy webhook configuration
 * tags:
 *   - Symmy
 * description: Requires Medusa user authentication through bearer token, session, or API key.
 * x-authenticated: true
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 *   - jwt_token: []
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
const get = async (req: MedusaRequest, res: MedusaResponse) => {
  const webhookService = req.scope.resolve<SymmyWebhookConfigModuleService>(
    SYMMY_WEBHOOK_CONFIG_MODULE,
  )

  const config = await webhookService.getConfig()
  res.json({ config: toConfigResponse(config) })
}

/*
 * @api [post] /admin/symmy-webhooks
 * operationId: PostAdminSymmyWebhookConfig
 * summary: Update Symmy webhook configuration
 * tags:
 *   - Symmy
 * description: Requires Medusa user authentication through bearer token, session, or API key.
 * x-authenticated: true
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 *   - jwt_token: []
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
const post = async (
  req: MedusaRequest<PostAdminSymmyWebhookConfigSchemaType>,
  res: MedusaResponse,
) => {
  const { result: config } = await symmyUpdateWebhookConfigWorkflow(
    req.scope,
  ).run({
    input: req.validatedBody,
  })
  res.json({ config: toConfigResponse(config) })
}

export { get as GET, post as POST }
