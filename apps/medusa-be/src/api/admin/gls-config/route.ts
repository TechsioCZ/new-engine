import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type { GLSClientModuleService } from "../../../modules/gls-client"
import { GLS_CLIENT_MODULE } from "../../../modules/gls-client"
import type {
  GLSConfigDTO,
  GLSConfigResponse,
} from "../../../modules/gls-client/types"
import { updateGLSConfigWorkflow } from "../../../workflows/gls-config/update-gls-config"
import type { PostAdminGLSConfigSchemaType } from "./validators"

/** Maps config DTO to API response with sensitive fields masked. */
const toConfigResponse = (config: GLSConfigDTO): GLSConfigResponse => ({
  id: config.id,
  environment: config.environment,
  is_enabled: config.is_enabled,
  api_password_set: !!config.api_password,
  sender_label: config.sender_label,
  eshop_id: config.eshop_id,
  default_label_format: config.default_label_format,
  default_label_offset: config.default_label_offset,
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
 * GET /admin/gls-config
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const glsService =
    req.scope.resolve<GLSClientModuleService>(GLS_CLIENT_MODULE)

  const glsConfig = await glsService.getConfig()
  if (!glsConfig) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "GLS configuration not found. Please restart the server to initialize."
    )
  }

  res.json({ config: toConfigResponse(glsConfig) })
}

/**
 * POST /admin/gls-config
 *
 * Empty string on a sensitive field = keep existing value.
 * null on a sensitive field = clear it.
 */
export async function POST(
  req: MedusaRequest<PostAdminGLSConfigSchemaType>,
  res: MedusaResponse
) {
  const { result: updated } = await updateGLSConfigWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.json({ config: toConfigResponse(updated) })
}
