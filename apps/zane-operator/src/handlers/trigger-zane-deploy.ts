import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { parseTriggerInput } from "../zane-inputs"
import { ZaneClient } from "../zane"

interface TriggerZaneDeployDeps {
  config: AppConfig
}

export async function handleTriggerZaneDeploy(request: Request, deps: TriggerZaneDeployDeps): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => {
      throw new BadRequestError("request body must be valid JSON")
    })

    const client = new ZaneClient(deps.config)
    const payload = parseTriggerInput(rawBody)
    const result = await client.triggerDeploys({
      projectSlug: payload.projectSlug,
      environmentName: payload.environmentName,
      targets: payload.targets,
      gitCommitSha: payload.gitCommitSha,
    })

    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "trigger-zane-deploy")
  }
}
