import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { activatePplProfileWorkflow } from "../../../../workflows/ppl-config/activate-ppl-profile"
import type { PostAdminPplActiveProfileSchemaType } from "../validators"

export async function POST(
  request: MedusaRequest<PostAdminPplActiveProfileSchemaType>,
  response: MedusaResponse
) {
  const { result } = await activatePplProfileWorkflow(request.scope).run({
    input: request.validatedBody,
  })

  response.json({ active_environment: result.environment })
}
