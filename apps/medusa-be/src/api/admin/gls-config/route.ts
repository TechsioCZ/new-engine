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
  username: config.username,
  password_set: !!config.password,
  client_number: config.client_number,
  country_code: config.country_code,
  webshop_engine: config.webshop_engine,
  type_of_printer: config.type_of_printer,
  print_position: config.print_position,
  hide_phone_number_on_labels: config.hide_phone_number_on_labels,
  sender_name: config.sender_name,
  sender_street: config.sender_street,
  sender_house_number: config.sender_house_number,
  sender_house_number_info: config.sender_house_number_info,
  sender_city: config.sender_city,
  sender_zip_code: config.sender_zip_code,
  sender_country: config.sender_country,
  sender_phone: config.sender_phone,
  sender_email: config.sender_email,
})

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
