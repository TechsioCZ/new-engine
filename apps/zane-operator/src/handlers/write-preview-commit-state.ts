import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { parseWritePreviewCommitStateInput } from "../zane-inputs"
import { ZaneClient } from "../zane"

interface WritePreviewCommitStateDeps {
  config: AppConfig
}

export async function handleWritePreviewCommitState(
  request: Request,
  deps: WritePreviewCommitStateDeps,
): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => {
      throw new BadRequestError("request body must be valid JSON")
    })

    const client = new ZaneClient(deps.config)
    const payload = parseWritePreviewCommitStateInput(rawBody)
    const result = await client.writePreviewCommitState(payload)
    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "write-preview-commit-state")
  }
}
