import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { parseCancelDeployInput } from "../zane-inputs"
import { ZaneClient } from "../zane"

interface CancelZaneDeployDeps {
  config: AppConfig
}

export async function handleCancelZaneDeploy(
  request: Request,
  deps: CancelZaneDeployDeps
): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => {
      throw new BadRequestError("request body must be valid JSON")
    })

    const client = new ZaneClient(deps.config)
    const payload = parseCancelDeployInput(rawBody)
    const result = await client.cancelDeployment({
      projectSlug: payload.projectSlug,
      environmentName: payload.environmentName,
      serviceSlug: payload.serviceSlug,
      deploymentHash: payload.deploymentHash,
    })

    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "cancel-zane-deploy")
  }
}
