import type { Logger } from "@medusajs/framework/types"
import { MedusaError, MedusaService } from "@medusajs/framework/utils"

import packageJson from "../../../package.json"
import SymmyWebhookConfig from "./models/symmy-webhook-config"
import type { SymmyWebhookEndpoint } from "./models/symmy-webhook-config"

export type { SymmyWebhookEndpoint } from "./models/symmy-webhook-config"

const environmentValue = (key: string): string | undefined => process.env[key]

const DEFAULT_CONFIG_KEY = "default"
const WEBHOOK_TIMEOUT_MS = 10_000
const PLUGIN_VERSION =
  environmentValue("SYMMY_PLUGIN_VERSION") ?? packageJson.version

export interface SymmyWebhookConfigDTO {
  id: string
  config_key: string
  is_enabled: boolean
  endpoints: SymmyWebhookEndpoint[]
  created_at?: Date | string
  updated_at?: Date | string
}

export interface UpdateSymmyWebhookConfigInput {
  is_enabled?: boolean | undefined
  endpoints?: SymmyWebhookEndpoint[] | undefined
}

export interface SymmyWebhookJobPayload {
  event: "symmy.import_job.completed" | "symmy.import_job.failed"
  job: {
    id: string
    type: string
    status: string
    total: number
    processed: number
    failed: number
    attempts: number
    result: Record<string, unknown> | null
    error: string | null
    created_at?: Date | string | undefined
    updated_at?: Date | string | undefined
    started_at: Date | string | null
    finished_at: Date | string | null
  }
}

interface InjectedDependencies {
  logger: Logger
}

type RawSymmyWebhookConfigDTO = Omit<SymmyWebhookConfigDTO, "endpoints"> & {
  endpoints: SymmyWebhookEndpoint[]
}

const isObjectMap = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const getObjectValue = (value: Record<string, unknown>, key: string): unknown =>
  value[key]

const isDateOrString = (value: unknown): value is Date | string =>
  value instanceof Date || typeof value === "string"

const isSymmyWebhookEndpoint = (
  value: unknown,
): value is SymmyWebhookEndpoint =>
  isObjectMap(value) &&
  typeof getObjectValue(value, "url") === "string" &&
  typeof getObjectValue(value, "enabled") === "boolean"

const isRawSymmyWebhookConfigDTO = (
  value: unknown,
): value is RawSymmyWebhookConfigDTO => {
  if (!isObjectMap(value)) {
    return false
  }
  const id = getObjectValue(value, "id")
  const configKey = getObjectValue(value, "config_key")
  const isEnabled = getObjectValue(value, "is_enabled")
  const endpoints = getObjectValue(value, "endpoints")
  const createdAt = getObjectValue(value, "created_at")
  const updatedAt = getObjectValue(value, "updated_at")
  if (typeof id !== "string" || typeof configKey !== "string") {
    return false
  }
  if (typeof isEnabled !== "boolean") {
    return false
  }
  if (!Array.isArray(endpoints) || !endpoints.every(isSymmyWebhookEndpoint)) {
    return false
  }
  if (createdAt !== undefined && !isDateOrString(createdAt)) {
    return false
  }
  return updatedAt === undefined || isDateOrString(updatedAt)
}

const normalizeEndpoint = (
  endpoint: SymmyWebhookEndpoint,
): SymmyWebhookEndpoint => ({
  enabled: endpoint.enabled,
  url: endpoint.url.trim(),
})

const normalizeEndpoints = (endpoints: SymmyWebhookEndpoint[] = []) =>
  endpoints.flatMap((endpoint) => {
    const normalized = normalizeEndpoint(endpoint)
    return normalized.url.length > 0 ? [normalized] : []
  })

const toDTO = (raw: unknown): SymmyWebhookConfigDTO => {
  if (!isRawSymmyWebhookConfigDTO(raw)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "[symmy-plugin] Invalid webhook config data",
    )
  }

  return {
    ...raw,
    endpoints: normalizeEndpoints(raw.endpoints),
  }
}

export class SymmyWebhookConfigModuleService extends MedusaService({
  SymmyWebhookConfig,
}) {
  private readonly logger: Logger

  constructor(container: InjectedDependencies) {
    super(container)
    this.logger = container.logger
  }

  async getConfig(): Promise<SymmyWebhookConfigDTO> {
    const configs = await this.listSymmyWebhookConfigs(
      { config_key: DEFAULT_CONFIG_KEY },
      { take: 1 },
    )
    const [existing] = configs
    if (existing !== undefined) {
      return toDTO(existing)
    }

    const created = await this.createSymmyWebhookConfigs({
      config_key: DEFAULT_CONFIG_KEY,
      endpoints: [],
      is_enabled: false,
    })

    return toDTO(created)
  }

  async updateConfig(
    input: UpdateSymmyWebhookConfigInput,
    currentConfig?: SymmyWebhookConfigDTO,
  ): Promise<SymmyWebhookConfigDTO> {
    const existing = currentConfig ?? (await this.getConfig())
    const updated = await this.updateSymmyWebhookConfigs({
      id: existing.id,
      ...(input.is_enabled === undefined
        ? {}
        : { is_enabled: input.is_enabled }),
      ...(input.endpoints === undefined
        ? {}
        : {
            endpoints: normalizeEndpoints(input.endpoints),
          }),
    })

    return toDTO(updated)
  }

  async deliverJobFinished(payload: SymmyWebhookJobPayload): Promise<void> {
    const config = await this.getConfig()
    if (!config.is_enabled) {
      return
    }

    const endpoints = config.endpoints.filter((endpoint) => endpoint.enabled)
    if (endpoints.length === 0) {
      return
    }

    await Promise.all(
      endpoints.map(async (endpoint) => {
        try {
          const response = await fetch(endpoint.url, {
            body: JSON.stringify(payload),
            headers: {
              "content-type": "application/json",
              "user-agent": `medusa-symmy-plugin/${PLUGIN_VERSION}`,
            },
            method: "POST",
            signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
          })

          if (!response.ok) {
            this.logger.warn(
              `[symmy-plugin] Webhook ${endpoint.url} returned ${response.status} for job ${payload.job.id}`,
            )
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown webhook error"
          this.logger.warn(
            `[symmy-plugin] Failed to deliver webhook ${endpoint.url} for job ${payload.job.id}: ${message}`,
          )
        }
      }),
    )
  }
}
