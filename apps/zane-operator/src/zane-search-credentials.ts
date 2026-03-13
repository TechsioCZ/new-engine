import { BadRequestError } from "./db"
import { UpstreamHttpError } from "./zane-errors"
import type {
  ProvisionPreviewMeiliKeysInput,
  ProvisionPreviewMeiliKeysOutputInput,
} from "./zane-contract"
import { parseErrorMessage, type ZaneSession } from "./zane-upstream"

interface PreviewEnvironmentLookup {
  is_preview: boolean
  name: string
}

interface SearchProvisionServiceDetails {
  slug: string
  env_variables: Array<{
    key: string
    value: string
  }>
  urls: Array<{
    domain: string
    base_path: string
  }>
}

interface ProvisionPreviewSearchCredentialsDeps {
  authenticate(): Promise<ZaneSession>
  getEnvironment(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
  ): Promise<PreviewEnvironmentLookup | null>
  getServiceDetails(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
  ): Promise<SearchProvisionServiceDetails>
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new BadRequestError(`${label} must be a string`)
  }

  const trimmed = value.trim()
  if (!trimmed) {
    throw new BadRequestError(`${label} cannot be empty`)
  }

  return trimmed
}

function buildServicePublicUrls(serviceDetails: SearchProvisionServiceDetails): string[] {
  if (!Array.isArray(serviceDetails.urls)) {
    return []
  }

  return serviceDetails.urls
    .map((url, index) => {
      const domain = assertString(url.domain, `service.urls[${index}].domain`)
      const basePath = typeof url.base_path === "string" && url.base_path.trim() ? url.base_path.trim() : "/"
      return new URL(basePath.startsWith("/") ? basePath : `/${basePath}`, `https://${domain}`).toString()
    })
    .filter((value, index, array) => array.indexOf(value) === index)
}

function getServiceEnvValue(serviceDetails: SearchProvisionServiceDetails, keys: string[]): string | null {
  const envVariables = Array.isArray(serviceDetails.env_variables) ? serviceDetails.env_variables : []
  const envByKey = new Map(envVariables.map((envVar) => [envVar.key, envVar.value]))
  for (const key of keys) {
    const value = envByKey.get(key)
    if (typeof value === "string" && value.trim()) {
      return value
    }
  }
  return null
}

function meiliKeyMatchesPolicy(
  keyObj: Record<string, unknown>,
  uid: string,
  description: string,
  actions: string[],
  indexes: string[],
): boolean {
  const keyUid = typeof keyObj.uid === "string" ? keyObj.uid : null
  const keyDescription = typeof keyObj.description === "string" ? keyObj.description : null
  const keyActions = Array.isArray(keyObj.actions) ? keyObj.actions.filter((item): item is string => typeof item === "string") : []
  const keyIndexes = Array.isArray(keyObj.indexes) ? keyObj.indexes.filter((item): item is string => typeof item === "string") : []

  return (
    keyUid === uid &&
    keyDescription === description &&
    JSON.stringify([...keyActions].sort()) === JSON.stringify([...actions].sort()) &&
    JSON.stringify([...keyIndexes].sort()) === JSON.stringify([...indexes].sort())
  )
}

function assertPreviewEnvironment(environment: PreviewEnvironmentLookup): void {
  if (!environment.is_preview) {
    throw new UpstreamHttpError(
      409,
      "zane_environment_lane_mismatch",
      `Environment ${environment.name} is not a preview environment and cannot be used for preview lane operations`,
    )
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export class ZaneSearchCredentialsProvisioner {
  readonly #deps: ProvisionPreviewSearchCredentialsDeps

  constructor(deps: ProvisionPreviewSearchCredentialsDeps) {
    this.#deps = deps
  }

  async provisionPreviewMeiliKeys(input: ProvisionPreviewMeiliKeysInput): Promise<{
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
    const backendOutput = input.backendOutput
    const frontendOutput = input.frontendOutput
    const backendEnvVar = this.requireOutputEnvVar(backendOutput, "backend_output")
    const frontendEnvVar = this.requireOutputEnvVar(frontendOutput, "frontend_output")
    const session = await this.#deps.authenticate()
    const environment = await this.#deps.getEnvironment(session, input.projectSlug, input.environmentName)
    if (!environment) {
      throw new UpstreamHttpError(
        404,
        "zane_environment_not_found",
        `Environment ${input.environmentName} does not exist in project ${input.projectSlug}`,
      )
    }
    assertPreviewEnvironment(environment)

    const serviceDetails = await this.#deps.getServiceDetails(
      session,
      input.projectSlug,
      input.environmentName,
      input.serviceSlug,
    )
    const serviceUrls = buildServicePublicUrls(serviceDetails)
    const meiliUrl = serviceUrls[0]
    if (!meiliUrl) {
      throw new UpstreamHttpError(
        409,
        "zane_meili_url_missing",
        `Service ${input.serviceSlug} does not expose a public URL in ${input.projectSlug}/${input.environmentName}`,
      )
    }

    const meiliMasterKey = getServiceEnvValue(serviceDetails, ["MEILI_MASTER_KEY", "MEILISEARCH_API_KEY"])
    if (!meiliMasterKey) {
      throw new UpstreamHttpError(
        409,
        "zane_meili_master_key_missing",
        `Service ${input.serviceSlug} does not expose a Meilisearch master key in ${input.projectSlug}/${input.environmentName}`,
      )
    }

    await this.waitForMeiliHealth(meiliUrl, input.readinessPath)

    let backendKeyObj = await this.getMeiliKeyByUid(meiliUrl, meiliMasterKey, backendOutput.policy.uid)
    let backendCreated = false
    let backendUpdated = false
    if (!backendKeyObj) {
      backendKeyObj = await this.createMeiliKey(
        meiliUrl,
        meiliMasterKey,
        backendOutput.policy.uid,
        backendOutput.policy.description,
        backendOutput.policy.actions,
        backendOutput.policy.indexes,
      )
      backendCreated = true
    } else if (
      !meiliKeyMatchesPolicy(
        backendKeyObj,
        backendOutput.policy.uid,
        backendOutput.policy.description,
        backendOutput.policy.actions,
        backendOutput.policy.indexes,
      )
    ) {
      backendKeyObj = await this.updateMeiliKey(
        meiliUrl,
        meiliMasterKey,
        backendOutput.policy.uid,
        backendOutput.policy.description,
        backendOutput.policy.actions,
        backendOutput.policy.indexes,
      )
      backendUpdated = true
    }

    let frontendKeyObj = await this.getMeiliKeyByUid(meiliUrl, meiliMasterKey, frontendOutput.policy.uid)
    let frontendCreated = false
    let frontendUpdated = false
    if (!frontendKeyObj) {
      frontendKeyObj = await this.createMeiliKey(
        meiliUrl,
        meiliMasterKey,
        frontendOutput.policy.uid,
        frontendOutput.policy.description,
        frontendOutput.policy.actions,
        frontendOutput.policy.indexes,
      )
      frontendCreated = true
    } else if (
      !meiliKeyMatchesPolicy(
        frontendKeyObj,
        frontendOutput.policy.uid,
        frontendOutput.policy.description,
        frontendOutput.policy.actions,
        frontendOutput.policy.indexes,
      )
    ) {
      frontendKeyObj = await this.updateMeiliKey(
        meiliUrl,
        meiliMasterKey,
        frontendOutput.policy.uid,
        frontendOutput.policy.description,
        frontendOutput.policy.actions,
        frontendOutput.policy.indexes,
      )
      frontendUpdated = true
    }

    const backendKey = typeof backendKeyObj.key === "string" ? backendKeyObj.key : ""
    const frontendKey = typeof frontendKeyObj.key === "string" ? frontendKeyObj.key : ""
    if (!backendKey || !frontendKey) {
      throw new UpstreamHttpError(502, "zane_meili_key_missing", "Provisioned Meilisearch keys were missing key values")
    }

    return {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      service_slug: input.serviceSlug,
      meili_url: meiliUrl,
      backend_key: backendKey,
      backend_env_var: backendEnvVar,
      backend_created: backendCreated,
      backend_updated: backendUpdated,
      frontend_key: frontendKey,
      frontend_env_var: frontendEnvVar,
      frontend_created: frontendCreated,
      frontend_updated: frontendUpdated,
    }
  }

  private requireOutputEnvVar(
    output: ProvisionPreviewMeiliKeysOutputInput,
    label: string
  ): string {
    if (!output.envVar.trim()) {
      throw new BadRequestError(`${label}.envVar must be provided`)
    }

    return output.envVar.trim()
  }

  private async waitForMeiliHealth(meiliUrl: string, healthPath: string): Promise<void> {
    const normalizedHealthPath = healthPath.startsWith("/") ? healthPath : `/${healthPath}`
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await fetch(`${meiliUrl.replace(/\/+$/, "")}${normalizedHealthPath}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }).catch(() => null)

      if (response?.ok) {
        return
      }

      await sleep(2_000)
    }

    throw new UpstreamHttpError(
      504,
      "zane_meili_unhealthy",
      `Timed out waiting for Meilisearch health at ${meiliUrl}${normalizedHealthPath}`,
    )
  }

  private async getMeiliKeyByUid(
    meiliUrl: string,
    masterKey: string,
    uid: string,
  ): Promise<Record<string, unknown> | null> {
    const response = await fetch(`${meiliUrl.replace(/\/+$/, "")}/keys/${encodeURIComponent(uid)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${masterKey}`,
      },
    })

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
      throw new UpstreamHttpError(response.status, "zane_meili_key_lookup_failed", errorMessage)
    }

    const payload = await response.json()
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new BadRequestError(`meili key ${uid} must be a JSON object`)
    }
    return payload as Record<string, unknown>
  }

  private async createMeiliKey(
    meiliUrl: string,
    masterKey: string,
    uid: string,
    description: string,
    actions: string[],
    indexes: string[],
  ): Promise<Record<string, unknown>> {
    return await this.writeMeiliKey(meiliUrl, masterKey, "POST", "/keys", {
      uid,
      description,
      actions,
      indexes,
      expiresAt: null,
    })
  }

  private async updateMeiliKey(
    meiliUrl: string,
    masterKey: string,
    uid: string,
    description: string,
    actions: string[],
    indexes: string[],
  ): Promise<Record<string, unknown>> {
    return await this.writeMeiliKey(meiliUrl, masterKey, "PATCH", `/keys/${encodeURIComponent(uid)}`, {
      description,
      actions,
      indexes,
      expiresAt: null,
    })
  }

  private async writeMeiliKey(
    meiliUrl: string,
    masterKey: string,
    method: "POST" | "PATCH",
    path: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${meiliUrl.replace(/\/+$/, "")}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${masterKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      let errorMessage = `Meilisearch key ${method === "POST" ? "create" : "update"} failed (HTTP ${response.status})`
      try {
        errorMessage = parseErrorMessage(await response.json(), errorMessage)
      } catch {
        // keep fallback
      }
      throw new UpstreamHttpError(response.status, "zane_meili_key_write_failed", errorMessage)
    }

    const responsePayload = await response.json()
    if (!responsePayload || typeof responsePayload !== "object" || Array.isArray(responsePayload)) {
      throw new BadRequestError("meili key response must be a JSON object")
    }
    return responsePayload as Record<string, unknown>
  }
}
