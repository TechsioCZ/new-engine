import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { ZaneClient } from "../zane"
import { parseSyncPreviewRandomOnceSecretsInput } from "../zane-inputs"

interface SyncPreviewRandomOnceSecretsDeps {
  config: AppConfig
}

export const handleSyncPreviewRandomOnceSecrets = async (
  request: Request,
  deps: SyncPreviewRandomOnceSecretsDeps,
): Promise<Response> => {
  try {
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      throw new BadRequestError("request body must be valid JSON")
    }

    const client = new ZaneClient(deps.config)
    const payload = parseSyncPreviewRandomOnceSecretsInput(rawBody)
    const result = await client.syncPreviewRandomOnceSecrets(payload)
    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "sync-preview-random-once-secrets")
  }
}
