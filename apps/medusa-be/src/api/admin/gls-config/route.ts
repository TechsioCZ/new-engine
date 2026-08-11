import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type { GLSClientModuleService } from "../../../modules/gls-client"
import { GLS_CLIENT_MODULE } from "../../../modules/gls-client"
import { toGLSConfigResponse } from "../../../modules/gls-client/config-response"
import { updateGLSConfigWorkflow } from "../../../workflows/gls-config/update-gls-config"
import type { PostAdminGLSConfigSchemaType } from "./validators"

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
    profiles: profiles.map(toGLSConfigResponse),
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
  const { result: config } = await updateGLSConfigWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.json({ config })
}
