import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type { PacketaClientModuleService } from "../../../modules/packeta-client"
import { PACKETA_CLIENT_MODULE } from "../../../modules/packeta-client"
import { toPacketaConfigResponse } from "../../../modules/packeta-client/config-response"
import { updatePacketaConfigWorkflow } from "../../../workflows/packeta-config/update-packeta-config"
import type { PostAdminPacketaConfigSchemaType } from "./validators"

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
    profiles: profiles.map(toPacketaConfigResponse),
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
  const { result: config } = await updatePacketaConfigWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.json({ config })
}
