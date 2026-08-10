import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type { GLSClientModuleService } from "../../../modules/gls-client"
import { GLS_CLIENT_MODULE } from "../../../modules/gls-client"
import type {
  GLSConfigDTO,
  GLSConfigResponse,
} from "../../../modules/gls-client/types"
import type { PostAdminGLSConfigSchemaType } from "./validators"

/** Maps config DTO to API response with sensitive fields masked. */
const toConfigResponse = (config: GLSConfigDTO): GLSConfigResponse => ({
  id: config.id,
  environment: config.environment,
  is_active: config.is_active,
  is_enabled: config.is_enabled,
  username: config.username,
  password_set: !!config.password,
  client_number: config.client_number,
  country_code: config.country_code,
  supported_countries: config.supported_countries,
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

  const profiles = await glsService.listConfigProfiles()
  if (profiles.length !== 2) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "GLS testing and production profiles must both be initialized"
    )
  }

  const activeProfile = profiles.find((profile) => profile.is_active)
  if (!activeProfile) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "GLS has no active configuration profile"
    )
  }

  res.json({
    active_environment: activeProfile.environment,
    profiles: profiles.map(toConfigResponse),
  })
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
  const glsService =
    req.scope.resolve<GLSClientModuleService>(GLS_CLIENT_MODULE)
  const { environment, ...config } = req.validatedBody
  const updated = await glsService.updateConfig(environment, config)

  res.json({ config: toConfigResponse(updated) })
}
