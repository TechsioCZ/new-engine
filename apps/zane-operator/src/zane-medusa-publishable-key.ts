import { BadRequestError } from "./db"
import type {
  ProvisionMedusaPublishableKeyInput,
  ProvisionMedusaPublishableKeyOutputInput,
} from "./zane-contract"
import { buildServicePublicUrls } from "./zane-effective-service-urls"
import { UpstreamHttpError } from "./zane-errors"
import { parseErrorMessage, type ZaneSession } from "./zane-upstream"

type ProvisionEnvironmentLookup = {
  is_preview: boolean
  name: string
}

type MedusaProvisionServiceDetails = {
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

type ProvisionMedusaPublishableKeyDeps = {
  authenticate(): Promise<ZaneSession>
  getEnvironment(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string
  ): Promise<ProvisionEnvironmentLookup | null>
  getServiceDetails(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string
  ): Promise<MedusaProvisionServiceDetails>
}

function resolveTemplateEnvValue(
  serviceDetails: MedusaProvisionServiceDetails,
  value: string
): string {
  const match = /^\{\{\s*env\.([A-Z0-9_]+)\s*\}\}$/.exec(value.trim())
  if (!match) {
    return value
  }

  const environmentVariables = Array.isArray(
    serviceDetails.environment?.variables
  )
    ? serviceDetails.environment.variables
    : []
  const resolved = environmentVariables.find(
    (envVar) => envVar.key === match[1]
  )?.value
  return typeof resolved === "string" && resolved.trim() ? resolved : value
}

function getServiceEnvValue(
  serviceDetails: MedusaProvisionServiceDetails,
  keys: string[]
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
    ])
  )

  for (const key of keys) {
    const value = envByKey.get(key)
    if (typeof value === "string" && value.trim()) {
      return value
    }
  }

  return null
}

function parsePort(value: string | null): number | null {
  if (!value?.trim()) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function resolveServicePort(
  serviceDetails: MedusaProvisionServiceDetails
): number {
  const envPort = parsePort(getServiceEnvValue(serviceDetails, ["PORT"]))
  if (envPort !== null) {
    return envPort
  }

  const urlPort = serviceDetails.urls.find(
    (url) => typeof url.associated_port === "number"
  )?.associated_port
  if (typeof urlPort === "number" && urlPort > 0) {
    return urlPort
  }

  return 9000
}

function buildServicePrivateUrl(
  serviceDetails: MedusaProvisionServiceDetails
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
    `http://${privateDomain}:${resolveServicePort(serviceDetails)}`
  ).toString()
}

function resolveMedusaUrl(baseUrl: string, path: string): string {
  const serviceUrl = new URL(baseUrl)
  const normalizedBasePath = serviceUrl.pathname.replace(/\/+$/, "")
  serviceUrl.pathname = normalizedBasePath ? `${normalizedBasePath}/` : "/"
  return new URL(path.replace(/^\/+/, ""), serviceUrl).toString()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

type AuthResponse = {
  token: string
}

type PublishableKeyResponse = {
  api_key: {
    token: string
  }
  created: boolean
}

export class ZaneMedusaPublishableKeyProvisioner {
  readonly #deps: ProvisionMedusaPublishableKeyDeps

  constructor(deps: ProvisionMedusaPublishableKeyDeps) {
    this.#deps = deps
  }

  async provisionPublishableKey(
    input: ProvisionMedusaPublishableKeyInput
  ): Promise<{
    project_slug: string
    environment_name: string
    service_slug: string
    medusa_url: string
    frontend_key: string
    frontend_env_var: string
    frontend_created: boolean
    frontend_updated: boolean
  }> {
    const frontendEnvVar = this.requireOutputEnvVar(
      input.frontendOutput,
      "frontend_output"
    )
    const session = await this.#deps.authenticate()
    const environment = await this.#deps.getEnvironment(
      session,
      input.projectSlug,
      input.environmentName
    )
    if (!environment) {
      throw new UpstreamHttpError(
        404,
        "zane_environment_not_found",
        `Environment ${input.environmentName} does not exist in project ${input.projectSlug}`
      )
    }

    const serviceDetails = await this.#deps.getServiceDetails(
      session,
      input.projectSlug,
      input.environmentName,
      input.serviceSlug
    )
    const serviceUrls = buildServicePublicUrls(serviceDetails)
    const publicMedusaUrl = serviceUrls[0]
    const medusaUrl = buildServicePrivateUrl(serviceDetails) ?? publicMedusaUrl
    if (!medusaUrl) {
      throw new UpstreamHttpError(
        409,
        "zane_medusa_url_missing",
        `Service ${input.serviceSlug} does not expose an operator-reachable URL in ${input.projectSlug}/${input.environmentName}`
      )
    }

    const adminEmail = getServiceEnvValue(serviceDetails, ["SUPERADMIN_EMAIL"])
    const adminPassword = getServiceEnvValue(serviceDetails, [
      "SUPERADMIN_PASSWORD",
    ])
    if (!(adminEmail && adminPassword)) {
      throw new UpstreamHttpError(
        409,
        "zane_medusa_admin_credentials_missing",
        `Service ${input.serviceSlug} does not expose SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in ${input.projectSlug}/${input.environmentName}`
      )
    }

    await this.waitForServiceHealth(medusaUrl, input.readinessPath)
    const auth = await this.authenticateMedusaAdmin(
      medusaUrl,
      adminEmail,
      adminPassword
    )
    const title = input.frontendOutput.policy.title?.trim() || undefined
    const result = await this.requestPublishableKey(medusaUrl, auth.token, title)

    return {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      service_slug: input.serviceSlug,
      medusa_url: medusaUrl,
      frontend_key: result.api_key.token,
      frontend_env_var: frontendEnvVar,
      frontend_created: result.created,
      frontend_updated: false,
    }
  }

  private requireOutputEnvVar(
    output: ProvisionMedusaPublishableKeyOutputInput,
    label: string
  ): string {
    if (!output.envVar.trim()) {
      throw new BadRequestError(`${label}.envVar must be provided`)
    }

    return output.envVar.trim()
  }

  private async waitForServiceHealth(
    medusaUrl: string,
    healthPath: string
  ): Promise<void> {
    const healthUrl = resolveMedusaUrl(medusaUrl, healthPath)
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await fetch(healthUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }).catch(() => null)

      if (response?.ok) {
        return
      }

      await sleep(2000)
    }

    throw new UpstreamHttpError(
      504,
      "zane_medusa_unhealthy",
      `Timed out waiting for Medusa health at ${healthUrl}`
    )
  }

  private async authenticateMedusaAdmin(
    medusaUrl: string,
    email: string,
    password: string
  ): Promise<AuthResponse> {
    const response = await fetch(resolveMedusaUrl(medusaUrl, "/auth/user/emailpass"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      let errorMessage = `Medusa admin auth failed (HTTP ${response.status})`
      try {
        errorMessage = parseErrorMessage(await response.json(), errorMessage)
      } catch {
        // keep fallback
      }
      throw new UpstreamHttpError(
        response.status,
        "zane_medusa_admin_auth_failed",
        errorMessage
      )
    }

    const payload = await response.json()
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new BadRequestError("medusa admin auth response must be a JSON object")
    }

    const payloadObject = payload as Record<string, unknown>
    const token = payloadObject.token
    if (typeof token !== "string" || !token.trim()) {
      throw new BadRequestError("medusa admin auth response missing token")
    }

    return { token: token.trim() }
  }

  private async requestPublishableKey(
    medusaUrl: string,
    token: string,
    title: string | undefined
  ): Promise<PublishableKeyResponse> {
    const response = await fetch(
      resolveMedusaUrl(medusaUrl, "/admin/provisioning/publishable-key"),
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(title ? { title } : {}),
      }
    )

    if (!response.ok) {
      let errorMessage = `Medusa publishable key provisioning failed (HTTP ${response.status})`
      try {
        errorMessage = parseErrorMessage(await response.json(), errorMessage)
      } catch {
        // keep fallback
      }
      throw new UpstreamHttpError(
        response.status,
        "zane_medusa_publishable_key_failed",
        errorMessage
      )
    }

    const payload = await response.json()
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new BadRequestError(
        "medusa publishable key response must be a JSON object"
      )
    }

    const payloadObject = payload as Record<string, unknown>
    const apiKey = payloadObject.api_key
    if (!apiKey || typeof apiKey !== "object" || Array.isArray(apiKey)) {
      throw new BadRequestError(
        "medusa publishable key response missing api_key object"
      )
    }

    const apiKeyObject = apiKey as Record<string, unknown>
    const tokenValue = apiKeyObject.token
    if (typeof tokenValue !== "string" || !tokenValue.trim()) {
      throw new BadRequestError(
        "medusa publishable key response missing api_key.token"
      )
    }

    return {
      api_key: {
        token: tokenValue.trim(),
      },
      created: payloadObject.created === true,
    }
  }
}
