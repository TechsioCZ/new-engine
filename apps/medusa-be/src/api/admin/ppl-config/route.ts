import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type { PplClientModuleService } from "../../../modules/ppl-client"
import { PPL_CLIENT_MODULE } from "../../../modules/ppl-client"
import { toPplConfigResponse } from "../../../modules/ppl-client/config-response"
import { updatePplConfigWorkflow } from "../../../workflows/ppl-config/update-ppl-config"
import type { PostAdminPplConfigSchemaType } from "./validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pplService =
    req.scope.resolve<PplClientModuleService>(PPL_CLIENT_MODULE)

  const profiles = await pplService.listConfigProfiles()
  if (profiles.length !== 2) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "PPL testing and production profiles must both be initialized"
    )
  }

  const activeProfile = profiles.find((profile) => profile.is_active)
  if (!activeProfile) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "PPL has no active configuration profile"
    )
  }

  res.json({
    active_environment: activeProfile.environment,
    profiles: profiles.map(toPplConfigResponse),
  })
}
export async function POST(
  req: MedusaRequest<PostAdminPplConfigSchemaType>,
  res: MedusaResponse
) {
  const { result: updated } = await updatePplConfigWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.json({ config: updated })
}
