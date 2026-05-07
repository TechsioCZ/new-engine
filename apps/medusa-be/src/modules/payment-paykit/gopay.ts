import type { InitiatePaymentInput } from "@medusajs/framework/types"
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import {
  type PaykitInjectedDependencies,
  PaykitPaymentProviderBase,
} from "./base"
import { PAYKIT_PAYMENT_PROVIDER_IDENTIFIER } from "./config"
import { createPaykitClient, getGopayProviderOptions } from "./runtime"
import type { PaykitGopayOptions, PaykitPaymentClient } from "./types"

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
])

export class PaykitGopayPaymentProvider extends PaykitPaymentProviderBase<PaykitGopayOptions> {
  static override identifier = PAYKIT_PAYMENT_PROVIDER_IDENTIFIER

  // Medusa's provider loader instantiates provider classes directly.
  // biome-ignore lint/complexity/noUselessConstructor: the base constructor is protected; this keeps the provider constructor public.
  constructor(
    container: PaykitInjectedDependencies,
    options: PaykitGopayOptions
  ) {
    super(container, options)
  }

  static override validateOptions(options: PaykitGopayOptions = {}): void {
    if (options.client || options.clientFactory) {
      return
    }

    const missing = [
      ["clientId", options.clientId],
      ["clientSecret", options.clientSecret],
      ["goId", options.goId],
      ["webhookUrl", options.webhookUrl],
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key)

    if (missing.length) {
      throw new Error(
        `PayKit GoPay missing required option(s): ${missing.join(", ")}`
      )
    }
  }

  protected async createDefaultClient(): Promise<PaykitPaymentClient> {
    return await createPaykitClient(
      "@paykit-sdk/gopay",
      "createGopay",
      getGopayProviderOptions(this.options_)
    )
  }

  protected override normalizeAmount(
    amount: InitiatePaymentInput["amount"],
    currencyCode?: string
  ): number {
    const normalized = super.normalizeAmount(amount, currencyCode)
    const multiplier = ZERO_DECIMAL_CURRENCIES.has(
      currencyCode?.toLowerCase() ?? ""
    )
      ? 1
      : 100

    return Math.round(normalized * multiplier)
  }
}

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaykitGopayPaymentProvider],
})
