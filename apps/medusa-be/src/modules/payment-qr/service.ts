import { MedusaService } from "@medusajs/framework/utils"

import QrPaymentConfig from "./models/payment-qr-config"
import type { QrPaymentConfigDTO, UpdateQrPaymentConfigInput } from "./types"

const normalizeIban = (value: string | null | undefined): string | null => {
  const normalized = value?.replaceAll(/\s+/gu, "").toUpperCase() ?? ""
  return normalized === "" ? null : normalized
}

export class QrPaymentModuleService extends MedusaService({
  QrPaymentConfig,
}) {
  async getConfig(): Promise<QrPaymentConfigDTO | null> {
    const configs = await this.listQrPaymentConfigs({}, { take: 1 })
    return configs[0] ?? null
  }

  async updateConfig(
    data: UpdateQrPaymentConfigInput,
  ): Promise<QrPaymentConfigDTO> {
    const existing = await this.getConfig()
    const update = { ...data, iban: normalizeIban(data.iban) }

    if (existing !== null) {
      return await this.updateQrPaymentConfigs({ id: existing.id, ...update })
    }

    return await this.createQrPaymentConfigs(update)
  }

  async getIban(): Promise<string | null> {
    const config = await this.getConfig()
    return normalizeIban(config?.iban)
  }
}
