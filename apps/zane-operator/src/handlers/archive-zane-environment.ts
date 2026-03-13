import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { parseArchiveEnvironmentInput } from "../zane-inputs"
import { ZaneClient } from "../zane"

interface ArchiveZaneEnvironmentDeps {
  config: AppConfig
}

export async function handleArchiveZaneEnvironment(
  request: Request,
  deps: ArchiveZaneEnvironmentDeps,
): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => {
      throw new BadRequestError("request body must be valid JSON")
    })

    const client = new ZaneClient(deps.config)
    const payload = parseArchiveEnvironmentInput(rawBody)
    const result = await client.archiveEnvironment(payload)
    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "archive-zane-environment")
  }
}
