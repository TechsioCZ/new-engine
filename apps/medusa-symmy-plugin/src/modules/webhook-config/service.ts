import type { Logger } from "@medusajs/framework/types"
import { MedusaService } from "@medusajs/framework/utils"
import SymmyWebhookConfig from "./models/symmy-webhook-config"

const DEFAULT_CONFIG_KEY = "default"
const WEBHOOK_TIMEOUT_MS = 10_000

export type SymmyWebhookEndpoint = {
  url: string
  enabled: boolean
}

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
  event: "symmy.import_job.completed"
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

const normalizeEndpoint = (
  endpoint: SymmyWebhookEndpoint
): SymmyWebhookEndpoint => ({
  url: endpoint.url.trim(),
  enabled: endpoint.enabled,
})

const normalizeEndpoints = (endpoints: SymmyWebhookEndpoint[] = []) =>
  endpoints
    .map(normalizeEndpoint)
    .filter((endpoint) => endpoint.url.length > 0)

export class SymmyWebhookConfigModuleService extends MedusaService({
  SymmyWebhookConfig,
}) {
  private readonly logger_: Logger

  constructor(container: InjectedDependencies) {
    super(container)
    this.logger_ = container.logger
  }

  private toDTO(raw: unknown): SymmyWebhookConfigDTO {
    const config = raw as Omit<SymmyWebhookConfigDTO, "endpoints"> & {
      endpoints?: unknown
    }
    const endpoints = Array.isArray(config.endpoints)
      ? normalizeEndpoints(config.endpoints as SymmyWebhookEndpoint[])
      : []

    return {
      ...config,
      endpoints,
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
      endpoints: [] as unknown as Record<string, unknown>,
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
            endpoints: normalizeEndpoints(
              input.endpoints
            ) as unknown as Record<string, unknown>,
          }
        : {}),
    })

    return this.toDTO(updated)
  }

  async deliverJobCompleted(payload: SymmyWebhookJobPayload): Promise<void> {
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
              "user-agent": "medusa-symmy-plugin/0.1.0",
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
