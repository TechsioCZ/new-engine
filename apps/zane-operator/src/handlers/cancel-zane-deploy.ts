import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { ZaneClient } from "../zane"
import { parseCancelDeployInput } from "../zane-inputs"

interface CancelZaneDeployDeps {
  config: AppConfig
}

export async function handleCancelZaneDeploy(
  request: Request,
  deps: CancelZaneDeployDeps,
): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => {
      throw new BadRequestError("request body must be valid JSON")
    })

    const client = new ZaneClient(deps.config)
    const payload = parseCancelDeployInput(rawBody)
    const result = await client.cancelDeployment({
      deploymentHash: payload.deploymentHash,
      environmentName: payload.environmentName,
      projectSlug: payload.projectSlug,
      serviceSlug: payload.serviceSlug,
    })

    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "cancel-zane-deploy")
  }
}
