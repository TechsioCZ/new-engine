import type { Logger } from "@medusajs/framework/types"
import { MedusaService } from "@medusajs/framework/utils"
import packageJson from "../../../package.json"
import SymmyWebhookConfig, {
  type SymmyWebhookEndpoint,
} from "./models/symmy-webhook-config"

export type { SymmyWebhookEndpoint } from "./models/symmy-webhook-config"

const DEFAULT_CONFIG_KEY = "default"
const WEBHOOK_TIMEOUT_MS = 10_000
const PLUGIN_VERSION = process.env.SYMMY_PLUGIN_VERSION ?? packageJson.version

export type SymmyWebhookConfigDTO = {
  id: string
  config_key: string
  is_enabled: boolean
  endpoints: SymmyWebhookEndpoint[]
  created_at?: Date | string
  updated_at?: Date | string
}

export type UpdateSymmyWebhookConfigInput = {
  is_enabled?: boolean
  endpoints?: SymmyWebhookEndpoint[]
}

export type SymmyWebhookJobPayload = {
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
    created_at?: Date | string
    updated_at?: Date | string
    started_at: Date | string | null
    finished_at: Date | string | null
  }
}

type InjectedDependencies = {
  logger: Logger
}

type RawSymmyWebhookConfigDTO = Omit<SymmyWebhookConfigDTO, "endpoints"> & {
  endpoints: SymmyWebhookEndpoint[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isDateOrString = (value: unknown): value is Date | string =>
  value instanceof Date || typeof value === "string"

const isSymmyWebhookEndpoint = (
  value: unknown
): value is SymmyWebhookEndpoint =>
  isRecord(value) &&
  typeof value.url === "string" &&
  typeof value.enabled === "boolean"

const isRawSymmyWebhookConfigDTO = (
  value: unknown
): value is RawSymmyWebhookConfigDTO =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.config_key === "string" &&
  typeof value.is_enabled === "boolean" &&
  Array.isArray(value.endpoints) &&
  value.endpoints.every(isSymmyWebhookEndpoint) &&
  (value.created_at === undefined || isDateOrString(value.created_at)) &&
  (value.updated_at === undefined || isDateOrString(value.updated_at))

const normalizeEndpoint = (
  endpoint: SymmyWebhookEndpoint
): SymmyWebhookEndpoint => ({
  url: endpoint.url.trim(),
  enabled: endpoint.enabled,
})

const normalizeEndpoints = (endpoints: SymmyWebhookEndpoint[] = []) =>
  endpoints.map(normalizeEndpoint).filter((endpoint) => endpoint.url.length > 0)

export class SymmyWebhookConfigModuleService extends MedusaService({
  SymmyWebhookConfig,
}) {
  private readonly logger_: Logger

  constructor(container: InjectedDependencies) {
    super(container)
    this.logger_ = container.logger
  }

  private toDTO(raw: unknown): SymmyWebhookConfigDTO {
    if (!isRawSymmyWebhookConfigDTO(raw)) {
      throw new Error("[symmy-plugin] Invalid webhook config data")
    }

    return {
      ...raw,
      endpoints: normalizeEndpoints(raw.endpoints),
    }
  }

  async getConfig(): Promise<SymmyWebhookConfigDTO> {
    const configs = await this.listSymmyWebhookConfigs(
      { config_key: DEFAULT_CONFIG_KEY },
      { take: 1 }
    )
    const existing = configs[0]
    if (existing) {
      return this.toDTO(existing)
    }

    const created = await this.createSymmyWebhookConfigs({
      config_key: DEFAULT_CONFIG_KEY,
      is_enabled: false,
      endpoints: [],
    })

    return this.toDTO(created)
  }

  async updateConfig(
    input: UpdateSymmyWebhookConfigInput
  ): Promise<SymmyWebhookConfigDTO> {
    const existing = await this.getConfig()
    const updated = await this.updateSymmyWebhookConfigs({
      id: existing.id,
      ...(input.is_enabled !== undefined
        ? { is_enabled: input.is_enabled }
        : {}),
      ...(input.endpoints !== undefined
        ? {
            endpoints: normalizeEndpoints(input.endpoints),
          }
        : {}),
    })

    return this.toDTO(updated)
  }

  async deliverJobFinished(payload: SymmyWebhookJobPayload): Promise<void> {
    const config = await this.getConfig()
    if (!config.is_enabled) {
      return
    }

    const endpoints = config.endpoints.filter((endpoint) => endpoint.enabled)
    if (!endpoints.length) {
      return
    }

    await Promise.all(
      endpoints.map(async (endpoint) => {
        try {
          const response = await fetch(endpoint.url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "user-agent": `medusa-symmy-plugin/${PLUGIN_VERSION}`,
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
          })

          if (!response.ok) {
            this.logger_.warn(
              `[symmy-plugin] Webhook ${endpoint.url} returned ${response.status} for job ${payload.job.id}`
            )
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown webhook error"
          this.logger_.warn(
            `[symmy-plugin] Failed to deliver webhook ${endpoint.url} for job ${payload.job.id}: ${message}`
          )
        }
      })
    )
  }
}
