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
 * GET /admin/packeta-config
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const packetaService = req.scope.resolve<PacketaClientModuleService>(
    PACKETA_CLIENT_MODULE
  )

  const packetaConfig = await packetaService.getConfig()
  if (!packetaConfig) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Packeta configuration not found. Please restart the server to initialize."
    )
  }

  res.json({ config: toConfigResponse(packetaConfig) })
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

  const updated = await packetaService.updateConfig(req.validatedBody)

  res.json({ config: toConfigResponse(updated) })
}
