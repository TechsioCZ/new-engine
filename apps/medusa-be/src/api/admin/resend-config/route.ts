import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resendTemplateContracts } from "../../../modules/resend/templates"
import {
  RESEND_CONFIG_MODULE,
  type ResendConfigModuleService,
} from "../../../modules/resend-config"
import { updateResendConfigWorkflow } from "../../../workflows/resend-config/update-resend-config"
import type { PostAdminResendConfigSchemaType } from "./validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service =
    req.scope.resolve<ResendConfigModuleService>(RESEND_CONFIG_MODULE)

  res.json({
    config: await service.getConfig(),
    template_contracts: resendTemplateContracts,
  })
}

export async function POST(
  req: MedusaRequest<PostAdminResendConfigSchemaType>,
  res: MedusaResponse
) {
  const { result } = await updateResendConfigWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.json({ config: result, template_contracts: resendTemplateContracts })
}
