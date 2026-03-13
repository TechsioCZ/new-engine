import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { parseVerifyInput } from "../zane-inputs"
import { ZaneClient } from "../zane"

interface VerifyZaneDeployDeps {
  config: AppConfig
}

export async function handleVerifyZaneDeploy(request: Request, deps: VerifyZaneDeployDeps): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => {
      throw new BadRequestError("request body must be valid JSON")
    })

    const client = new ZaneClient(deps.config)
    const payload = parseVerifyInput(rawBody)
    const result = await client.verifyDeploy(payload)
    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "verify-zane-deploy")
  }
}
