import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { activateGLSProfileWorkflow } from "../../../../workflows/gls-config/activate-gls-profile"
import type { PostAdminGLSActiveProfileSchemaType } from "../validators"

export async function POST(
  request: MedusaRequest<PostAdminGLSActiveProfileSchemaType>,
  response: MedusaResponse
) {
  const { result } = await activateGLSProfileWorkflow(request.scope).run({
    input: request.validatedBody,
  })

  response.json({ active_environment: result.environment })
}
