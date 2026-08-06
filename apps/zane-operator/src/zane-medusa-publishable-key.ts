import { sleep } from "@techsio/std/async"
import { isRecord } from "@techsio/std/object"

import { BadRequestError } from "./db"
import type {
  ProvisionMedusaPublishableKeyInput,
  ProvisionMedusaPublishableKeyOutputInput,
} from "./zane-contract"
import { buildServicePublicUrls } from "./zane-effective-service-urls"
import { UpstreamHttpError } from "./zane-errors"
import { parseErrorMessage } from "./zane-upstream"
import type { ZaneSession } from "./zane-upstream"

const TEMPLATE_ENV_PATTERN = /^\{\{\s*env\.(?<envName>[A-Z0-9_]+)\s*\}\}$/u
const TRAILING_SLASHES_PATTERN = /\/+$/u
const LEADING_SLASHES_PATTERN = /^\/+/u

interface ProvisionEnvironmentLookup {
  is_preview: boolean
  name: string
}

interface MedusaProvisionServiceDetails {
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

interface ProvisionMedusaPublishableKeyDeps {
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
  ) => Promise<MedusaProvisionServiceDetails>
}

const resolveTemplateEnvValue = (
  serviceDetails: MedusaProvisionServiceDetails,
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
  serviceDetails: MedusaProvisionServiceDetails,
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

const parsePort = (value: string | null): number | null => {
  if (value === null) {
    return null
  }

  const trimmed = value.trim()
  if (trimmed === "") {
    return null
  }

  const parsed = Math.trunc(Number(trimmed))
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const resolveServicePort = (
  serviceDetails: MedusaProvisionServiceDetails,
): number => {
  const envPort = parsePort(getServiceEnvValue(serviceDetails, ["PORT"]))
  if (envPort !== null) {
    return envPort
  }

  const urlPort = serviceDetails.urls.find(
    (url) => typeof url.associated_port === "number",
  )?.associated_port
  if (typeof urlPort === "number" && urlPort > 0) {
    return urlPort
  }

  return 9000
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
  serviceDetails: MedusaProvisionServiceDetails,
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

const resolveMedusaUrl = (baseUrl: string, path: string): string => {
  const serviceUrl = new URL(baseUrl)
  const normalizedBasePath = serviceUrl.pathname.replace(
    TRAILING_SLASHES_PATTERN,
    "",
  )
  serviceUrl.pathname = normalizedBasePath ? `${normalizedBasePath}/` : "/"
  return new URL(
    path.replace(LEADING_SLASHES_PATTERN, ""),
    serviceUrl,
  ).toString()
}

interface AuthResponse {
  token: string
}

interface PublishableKeyResponse {
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
    input: ProvisionMedusaPublishableKeyInput,
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
    const frontendEnvVar =
      ZaneMedusaPublishableKeyProvisioner.requireOutputEnvVar(
        input.frontendOutput,
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
    const [publicMedusaUrl] = serviceUrls
    const medusaUrl = buildServicePrivateUrl(serviceDetails) ?? publicMedusaUrl
    if (medusaUrl === undefined) {
      throw new UpstreamHttpError(
        409,
        "zane_medusa_url_missing",
        `Service ${input.serviceSlug} does not expose an operator-reachable URL in ${input.projectSlug}/${input.environmentName}`,
      )
    }

    const adminEmail = getServiceEnvValue(serviceDetails, ["SUPERADMIN_EMAIL"])
    const adminPassword = getServiceEnvValue(serviceDetails, [
      "SUPERADMIN_PASSWORD",
    ])
    if (adminEmail === null || adminPassword === null) {
      throw new UpstreamHttpError(
        409,
        "zane_medusa_admin_credentials_missing",
        `Service ${input.serviceSlug} does not expose SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in ${input.projectSlug}/${input.environmentName}`,
      )
    }

    await ZaneMedusaPublishableKeyProvisioner.waitForServiceHealth(
      medusaUrl,
      input.readinessPath,
    )
    const auth =
      await ZaneMedusaPublishableKeyProvisioner.authenticateMedusaAdmin(
        medusaUrl,
        adminEmail,
        adminPassword,
      )
    const trimmedTitle = input.frontendOutput.policy.title?.trim()
    const title =
      trimmedTitle === undefined || trimmedTitle === ""
        ? undefined
        : trimmedTitle
    const result =
      await ZaneMedusaPublishableKeyProvisioner.requestPublishableKey(
        medusaUrl,
        auth.token,
        title,
      )

    return {
      environment_name: input.environmentName,
      frontend_created: result.created,
      frontend_env_var: frontendEnvVar,
      frontend_key: result.api_key.token,
      frontend_updated: false,
      medusa_url: medusaUrl,
      project_slug: input.projectSlug,
      service_slug: input.serviceSlug,
    }
  }

  private static requireOutputEnvVar(
    output: ProvisionMedusaPublishableKeyOutputInput,
    label: string,
  ): string {
    if (!output.envVar.trim()) {
      throw new BadRequestError(`${label}.envVar must be provided`)
    }

    return output.envVar.trim()
  }

  private static async pollMedusaHealth(
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
    return await ZaneMedusaPublishableKeyProvisioner.pollMedusaHealth(
      healthUrl,
      attempt + 1,
    )
  }

  private static async waitForServiceHealth(
    medusaUrl: string,
    healthPath: string,
  ): Promise<void> {
    const healthUrl = resolveMedusaUrl(medusaUrl, healthPath)
    const healthy = await ZaneMedusaPublishableKeyProvisioner.pollMedusaHealth(
      healthUrl,
      0,
    )
    if (!healthy) {
      throw new UpstreamHttpError(
        504,
        "zane_medusa_unhealthy",
        `Timed out waiting for Medusa health at ${healthUrl}`,
      )
    }
  }

  private static async authenticateMedusaAdmin(
    medusaUrl: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    const response = await fetch(
      resolveMedusaUrl(medusaUrl, "/auth/user/emailpass"),
      {
        body: JSON.stringify({ email, password }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    )

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
        errorMessage,
      )
    }

    const payload: unknown = await response.json()
    if (!isRecord(payload)) {
      throw new BadRequestError(
        "medusa admin auth response must be a JSON object",
      )
    }

    const { token } = payload
    if (typeof token !== "string" || !token.trim()) {
      throw new BadRequestError("medusa admin auth response missing token")
    }

    return { token: token.trim() }
  }

  private static async requestPublishableKey(
    medusaUrl: string,
    token: string,
    title: string | undefined,
  ): Promise<PublishableKeyResponse> {
    const response = await fetch(
      resolveMedusaUrl(medusaUrl, "/admin/provisioning/publishable-key"),
      {
        body: JSON.stringify(title === undefined ? {} : { title }),
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      },
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
        errorMessage,
      )
    }

    const payload: unknown = await response.json()
    if (!isRecord(payload)) {
      throw new BadRequestError(
        "medusa publishable key response must be a JSON object",
      )
    }

    const apiKey = payload["api_key"]
    if (!isRecord(apiKey)) {
      throw new BadRequestError(
        "medusa publishable key response missing api_key object",
      )
    }

    const tokenValue = apiKey["token"]
    if (typeof tokenValue !== "string" || !tokenValue.trim()) {
      throw new BadRequestError(
        "medusa publishable key response missing api_key.token",
      )
    }

    return {
      api_key: {
        token: tokenValue.trim(),
      },
      created: payload["created"] === true,
    }
  }
}
