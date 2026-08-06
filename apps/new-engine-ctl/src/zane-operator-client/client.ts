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
import { runtimeProviderRunResponseSchema } from "../contracts/runtime-provider-run.js"
import type {
  RuntimeProviderRunResponse,
  RuntimeProviderRunPayload,
} from "../contracts/runtime-provider-run.js"
import type { TriggerResponse } from "../contracts/trigger.js"
import { triggerResponseSchema } from "../contracts/trigger.js"
import type {
  VerifyDeployPayload,
  VerifyResponse,
} from "../contracts/verify.js"
import { verifyResponseSchema } from "../contracts/verify.js"

const trailingSlashesPattern = /\/+$/u

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const normalizeMessage = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined
  }

  const message = value.trim()
  return message.length > 0 ? message : undefined
}

const extractOperatorMessage = (body: unknown): string | undefined => {
  if (!isRecord(body)) {
    return undefined
  }

  const directMessage = normalizeMessage(body["message"])
  if (directMessage !== undefined) {
    return directMessage
  }

  const errorField = body["error"]
  const errorMessage = normalizeMessage(errorField)
  if (errorMessage !== undefined) {
    return errorMessage
  }

  if (isRecord(errorField)) {
    return normalizeMessage(errorField["message"])
  }

  return undefined
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
    parseResponse: (value: unknown) => T,
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
        "zane-operator request failed before a successful HTTP response",
      )
    }

    const responseText = await response.text()
    let responseBody: unknown = null

    if (responseText.trim()) {
      try {
        responseBody = JSON.parse(responseText)
      } catch {
        throw new Error(
          `zane-operator returned non-JSON response (HTTP ${response.status})`,
        )
      }
    }

    if (!response.ok) {
      const operatorMessage = extractOperatorMessage(responseBody)
      throw new Error(
        operatorMessage === undefined
          ? `zane-operator request returned HTTP ${response.status}`
          : `zane-operator request returned HTTP ${response.status}: ${operatorMessage}`,
      )
    }

    return {
      body: parseResponse(responseBody),
      httpCode: response.status,
    }
  }

  async #postJson<T>(
    path: string,
    payload: unknown,
    parseResponse: (value: unknown) => T,
  ): Promise<T> {
    const response = await this.#requestJson(
      path,
      {
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      parseResponse,
    )

    return response.body
  }

  async resolveEnvironment(payload: {
    lane: "preview" | "main"
    project_slug: string
    environment_name: string
    source_environment_name: string
    expected_preview_service_slugs: string[]
    excluded_preview_service_slugs: string[]
    service_specs: {
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
    }[]
  }): Promise<ResolveEnvironmentResponse> {
    return await this.#postJson(
      "/v1/zane/environments/resolve",
      payload,
      (value) => resolveEnvironmentResponseSchema.parse(value),
    )
  }

  async readPreviewCommitState(payload: {
    project_slug: string
    environment_name: string
  }): Promise<PreviewCommitStateResponse> {
    return await this.#postJson(
      "/v1/zane/preview-commit-state/read",
      payload,
      (value) => previewCommitStateResponseSchema.parse(value),
    )
  }

  async writePreviewCommitState(payload: {
    project_slug: string
    environment_name: string
    target_commit_sha?: string | undefined
    last_deployed_commit_sha?: string | undefined
    baseline_complete?: boolean
  }): Promise<PreviewCommitStateResponse> {
    return await this.#postJson(
      "/v1/zane/preview-commit-state/write",
      payload,
      (value) => previewCommitStateResponseSchema.parse(value),
    )
  }

  async syncPreviewRandomOnceSecrets(payload: {
    project_slug: string
    environment_name: string
    secrets: {
      secret_id: string
      value?: string | undefined
      persist_to?: string | undefined
      persisted_env_var?: string | undefined
      targets: {
        service_slug: string
        env_var: string
      }[]
    }[]
  }): Promise<PreviewRandomOnceSecretsResponse> {
    return await this.#postJson(
      "/v1/zane/preview-random-once-secrets/sync",
      payload,
      (value) => previewRandomOnceSecretsResponseSchema.parse(value),
    )
  }

  async syncPreviewSharedEnv(payload: {
    project_slug: string
    environment_name: string
    variables: PreviewSharedEnvVariableInput[]
  }): Promise<PreviewSharedEnvSyncResponse> {
    return await this.#postJson(
      "/v1/zane/preview-shared-env/sync",
      payload,
      (value) => previewSharedEnvSyncResponseSchema.parse(value),
    )
  }

  async syncPreviewServiceEnv(payload: {
    project_slug: string
    environment_name: string
    services: {
      service_id: string
      service_slug: string
      env: {
        env_var: string
        source: PreviewSharedEnvVariableInput["source"]
      }[]
    }[]
  }): Promise<ApplyEnvOverridesResponse> {
    return await this.#postJson(
      "/v1/zane/preview-service-env/sync",
      payload,
      (value) => applyEnvOverridesResponseSchema.parse(value),
    )
  }

  async resolveTargets(
    payload: ResolveTargetsPayload,
  ): Promise<ResolveTargetsResponse> {
    return await this.#postJson(
      "/v1/zane/deploy/resolve-targets",
      payload,
      (value) => resolveTargetsResponseSchema.parse(value),
    )
  }

  async applyEnvOverrides(
    payload: ApplyEnvOverridesPayload,
  ): Promise<ApplyEnvOverridesResponse> {
    return await this.#postJson(
      "/v1/zane/deploy/apply-env-overrides",
      payload,
      (value) => applyEnvOverridesResponseSchema.parse(value),
    )
  }

  async triggerDeploys(payload: {
    project_slug: string
    environment_name: string
    targets: ResolveTargetsResponse["services"]
    git_commit_sha?: string | undefined
  }): Promise<TriggerResponse> {
    return await this.#postJson("/v1/zane/deploy/trigger", payload, (value) =>
      triggerResponseSchema.parse(value),
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

  async runRuntimeProvider(
    payload: RuntimeProviderRunPayload,
  ): Promise<RuntimeProviderRunResponse> {
    return await this.#postJson(
      "/v1/zane/runtime-providers/run",
      payload,
      (value) => runtimeProviderRunResponseSchema.parse(value),
    )
  }

  async verifyDeploy(payload: VerifyDeployPayload): Promise<VerifyResponse> {
    return await this.#postJson("/v1/zane/deploy/verify", payload, (value) =>
      verifyResponseSchema.parse(value),
    )
  }

  async ensurePreviewDb(prNumber: number): Promise<{
    httpCode: number
    body: EnsurePreviewDbResponse
  }> {
    return await this.#requestJson(
      "/v1/preview-db/ensure",
      {
        body: JSON.stringify({ pr_number: prNumber }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      (value) => ensurePreviewDbResponseSchema.parse(value),
    )
  }

  async teardownPreviewDb(prNumber: number): Promise<{
    httpCode: number
    body: TeardownPreviewDbResponse
  }> {
    return await this.#requestJson(
      `/v1/preview-db/${prNumber}`,
      {
        headers: {
          Accept: "application/json",
        },
        method: "DELETE",
      },
      (value) => teardownPreviewDbResponseSchema.parse(value),
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
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
      (value) => archiveEnvironmentResponseSchema.parse(value),
    )
  }
}
