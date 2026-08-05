import { sleep } from "@techsio/std/async"

import { BadRequestError } from "./db"
import type {
  ProvisionMeiliKeysInput,
  ProvisionMeiliKeysOutputInput,
} from "./zane-contract"
import { buildServicePublicUrls } from "./zane-effective-service-urls"
import { UpstreamHttpError } from "./zane-errors"
import { parseErrorMessage } from "./zane-upstream"
import type { ZaneSession } from "./zane-upstream"

const TEMPLATE_ENV_PATTERN = /^\{\{\s*env\.([A-Z0-9_]+)\s*\}\}$/
const HTTP_PORT_PATTERN = /:(\d+)$/
const TRAILING_SLASHES_PATTERN = /\/+$/
const LEADING_SLASHES_PATTERN = /^\/+/

interface ProvisionEnvironmentLookup {
  is_preview: boolean
  name: string
}

interface SearchProvisionServiceDetails {
  slug: string
  network_alias?: string | null
  global_network_alias?: string | null
  env_variables: Array<{
    key: string
    value: string
  }>
  system_env_variables?: Array<{
    key: string
    value: string
  }>
  environment?: {
    variables?: Array<{
      key: string
      value: string
    }>
  } | null
  urls: Array<{
    domain: string
    base_path: string
    associated_port?: number | null
  }>
}

interface ProvisionMeiliApiCredentialsDeps {
  authenticate(): Promise<ZaneSession>
  getEnvironment(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
  ): Promise<ProvisionEnvironmentLookup | null>
  getServiceDetails(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
  ): Promise<SearchProvisionServiceDetails>
}

interface ReconcileMeiliKeyInput {
  meiliUrl: string
  masterKey: string
  policy: ProvisionMeiliKeysOutputInput["policy"]
}

interface ReconcileMeiliKeyResult {
  keyObject: Record<string, unknown>
  created: boolean
  updated: boolean
}

interface UpdateMeiliKeyDescriptionInput {
  meiliUrl: string
  masterKey: string
  uid: string
  description: string
}

interface WriteMeiliKeyInput {
  meiliUrl: string
  masterKey: string
  method: "POST" | "PATCH"
  path: string
  payload: Record<string, unknown>
}

function resolveTemplateEnvValue(
  serviceDetails: SearchProvisionServiceDetails,
  value: string,
): string {
  const match = TEMPLATE_ENV_PATTERN.exec(value.trim())
  if (!match) {
    return value
  }

  const environmentVariables = Array.isArray(
    serviceDetails.environment?.variables,
  )
    ? serviceDetails.environment.variables
    : []
  const resolved = environmentVariables.find(
    (envVar) => envVar.key === match[1],
  )?.value
  return typeof resolved === "string" && resolved.trim() ? resolved : value
}

function getServiceEnvValue(
  serviceDetails: SearchProvisionServiceDetails,
  keys: string[],
): string | null {
  const envVariables = [
    ...(Array.isArray(serviceDetails.env_variables)
      ? serviceDetails.env_variables
      : []),
    ...(Array.isArray(serviceDetails.system_env_variables)
      ? serviceDetails.system_env_variables
      : []),
  ]
  const envByKey = new Map(
    envVariables.map((envVar) => [
      envVar.key,
      resolveTemplateEnvValue(serviceDetails, envVar.value),
    ]),
  )
  for (const key of keys) {
    const value = envByKey.get(key)
    if (typeof value === "string" && value.trim()) {
      return value
    }
  }
  return null
}

function parseHttpPortFromListenAddress(value: string | null): number | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const match = HTTP_PORT_PATTERN.exec(trimmed)
  if (!match) {
    return null
  }

  const port = Number(match[1])
  return Number.isInteger(port) && port > 0 ? port : null
}

function resolveServicePort(
  serviceDetails: SearchProvisionServiceDetails,
): number {
  const listenPort = parseHttpPortFromListenAddress(
    getServiceEnvValue(serviceDetails, ["MEILI_HTTP_ADDR"]),
  )
  if (listenPort !== null) {
    return listenPort
  }

  const urlPort = serviceDetails.urls.find(
    (url) => typeof url.associated_port === "number",
  )?.associated_port
  if (typeof urlPort === "number" && urlPort > 0) {
    return urlPort
  }

  return 7700
}

function buildServicePrivateUrl(
  serviceDetails: SearchProvisionServiceDetails,
): string | null {
  const privateDomain =
    getServiceEnvValue(serviceDetails, ["ZANE_GLOBAL_PRIVATE_DOMAIN"]) ??
    (typeof serviceDetails.global_network_alias === "string" &&
    serviceDetails.global_network_alias.trim()
      ? serviceDetails.global_network_alias.trim()
      : null) ??
    getServiceEnvValue(serviceDetails, ["ZANE_PRIVATE_DOMAIN"]) ??
    (typeof serviceDetails.network_alias === "string" &&
    serviceDetails.network_alias.trim()
      ? `${serviceDetails.network_alias.trim()}.zaneops.internal`
      : null)
  if (!privateDomain) {
    return null
  }

  return new URL(
    "/",
    `http://${privateDomain}:${resolveServicePort(serviceDetails)}`,
  ).toString()
}

function meiliKeyPermissionsMatch(
  keyObj: Record<string, unknown>,
  actions: string[],
  indexes: string[],
): boolean {
  const keyActions = Array.isArray(keyObj.actions)
    ? keyObj.actions.filter((item): item is string => typeof item === "string")
    : []
  const keyIndexes = Array.isArray(keyObj.indexes)
    ? keyObj.indexes.filter((item): item is string => typeof item === "string")
    : []

  return (
    JSON.stringify([...keyActions].sort()) ===
      JSON.stringify([...actions].sort()) &&
    JSON.stringify([...keyIndexes].sort()) ===
      JSON.stringify([...indexes].sort())
  )
}

function meiliKeyDescriptionMatches(
  keyObj: Record<string, unknown>,
  description: string,
): boolean {
  return keyObj.description === description
}

function resolveMeiliUrl(meiliUrl: string, path: string): string {
  const baseUrl = new URL(meiliUrl)
  const normalizedBasePath = baseUrl.pathname.replace(
    TRAILING_SLASHES_PATTERN,
    "",
  )
  baseUrl.pathname = normalizedBasePath ? `${normalizedBasePath}/` : "/"
  return new URL(path.replace(LEADING_SLASHES_PATTERN, ""), baseUrl).toString()
}

export class ZaneMeiliApiCredentialsProvisioner {
  readonly #deps: ProvisionMeiliApiCredentialsDeps

  constructor(deps: ProvisionMeiliApiCredentialsDeps) {
    this.#deps = deps
  }

  async provisionMeiliKeys(input: ProvisionMeiliKeysInput): Promise<{
    project_slug: string
    environment_name: string
    service_slug: string
    meili_url: string
    backend_key: string
    backend_env_var: string
    backend_created: boolean
    backend_updated: boolean
    frontend_key: string
    frontend_env_var: string
    frontend_created: boolean
    frontend_updated: boolean
  }> {
    const { backendOutput } = input
    const { frontendOutput } = input
    const backendEnvVar = this.resolveOptionalOutputEnvVar(
      backendOutput,
      "backend_output",
    )
    const frontendEnvVar = this.resolveOptionalOutputEnvVar(
      frontendOutput,
      "frontend_output",
    )
    const session = await this.#deps.authenticate()
    const environment = await this.#deps.getEnvironment(
      session,
      input.projectSlug,
      input.environmentName,
    )
    if (!environment) {
      throw new UpstreamHttpError(
        404,
        "zane_environment_not_found",
        `Environment ${input.environmentName} does not exist in project ${input.projectSlug}`,
      )
    }

    const serviceDetails = await this.#deps.getServiceDetails(
      session,
      input.projectSlug,
      input.environmentName,
      input.serviceSlug,
    )
    const serviceUrls = buildServicePublicUrls(serviceDetails)
    const publicMeiliUrl = serviceUrls[0]
    const meiliUrl = buildServicePrivateUrl(serviceDetails) ?? publicMeiliUrl
    if (!meiliUrl) {
      throw new UpstreamHttpError(
        409,
        "zane_meili_url_missing",
        `Service ${input.serviceSlug} does not expose an operator-reachable URL in ${input.projectSlug}/${input.environmentName}`,
      )
    }

    const meiliMasterKey = getServiceEnvValue(serviceDetails, [
      "MEILI_MASTER_KEY",
    ])
    if (!meiliMasterKey) {
      throw new UpstreamHttpError(
        409,
        "zane_meili_master_key_missing",
        `Service ${input.serviceSlug} does not expose a Meilisearch master key in ${input.projectSlug}/${input.environmentName}`,
      )
    }

    await this.waitForMeiliHealth(meiliUrl, input.readinessPath)

    const backend = await this.reconcileOptionalMeiliKey(
      backendOutput,
      meiliUrl,
      meiliMasterKey,
    )
    const frontend = await this.reconcileOptionalMeiliKey(
      frontendOutput,
      meiliUrl,
      meiliMasterKey,
    )

    const backendKey = this.readProvisionedKey(backend, "backend")
    const frontendKey = this.readProvisionedKey(frontend, "frontend")

    return {
      backend_created: backend?.created ?? false,
      backend_env_var: backendEnvVar,
      backend_key: backendKey,
      backend_updated: backend?.updated ?? false,
      environment_name: input.environmentName,
      frontend_created: frontend?.created ?? false,
      frontend_env_var: frontendEnvVar,
      frontend_key: frontendKey,
      frontend_updated: frontend?.updated ?? false,
      meili_url: meiliUrl,
      project_slug: input.projectSlug,
      service_slug: input.serviceSlug,
    }
  }

  private resolveOptionalOutputEnvVar(
    output: ProvisionMeiliKeysOutputInput | undefined,
    label: string,
  ): string {
    return output ? this.requireOutputEnvVar(output, label) : ""
  }

  private async reconcileOptionalMeiliKey(
    output: ProvisionMeiliKeysOutputInput | undefined,
    meiliUrl: string,
    masterKey: string,
  ): Promise<ReconcileMeiliKeyResult | null> {
    if (!output) {
      return null
    }

    return await this.reconcileMeiliKey({
      masterKey,
      meiliUrl,
      policy: output.policy,
    })
  }

  private readProvisionedKey(
    result: ReconcileMeiliKeyResult | null,
    label: string,
  ): string {
    if (!result) {
      return ""
    }

    const key =
      typeof result.keyObject.key === "string" ? result.keyObject.key : ""
    if (!key) {
      throw new UpstreamHttpError(
        502,
        "zane_meili_key_missing",
        `Provisioned ${label} Meilisearch key was missing key value`,
      )
    }

    return key
  }

  private async reconcileMeiliKey(
    input: ReconcileMeiliKeyInput,
  ): Promise<ReconcileMeiliKeyResult> {
    const existing = await this.getMeiliKeyByUid(
      input.meiliUrl,
      input.masterKey,
      input.policy.uid,
    )

    if (!existing) {
      return {
        created: true,
        keyObject: await this.createMeiliKey(input),
        updated: false,
      }
    }

    if (
      !meiliKeyPermissionsMatch(
        existing,
        input.policy.actions,
        input.policy.indexes,
      )
    ) {
      return {
        created: false,
        keyObject: await this.replaceMeiliKey(input),
        updated: true,
      }
    }

    if (!meiliKeyDescriptionMatches(existing, input.policy.description)) {
      return {
        created: false,
        keyObject: await this.updateMeiliKeyDescription({
          meiliUrl: input.meiliUrl,
          masterKey: input.masterKey,
          uid: input.policy.uid,
          description: input.policy.description,
        }),
        updated: true,
      }
    }

    return {
      created: false,
      keyObject: existing,
      updated: false,
    }
  }

  private requireOutputEnvVar(
    output: ProvisionMeiliKeysOutputInput,
    label: string,
  ): string {
    if (!output.envVar.trim()) {
      throw new BadRequestError(`${label}.envVar must be provided`)
    }

    return output.envVar.trim()
  }

  private async waitForMeiliHealth(
    meiliUrl: string,
    healthPath: string,
  ): Promise<void> {
    const healthUrl = resolveMeiliUrl(meiliUrl, healthPath)
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await fetch(healthUrl, {
        headers: {
          Accept: "application/json",
        },
        method: "GET",
      }).catch(() => null)

      if (response?.ok) {
        return
      }

      await sleep(2000)
    }

    throw new UpstreamHttpError(
      504,
      "zane_meili_unhealthy",
      `Timed out waiting for Meilisearch health at ${healthUrl}`,
    )
  }

  private async getMeiliKeyByUid(
    meiliUrl: string,
    masterKey: string,
    uid: string,
  ): Promise<Record<string, unknown> | null> {
    const response = await fetch(
      resolveMeiliUrl(meiliUrl, `/keys/${encodeURIComponent(uid)}`),
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${masterKey}`,
        },
        method: "GET",
      },
    )

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      let errorMessage = `Meilisearch key lookup failed for ${uid} (HTTP ${response.status})`
      try {
        errorMessage = parseErrorMessage(await response.json(), errorMessage)
      } catch {
        // keep fallback
      }
      throw new UpstreamHttpError(
        response.status,
        "zane_meili_key_lookup_failed",
        errorMessage,
      )
    }

    const payload = await response.json()
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new BadRequestError(`meili key ${uid} must be a JSON object`)
    }
    return payload as Record<string, unknown>
  }

  private async createMeiliKey(
    input: ReconcileMeiliKeyInput,
  ): Promise<Record<string, unknown>> {
    return await this.writeMeiliKey({
      masterKey: input.masterKey,
      meiliUrl: input.meiliUrl,
      method: "POST",
      path: "/keys",
      payload: {
        actions: input.policy.actions,
        description: input.policy.description,
        expiresAt: null,
        indexes: input.policy.indexes,
        uid: input.policy.uid,
      },
    })
  }

  private async replaceMeiliKey(
    input: ReconcileMeiliKeyInput,
  ): Promise<Record<string, unknown>> {
    await this.deleteMeiliKey(input.meiliUrl, input.masterKey, input.policy.uid)
    return await this.createMeiliKey(input)
  }

  private async updateMeiliKeyDescription(
    input: UpdateMeiliKeyDescriptionInput,
  ): Promise<Record<string, unknown>> {
    return await this.writeMeiliKey({
      masterKey: input.masterKey,
      meiliUrl: input.meiliUrl,
      method: "PATCH",
      path: `/keys/${encodeURIComponent(input.uid)}`,
      payload: {
        description: input.description,
      },
    })
  }

  private async deleteMeiliKey(
    meiliUrl: string,
    masterKey: string,
    uid: string,
  ): Promise<void> {
    const response = await fetch(
      resolveMeiliUrl(meiliUrl, `/keys/${encodeURIComponent(uid)}`),
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${masterKey}`,
        },
        method: "DELETE",
      },
    )

    if (!(response.ok || response.status === 404)) {
      let errorMessage = `Meilisearch key delete failed (HTTP ${response.status})`
      try {
        errorMessage = parseErrorMessage(await response.json(), errorMessage)
      } catch {
        // keep fallback
      }
      throw new UpstreamHttpError(
        response.status,
        "zane_meili_key_delete_failed",
        errorMessage,
      )
    }
  }

  private async writeMeiliKey(
    input: WriteMeiliKeyInput,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(resolveMeiliUrl(input.meiliUrl, input.path), {
      body: JSON.stringify(input.payload),
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input.masterKey}`,
        "Content-Type": "application/json",
      },
      method: input.method,
    })

    if (!response.ok) {
      let errorMessage = `Meilisearch key write failed (HTTP ${response.status})`
      try {
        errorMessage = parseErrorMessage(await response.json(), errorMessage)
      } catch {
        // keep fallback
      }
      throw new UpstreamHttpError(
        response.status,
        "zane_meili_key_write_failed",
        errorMessage,
      )
    }

    const responsePayload = await response.json()
    if (
      !responsePayload ||
      typeof responsePayload !== "object" ||
      Array.isArray(responsePayload)
    ) {
      throw new BadRequestError("meili key response must be a JSON object")
    }
    return responsePayload as Record<string, unknown>
  }
}
