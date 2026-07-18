import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import type { PplClientModuleService } from "../../../modules/ppl-client"
import { PPL_CLIENT_MODULE } from "../../../modules/ppl-client"
import type {
  PplConfigDTO,
  PplConfigResponse,
} from "../../../modules/ppl-client/types"
import { definedProperties } from "../../../utils/defined-properties"
import type { PostAdminPplConfigSchemaType } from "./validators"

/** Maps config DTO to API response with sensitive fields masked */
const toConfigResponse = (config: PplConfigDTO): PplConfigResponse => ({
  id: config.id,
  environment: config.environment,
  is_enabled: config.is_enabled,
  client_id: config.client_id,
  client_secret_set: !!config.client_secret,
  default_label_format: config.default_label_format,
  cod_bank_account_set: !!config.cod_bank_account,
  cod_bank_code_set: !!config.cod_bank_code,
  cod_iban_set: !!config.cod_iban,
  cod_swift_set: !!config.cod_swift,
  sender_name: config.sender_name,
  sender_street: config.sender_street,
  sender_city: config.sender_city,
  sender_zip_code: config.sender_zip_code,
  sender_country: config.sender_country,
  sender_phone: config.sender_phone,
  sender_email: config.sender_email,
})

/**
 * GET /admin/ppl-config
 *
 * Returns the current PPL configuration with sensitive fields masked.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pplService =
    req.scope.resolve<PplClientModuleService>(PPL_CLIENT_MODULE)

  const config = await pplService.getConfig()
  if (!config) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "PPL configuration not found. Please restart the server to initialize."
    )
  }

  res.json({ config: toConfigResponse(config) })
}

/**
 * POST /admin/ppl-config
 *
 * Updates the PPL configuration.
 * Empty string for sensitive fields = keep existing value.
 */
export async function POST(
  req: MedusaRequest<PostAdminPplConfigSchemaType>,
  res: MedusaResponse
) {
  const pplService =
    req.scope.resolve<PplClientModuleService>(PPL_CLIENT_MODULE)

  const updated = await pplService.updateConfig(
    definedProperties(req.validatedBody)
  )

  res.json({ config: toConfigResponse(updated) })
}
