import type {
  ApplyEnvOverridesPayload,
  ApplyEnvOverridesResponse,
} from "../contracts/apply-env-overrides.js"
import { applyEnvOverridesResponseSchema } from "../contracts/apply-env-overrides.js"
import type { ResolveEnvironmentResponse } from "../contracts/resolve-environment.js"
import { resolveEnvironmentResponseSchema } from "../contracts/resolve-environment.js"
import type {
  ResolveTargetsPayload,
  ResolveTargetsResponse,
} from "../contracts/resolve-targets.js"
import { resolveTargetsResponseSchema } from "../contracts/resolve-targets.js"
import type {
  VerifyDeployPayload,
  VerifyResponse,
} from "../contracts/verify.js"
import { verifyResponseSchema } from "../contracts/verify.js"

const trailingSlashesPattern = /\/+$/

function extractOperatorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return
  }

  const record = body as Record<string, unknown>
  const directMessage = record.message
  if (typeof directMessage === "string" && directMessage.trim()) {
    return directMessage.trim()
  }

  const errorField = record.error
  if (typeof errorField === "string" && errorField.trim()) {
    return errorField.trim()
  }

  if (errorField && typeof errorField === "object") {
    const nestedMessage = (errorField as Record<string, unknown>).message
    if (typeof nestedMessage === "string" && nestedMessage.trim()) {
      return nestedMessage.trim()
    }
  }

  return
}

export class ZaneOperatorClient {
  readonly #baseUrl: string
  readonly #apiToken: string

  constructor(baseUrl: string, apiToken: string) {
    this.#baseUrl = baseUrl.replace(trailingSlashesPattern, "")
    this.#apiToken = apiToken
  }

  async #postJson<T>(
    path: string,
    payload: unknown,
    parseResponse: (value: unknown) => T
  ): Promise<T> {
    let response: Response

    try {
      response = await fetch(`${this.#baseUrl}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.#apiToken}`,
        },
        body: JSON.stringify(payload),
      })
    } catch {
      throw new Error(
        "zane-operator request failed before a successful HTTP response"
      )
    }

    const responseText = await response.text()
    let responseBody: unknown = null

    if (responseText.trim()) {
      try {
        responseBody = JSON.parse(responseText)
      } catch {
        throw new Error(
          `zane-operator returned non-JSON response (HTTP ${response.status})`
        )
      }
    }

    if (!response.ok) {
      const operatorMessage = extractOperatorMessage(responseBody)
      throw new Error(
        operatorMessage
          ? `zane-operator request returned HTTP ${response.status}: ${operatorMessage}`
          : `zane-operator request returned HTTP ${response.status}`
      )
    }

    return parseResponse(responseBody)
  }

  resolveEnvironment(payload: {
    lane: "preview" | "main"
    project_slug: string
    environment_name: string
    expected_preview_service_slugs: string[]
    excluded_preview_service_slugs: string[]
  }): Promise<ResolveEnvironmentResponse> {
    return this.#postJson(
      "/v1/zane/environments/resolve",
      payload,
      resolveEnvironmentResponseSchema.parse
    )
  }

  resolveTargets(
    payload: ResolveTargetsPayload
  ): Promise<ResolveTargetsResponse> {
    return this.#postJson(
      "/v1/zane/deploy/resolve-targets",
      payload,
      resolveTargetsResponseSchema.parse
    )
  }

  applyEnvOverrides(
    payload: ApplyEnvOverridesPayload
  ): Promise<ApplyEnvOverridesResponse> {
    return this.#postJson(
      "/v1/zane/deploy/apply-env-overrides",
      payload,
      applyEnvOverridesResponseSchema.parse
    )
  }

  verifyDeploy(payload: VerifyDeployPayload): Promise<VerifyResponse> {
    return this.#postJson(
      "/v1/zane/deploy/verify",
      payload,
      verifyResponseSchema.parse
    )
  }
}
