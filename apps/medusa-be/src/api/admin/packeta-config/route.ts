import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type { PacketaClientModuleService } from "../../../modules/packeta-client"
import { PACKETA_CLIENT_MODULE } from "../../../modules/packeta-client"
import type {
  PacketaConfigDTO,
  PacketaConfigResponse,
} from "../../../modules/packeta-client/types"
import type { PostAdminPacketaConfigSchemaType } from "./validators"

/** Maps config DTO to API response with sensitive fields masked. */
const toConfigResponse = (config: PacketaConfigDTO): PacketaConfigResponse => ({
  id: config.id,
  environment: config.environment,
  is_active: config.is_active,
  is_enabled: config.is_enabled,
  allow_live_operations: config.allow_live_operations,
  api_password_set: !!config.api_password,
  widget_api_key_set: !!config.widget_api_key,
  widget_countries: config.widget_countries,
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
 * GET /admin/packeta-config
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const packetaService = req.scope.resolve<PacketaClientModuleService>(
    PACKETA_CLIENT_MODULE
  )

  const profiles = await packetaService.listConfigProfiles()
  if (profiles.length !== 2) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Packeta testing and production profiles must both be initialized"
    )
  }

  const activeProfile = profiles.find((profile) => profile.is_active)
  if (!activeProfile) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Packeta has no active configuration profile"
    )
  }

  res.json({
    active_environment: activeProfile.environment,
    profiles: profiles.map(toConfigResponse),
  })
}

/**
 * POST /admin/packeta-config
 *
 * Empty string on a sensitive field = keep existing value.
 * null on a sensitive field = clear it.
 */
export async function POST(
  req: MedusaRequest<PostAdminPacketaConfigSchemaType>,
  res: MedusaResponse
) {
  const packetaService = req.scope.resolve<PacketaClientModuleService>(
    PACKETA_CLIENT_MODULE
  )
  const { environment, ...config } = req.validatedBody
  const updated = await packetaService.updateConfig(environment, config)

  res.json({ config: toConfigResponse(updated) })
}
