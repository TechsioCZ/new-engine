import { MedusaService } from "@medusajs/framework/utils"
import QrPaymentConfig from "./models/qr-payment-config"
import type { QrPaymentConfigDTO, UpdateQrPaymentConfigInput } from "./types"

type QrPaymentModuleOptions = {
  environment: string
}

export class QrPaymentModuleService extends MedusaService({
  QrPaymentConfig,
}) {
  protected readonly environment_: string

  constructor(container: unknown, options: QrPaymentModuleOptions) {
    super(container, options)
    this.environment_ = options.environment
  }

  async getConfig(): Promise<QrPaymentConfigDTO | null> {
    const configs = await this.listQrPaymentConfigs(
      { environment: this.environment_ },
      { take: 1 }
    )

    return (configs[0] as QrPaymentConfigDTO | undefined) ?? null
  }

  async updateConfig(
    data: UpdateQrPaymentConfigInput
  ): Promise<QrPaymentConfigDTO> {
    const existing = await this.getConfig()
    const update = {
      ...data,
      iban: normalizeIban(data.iban),
    }

    if (existing) {
      return this.updateQrPaymentConfigs({
        id: existing.id,
        ...update,
      }) as Promise<QrPaymentConfigDTO>
    }

    return this.createQrPaymentConfigs({
      ...update,
      environment: this.environment_,
    }) as Promise<QrPaymentConfigDTO>
  }

  async getIban(): Promise<string | null> {
    const config = await this.getConfig()

    return normalizeIban(config?.iban)
  }
}

function normalizeIban(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, "").toUpperCase() ?? ""

  return normalized || null
}
