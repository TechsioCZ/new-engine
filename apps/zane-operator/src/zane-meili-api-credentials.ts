import { sleep } from "@techsio/std/async"
import { isRecord } from "@techsio/std/object"

import { BadRequestError } from "./db"
import type {
  ProvisionMeiliKeysInput,
  ProvisionMeiliKeysOutputInput,
} from "./zane-contract"
import { buildServicePublicUrls } from "./zane-effective-service-urls"
import { UpstreamHttpError } from "./zane-errors"
import { parseErrorMessage } from "./zane-upstream"
import type { ZaneSession } from "./zane-upstream"

const TEMPLATE_ENV_PATTERN = /^\{\{\s*env\.(?<envName>[A-Z0-9_]+)\s*\}\}$/u
const HTTP_PORT_PATTERN = /:(?<port>\d+)$/u
const TRAILING_SLASHES_PATTERN = /\/+$/u
const LEADING_SLASHES_PATTERN = /^\/+/u

interface ProvisionEnvironmentLookup {
  is_preview: boolean
  name: string
}

interface SearchProvisionServiceDetails {
  slug: string
  network_alias?: string | null
  global_network_alias?: string | null
  env_variables: {
    key: string
    value: string
  }[]
  system_env_variables?: {
    key: string
    value: string
  }[]
  environment?: {
    variables?: {
      key: string
      value: string
    }[]
  } | null
  urls: {
    domain: string
    base_path: string
    associated_port?: number | null
  }[]
}

interface ProvisionMeiliApiCredentialsDeps {
  authenticate: () => Promise<ZaneSession>
  getEnvironment: (
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
  ) => Promise<ProvisionEnvironmentLookup | null>
  getServiceDetails: (
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
  ) => Promise<SearchProvisionServiceDetails>
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

const resolveTemplateEnvValue = (
  serviceDetails: SearchProvisionServiceDetails,
  value: string,
): string => {
  const match = TEMPLATE_ENV_PATTERN.exec(value.trim())
  if (!match) {
    return value
  }

  const { envName } = match.groups ?? {}
  const environmentVariables = Array.isArray(
    serviceDetails.environment?.variables,
  )
    ? serviceDetails.environment.variables
    : []
  const resolved = environmentVariables.find(
    (envVar) => envVar.key === envName,
  )?.value
  return typeof resolved === "string" && resolved.trim() ? resolved : value
}

const getServiceEnvValue = (
  serviceDetails: SearchProvisionServiceDetails,
  keys: string[],
): string | null => {
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

const parseHttpPortFromListenAddress = (
  value: string | null,
): number | null => {
  if (value === null) {
    return null
  }

  const trimmed = value.trim()
  if (trimmed === "") {
    return null
  }

  const match = HTTP_PORT_PATTERN.exec(trimmed)
  if (!match) {
    return null
  }

  const { port: portGroup } = match.groups ?? {}
  const port = Number(portGroup)
  return Number.isInteger(port) && port > 0 ? port : null
}

const resolveServicePort = (
  serviceDetails: SearchProvisionServiceDetails,
): number => {
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

const resolveTrimmedField = (
  value: string | null | undefined,
): string | null => {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

const buildServicePrivateUrl = (
  serviceDetails: SearchProvisionServiceDetails,
): string | null => {
  const globalAlias = resolveTrimmedField(serviceDetails.global_network_alias)
  const networkAlias = resolveTrimmedField(serviceDetails.network_alias)
  const aliasDomain =
    networkAlias === null ? null : `${networkAlias}.zaneops.internal`
  const privateDomain =
    getServiceEnvValue(serviceDetails, ["ZANE_GLOBAL_PRIVATE_DOMAIN"]) ??
    globalAlias ??
    getServiceEnvValue(serviceDetails, ["ZANE_PRIVATE_DOMAIN"]) ??
    aliasDomain
  if (privateDomain === null) {
    return null
  }

  return new URL(
    "/",
    `http://${privateDomain}:${resolveServicePort(serviceDetails)}`,
  ).toString()
}

const meiliKeyPermissionsMatch = (
  keyObj: Record<string, unknown>,
  actions: string[],
  indexes: string[],
): boolean => {
  const keyActions = Array.isArray(keyObj.actions)
    ? keyObj.actions.filter((item): item is string => typeof item === "string")
    : []
  const keyIndexes = Array.isArray(keyObj.indexes)
    ? keyObj.indexes.filter((item): item is string => typeof item === "string")
    : []

  return (
    JSON.stringify(keyActions.toSorted()) ===
      JSON.stringify(actions.toSorted()) &&
    JSON.stringify(keyIndexes.toSorted()) === JSON.stringify(indexes.toSorted())
  )
}

const meiliKeyDescriptionMatches = (
  keyObj: Record<string, unknown>,
  description: string,
): boolean => keyObj.description === description

const resolveMeiliUrl = (meiliUrl: string, path: string): string => {
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
    const backendEnvVar =
      ZaneMeiliApiCredentialsProvisioner.resolveOptionalOutputEnvVar(
        backendOutput,
        "backend_output",
      )
    const frontendEnvVar =
      ZaneMeiliApiCredentialsProvisioner.resolveOptionalOutputEnvVar(
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
    const [publicMeiliUrl] = serviceUrls
    const meiliUrl = buildServicePrivateUrl(serviceDetails) ?? publicMeiliUrl
    if (meiliUrl === undefined) {
      throw new UpstreamHttpError(
        409,
        "zane_meili_url_missing",
        `Service ${input.serviceSlug} does not expose an operator-reachable URL in ${input.projectSlug}/${input.environmentName}`,
      )
    }

    const meiliMasterKey = getServiceEnvValue(serviceDetails, [
      "MEILI_MASTER_KEY",
    ])
    if (meiliMasterKey === null) {
      throw new UpstreamHttpError(
        409,
        "zane_meili_master_key_missing",
        `Service ${input.serviceSlug} does not expose a Meilisearch master key in ${input.projectSlug}/${input.environmentName}`,
      )
    }

    await ZaneMeiliApiCredentialsProvisioner.waitForMeiliHealth(
      meiliUrl,
      input.readinessPath,
    )

    const [backend, frontend] = await Promise.all([
      ZaneMeiliApiCredentialsProvisioner.reconcileOptionalMeiliKey(
        backendOutput,
        meiliUrl,
        meiliMasterKey,
      ),
      ZaneMeiliApiCredentialsProvisioner.reconcileOptionalMeiliKey(
        frontendOutput,
        meiliUrl,
        meiliMasterKey,
      ),
    ])

    const backendKey = ZaneMeiliApiCredentialsProvisioner.readProvisionedKey(
      backend,
      "backend",
    )
    const frontendKey = ZaneMeiliApiCredentialsProvisioner.readProvisionedKey(
      frontend,
      "frontend",
    )

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

  private static resolveOptionalOutputEnvVar(
    output: ProvisionMeiliKeysOutputInput | undefined,
    label: string,
  ): string {
    return output
      ? ZaneMeiliApiCredentialsProvisioner.requireOutputEnvVar(output, label)
      : ""
  }

  private static async reconcileOptionalMeiliKey(
    output: ProvisionMeiliKeysOutputInput | undefined,
    meiliUrl: string,
    masterKey: string,
  ): Promise<ReconcileMeiliKeyResult | null> {
    if (!output) {
      return null
    }

    return await ZaneMeiliApiCredentialsProvisioner.reconcileMeiliKey({
      masterKey,
      meiliUrl,
      policy: output.policy,
    })
  }

  private static readProvisionedKey(
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

  private static async reconcileMeiliKey(
    input: ReconcileMeiliKeyInput,
  ): Promise<ReconcileMeiliKeyResult> {
    const existing = await ZaneMeiliApiCredentialsProvisioner.getMeiliKeyByUid(
      input.meiliUrl,
      input.masterKey,
      input.policy.uid,
    )

    if (!existing) {
      return {
        created: true,
        keyObject:
          await ZaneMeiliApiCredentialsProvisioner.createMeiliKey(input),
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
        keyObject:
          await ZaneMeiliApiCredentialsProvisioner.replaceMeiliKey(input),
        updated: true,
      }
    }

    if (!meiliKeyDescriptionMatches(existing, input.policy.description)) {
      return {
        created: false,
        keyObject:
          await ZaneMeiliApiCredentialsProvisioner.updateMeiliKeyDescription({
            description: input.policy.description,
            masterKey: input.masterKey,
            meiliUrl: input.meiliUrl,
            uid: input.policy.uid,
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

  private static requireOutputEnvVar(
    output: ProvisionMeiliKeysOutputInput,
    label: string,
  ): string {
    if (!output.envVar.trim()) {
      throw new BadRequestError(`${label}.envVar must be provided`)
    }

    return output.envVar.trim()
  }

  private static async pollMeiliHealth(
    healthUrl: string,
    attempt: number,
  ): Promise<boolean> {
    if (attempt >= 30) {
      return false
    }

    let response: Response | null = null
    try {
      response = await fetch(healthUrl, {
        headers: {
          Accept: "application/json",
        },
        method: "GET",
      })
    } catch {
      response = null
    }

    if (response !== null && response.ok) {
      return true
    }

    await sleep(2000)
    return await ZaneMeiliApiCredentialsProvisioner.pollMeiliHealth(
      healthUrl,
      attempt + 1,
    )
  }

  private static async waitForMeiliHealth(
    meiliUrl: string,
    healthPath: string,
  ): Promise<void> {
    const healthUrl = resolveMeiliUrl(meiliUrl, healthPath)
    const healthy = await ZaneMeiliApiCredentialsProvisioner.pollMeiliHealth(
      healthUrl,
      0,
    )
    if (!healthy) {
      throw new UpstreamHttpError(
        504,
        "zane_meili_unhealthy",
        `Timed out waiting for Meilisearch health at ${healthUrl}`,
      )
    }
  }

  private static async getMeiliKeyByUid(
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

    const payload: unknown = await response.json()
    if (!isRecord(payload)) {
      throw new BadRequestError(`meili key ${uid} must be a JSON object`)
    }
    return payload
  }

  private static async createMeiliKey(
    input: ReconcileMeiliKeyInput,
  ): Promise<Record<string, unknown>> {
    return await ZaneMeiliApiCredentialsProvisioner.writeMeiliKey({
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

  private static async replaceMeiliKey(
    input: ReconcileMeiliKeyInput,
  ): Promise<Record<string, unknown>> {
    await ZaneMeiliApiCredentialsProvisioner.deleteMeiliKey(
      input.meiliUrl,
      input.masterKey,
      input.policy.uid,
    )
    return await ZaneMeiliApiCredentialsProvisioner.createMeiliKey(input)
  }

  private static async updateMeiliKeyDescription(
    input: UpdateMeiliKeyDescriptionInput,
  ): Promise<Record<string, unknown>> {
    return await ZaneMeiliApiCredentialsProvisioner.writeMeiliKey({
      masterKey: input.masterKey,
      meiliUrl: input.meiliUrl,
      method: "PATCH",
      path: `/keys/${encodeURIComponent(input.uid)}`,
      payload: {
        description: input.description,
      },
    })
  }

  private static async deleteMeiliKey(
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

  private static async writeMeiliKey(
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

    const responsePayload: unknown = await response.json()
    if (!isRecord(responsePayload)) {
      throw new BadRequestError("meili key response must be a JSON object")
    }
    return responsePayload
  }
}
