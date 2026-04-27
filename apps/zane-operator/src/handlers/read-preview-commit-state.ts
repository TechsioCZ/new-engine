import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { parseReadPreviewCommitStateInput } from "../zane-inputs"
import { ZaneClient } from "../zane"

interface ReadPreviewCommitStateDeps {
  config: AppConfig
}

export async function handleReadPreviewCommitState(
  request: Request,
  deps: ReadPreviewCommitStateDeps,
): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => {
      throw new BadRequestError("request body must be valid JSON")
    })

    const client = new ZaneClient(deps.config)
    const payload = parseReadPreviewCommitStateInput(rawBody)
    const result = await client.readPreviewCommitState(payload)
    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "read-preview-commit-state")
  }
}
