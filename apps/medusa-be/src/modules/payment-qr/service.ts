import { MedusaService } from "@medusajs/framework/utils"
import QrPaymentConfig from "./models/payment-qr-config"
import type { QrPaymentConfigDTO, UpdateQrPaymentConfigInput } from "./types"

export class QrPaymentModuleService extends MedusaService({
  QrPaymentConfig,
}) {
  async getConfig(): Promise<QrPaymentConfigDTO | null> {
    const configs = await this.listQrPaymentConfigs({}, { take: 1 })

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

    return this.createQrPaymentConfigs(update) as Promise<QrPaymentConfigDTO>
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
