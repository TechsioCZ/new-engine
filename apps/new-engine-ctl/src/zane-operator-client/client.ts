import type {
  ApplyEnvOverridesPayload,
  ApplyEnvOverridesResponse,
} from "../contracts/apply-env-overrides.js"
import { applyEnvOverridesResponseSchema } from "../contracts/apply-env-overrides.js"
import type { ArchiveEnvironmentResponse } from "../contracts/archive-environment.js"
import { archiveEnvironmentResponseSchema } from "../contracts/archive-environment.js"
import type {
  EnsurePreviewDbResponse,
  TeardownPreviewDbResponse,
} from "../contracts/preview-db.js"
import {
  ensurePreviewDbResponseSchema,
  teardownPreviewDbResponseSchema,
} from "../contracts/preview-db.js"
import type { ProvisionPreviewMeiliKeysResponse } from "../contracts/provision-preview-meili-keys.js"
import {
  type ProvisionPreviewMeiliKeysPayload,
  provisionPreviewMeiliKeysResponseSchema,
} from "../contracts/provision-preview-meili-keys.js"
import type { ResolveEnvironmentResponse } from "../contracts/resolve-environment.js"
import { resolveEnvironmentResponseSchema } from "../contracts/resolve-environment.js"
import type {
  ResolveTargetsPayload,
  ResolveTargetsResponse,
} from "../contracts/resolve-targets.js"
import { resolveTargetsResponseSchema } from "../contracts/resolve-targets.js"
import type { TriggerResponse } from "../contracts/trigger.js"
import { triggerResponseSchema } from "../contracts/trigger.js"
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

  async #requestJson<T>(
    path: string,
    init: RequestInit,
    parseResponse: (value: unknown) => T
  ): Promise<{
    httpCode: number
    body: T
  }> {
    let response: Response

    try {
      response = await fetch(`${this.#baseUrl}${path}`, {
        ...init,
        headers: {
          authorization: `Bearer ${this.#apiToken}`,
          ...(init.headers ?? {}),
        },
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

    return {
      httpCode: response.status,
      body: parseResponse(responseBody),
    }
  }

  async #postJson<T>(
    path: string,
    payload: unknown,
    parseResponse: (value: unknown) => T
  ): Promise<T> {
    const response = await this.#requestJson(
      path,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      parseResponse
    )

    return response.body
  }

  resolveEnvironment(payload: {
    lane: "preview" | "main"
    project_slug: string
    environment_name: string
    source_environment_name: string
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

  triggerDeploys(payload: {
    project_slug: string
    environment_name: string
    targets: ResolveTargetsResponse["services"]
    git_commit_sha?: string
  }): Promise<TriggerResponse> {
    return this.#postJson(
      "/v1/zane/deploy/trigger",
      payload,
      triggerResponseSchema.parse
    )
  }

  provisionPreviewMeiliKeys(
    payload: ProvisionPreviewMeiliKeysPayload
  ): Promise<ProvisionPreviewMeiliKeysResponse> {
    return this.#postJson(
      "/v1/zane/meilisearch/provision-keys",
      payload,
      provisionPreviewMeiliKeysResponseSchema.parse
    )
  }

  verifyDeploy(payload: VerifyDeployPayload): Promise<VerifyResponse> {
    return this.#postJson(
      "/v1/zane/deploy/verify",
      payload,
      verifyResponseSchema.parse
    )
  }

  async ensurePreviewDb(prNumber: number): Promise<{
    httpCode: number
    body: EnsurePreviewDbResponse
  }> {
    return await this.#requestJson(
      "/v1/preview-db/ensure",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ pr_number: prNumber }),
      },
      ensurePreviewDbResponseSchema.parse
    )
  }

  async teardownPreviewDb(prNumber: number): Promise<{
    httpCode: number
    body: TeardownPreviewDbResponse
  }> {
    return await this.#requestJson(
      `/v1/preview-db/${prNumber}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      },
      teardownPreviewDbResponseSchema.parse
    )
  }

  async archiveEnvironment(payload: {
    project_slug: string
    environment_name: string
  }): Promise<{
    httpCode: number
    body: ArchiveEnvironmentResponse
  }> {
    return await this.#requestJson(
      "/v1/zane/environments/archive",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      archiveEnvironmentResponseSchema.parse
    )
  }
}
