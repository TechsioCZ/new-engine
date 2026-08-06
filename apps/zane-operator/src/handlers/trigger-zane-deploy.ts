import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { ZaneClient } from "../zane"
import { parseTriggerInput } from "../zane-inputs"

interface TriggerZaneDeployDeps {
  config: AppConfig
}

export const handleTriggerZaneDeploy = async (
  request: Request,
  deps: TriggerZaneDeployDeps,
): Promise<Response> => {
  try {
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      throw new BadRequestError("request body must be valid JSON")
    }

    const client = new ZaneClient(deps.config)
    const payload = parseTriggerInput(rawBody)
    const result = await client.triggerDeploys({
      environmentName: payload.environmentName,
      projectSlug: payload.projectSlug,
      targets: payload.targets,
      ...(payload.gitCommitSha === undefined
        ? {}
        : { gitCommitSha: payload.gitCommitSha }),
    })

    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "trigger-zane-deploy")
  }
}
