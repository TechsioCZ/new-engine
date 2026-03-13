import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import type { StackInputsConfig } from "../stack-inputs"
import { parseProvisionPreviewMeiliKeysInput } from "../zane-inputs"
import { ZaneClient } from "../zane"

interface ProvisionPreviewMeiliKeysDeps {
  config: AppConfig
  stackInputs: StackInputsConfig
}

export async function handleProvisionPreviewMeiliKeys(
  request: Request,
  deps: ProvisionPreviewMeiliKeysDeps,
): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => {
      throw new BadRequestError("request body must be valid JSON")
    })

    const client = new ZaneClient(deps.config, deps.stackInputs)
    const payload = parseProvisionPreviewMeiliKeysInput(rawBody)
    const result = await client.provisionPreviewMeiliKeys(payload)
    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "provision-preview-meili-keys")
  }
}
