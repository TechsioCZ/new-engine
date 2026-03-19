import type { AppConfig } from "../config"
import { BadRequestError } from "../db"
import { jsonResponse, mapHandlerError } from "../http"
import { ZaneClient } from "../zane"
import { parseProvisionMeiliKeysInput } from "../zane-inputs"

type ProvisionMeiliKeysDeps = {
  config: AppConfig
}

export async function handleProvisionMeiliKeys(
  request: Request,
  deps: ProvisionMeiliKeysDeps
): Promise<Response> {
  try {
    const rawBody = await request.json().catch(() => {
      throw new BadRequestError("request body must be valid JSON")
    })

    const client = new ZaneClient(deps.config)
    const payload = parseProvisionMeiliKeysInput(rawBody)
    const result = await client.provisionMeiliKeys(payload)
    return jsonResponse(200, result)
  } catch (error: unknown) {
    return mapHandlerError(error, "provision-meili-keys")
  }
}
