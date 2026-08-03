import type {
  ApplyEnvOverridesPayload,
  ApplyEnvOverridesResponse,
} from "../contracts/apply-env-overrides.js"
import { applyEnvOverridesResponseSchema } from "../contracts/apply-env-overrides.js"
import type { ArchiveEnvironmentResponse } from "../contracts/archive-environment.js"
import { archiveEnvironmentResponseSchema } from "../contracts/archive-environment.js"
import type { PreviewCommitStateResponse } from "../contracts/preview-commit-state.js"
import { previewCommitStateResponseSchema } from "../contracts/preview-commit-state.js"
import type {
  EnsurePreviewDbResponse,
  TeardownPreviewDbResponse,
} from "../contracts/preview-db.js"
import {
  ensurePreviewDbResponseSchema,
  teardownPreviewDbResponseSchema,
} from "../contracts/preview-db.js"
import type { PreviewRandomOnceSecretsResponse } from "../contracts/preview-random-once-secrets.js"
import { previewRandomOnceSecretsResponseSchema } from "../contracts/preview-random-once-secrets.js"
import type {
  PreviewSharedEnvSyncResponse,
  PreviewSharedEnvVariableInput,
} from "../contracts/preview-shared-env.js"
import { previewSharedEnvSyncResponseSchema } from "../contracts/preview-shared-env.js"
import type { ResolveEnvironmentResponse } from "../contracts/resolve-environment.js"
import { resolveEnvironmentResponseSchema } from "../contracts/resolve-environment.js"
import type {
  ResolveTargetsPayload,
  ResolveTargetsResponse,
} from "../contracts/resolve-targets.js"
import { resolveTargetsResponseSchema } from "../contracts/resolve-targets.js"
import {
  type RuntimeProviderRunResponse,
  type RuntimeProviderRunPayload,
  runtimeProviderRunResponseSchema,
} from "../contracts/runtime-provider-run.js"
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
  const directMessage = record["message"]
  if (typeof directMessage === "string" && directMessage.trim()) {
    return directMessage.trim()
  }

  const errorField = record["error"]
  if (typeof errorField === "string" && errorField.trim()) {
    return errorField.trim()
  }

  if (errorField && typeof errorField === "object") {
    const nestedMessage = (errorField as Record<string, unknown>)["message"]
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
      const { headers, ...requestInit } = init
      response = await fetch(`${this.#baseUrl}${path}`, {
        ...requestInit,
        headers: new Headers({
          ...Object.fromEntries(new Headers(headers).entries()),
          authorization: `Bearer ${this.#apiToken}`,
        }),
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
    service_specs: Array<{
      service_id: string
      service_slug: string
      git_source?:
        | {
            sync_from_source: boolean
            branch_name?: string | undefined
            commit_sha?: string | undefined
          }
        | undefined
      builder?: {
        sync_from_source: boolean
        build_stage_target?: string | undefined | null
      }
      healthcheck?: {
        sync_from_source: boolean
      }
      resource_limits?: {
        sync_from_source: boolean
      }
    }>
  }): Promise<ResolveEnvironmentResponse> {
    return this.#postJson("/v1/zane/environments/resolve", payload, (value) =>
      resolveEnvironmentResponseSchema.parse(value)
    )
  }

  readPreviewCommitState(payload: {
    project_slug: string
    environment_name: string
  }): Promise<PreviewCommitStateResponse> {
    return this.#postJson(
      "/v1/zane/preview-commit-state/read",
      payload,
      (value) => previewCommitStateResponseSchema.parse(value)
    )
  }

  writePreviewCommitState(payload: {
    project_slug: string
    environment_name: string
    target_commit_sha?: string | undefined
    last_deployed_commit_sha?: string | undefined
    baseline_complete?: boolean
  }): Promise<PreviewCommitStateResponse> {
    return this.#postJson(
      "/v1/zane/preview-commit-state/write",
      payload,
      (value) => previewCommitStateResponseSchema.parse(value)
    )
  }

  syncPreviewRandomOnceSecrets(payload: {
    project_slug: string
    environment_name: string
    secrets: Array<{
      secret_id: string
      value?: string | undefined
      persist_to?: string | undefined
      persisted_env_var?: string | undefined
      targets: Array<{
        service_slug: string
        env_var: string
      }>
    }>
  }): Promise<PreviewRandomOnceSecretsResponse> {
    return this.#postJson(
      "/v1/zane/preview-random-once-secrets/sync",
      payload,
      (value) => previewRandomOnceSecretsResponseSchema.parse(value)
    )
  }

  syncPreviewSharedEnv(payload: {
    project_slug: string
    environment_name: string
    variables: PreviewSharedEnvVariableInput[]
  }): Promise<PreviewSharedEnvSyncResponse> {
    return this.#postJson(
      "/v1/zane/preview-shared-env/sync",
      payload,
      (value) => previewSharedEnvSyncResponseSchema.parse(value)
    )
  }

  syncPreviewServiceEnv(payload: {
    project_slug: string
    environment_name: string
    services: Array<{
      service_id: string
      service_slug: string
      env: Array<{
        env_var: string
        source: PreviewSharedEnvVariableInput["source"]
      }>
    }>
  }): Promise<ApplyEnvOverridesResponse> {
    return this.#postJson(
      "/v1/zane/preview-service-env/sync",
      payload,
      (value) => applyEnvOverridesResponseSchema.parse(value)
    )
  }

  resolveTargets(
    payload: ResolveTargetsPayload
  ): Promise<ResolveTargetsResponse> {
    return this.#postJson("/v1/zane/deploy/resolve-targets", payload, (value) =>
      resolveTargetsResponseSchema.parse(value)
    )
  }

  applyEnvOverrides(
    payload: ApplyEnvOverridesPayload
  ): Promise<ApplyEnvOverridesResponse> {
    return this.#postJson(
      "/v1/zane/deploy/apply-env-overrides",
      payload,
      (value) => applyEnvOverridesResponseSchema.parse(value)
    )
  }

  triggerDeploys(payload: {
    project_slug: string
    environment_name: string
    targets: ResolveTargetsResponse["services"]
    git_commit_sha?: string | undefined
  }): Promise<TriggerResponse> {
    return this.#postJson("/v1/zane/deploy/trigger", payload, (value) =>
      triggerResponseSchema.parse(value)
    )
  }

  async cancelDeployment(payload: {
    project_slug: string
    environment_name: string
    service_slug: string
    deployment_hash: string
  }): Promise<void> {
    await this.#postJson("/v1/zane/deploy/cancel", payload, () => null)
  }

  runRuntimeProvider(
    payload: RuntimeProviderRunPayload
  ): Promise<RuntimeProviderRunResponse> {
    return this.#postJson("/v1/zane/runtime-providers/run", payload, (value) =>
      runtimeProviderRunResponseSchema.parse(value)
    )
  }

  verifyDeploy(payload: VerifyDeployPayload): Promise<VerifyResponse> {
    return this.#postJson("/v1/zane/deploy/verify", payload, (value) =>
      verifyResponseSchema.parse(value)
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
      (value) => ensurePreviewDbResponseSchema.parse(value)
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
      (value) => teardownPreviewDbResponseSchema.parse(value)
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
      (value) => archiveEnvironmentResponseSchema.parse(value)
    )
  }
}
