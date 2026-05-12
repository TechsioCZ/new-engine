import type {
  BigNumberValue,
  InitiatePaymentInput,
} from "@medusajs/framework/types"
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import {
  type PaykitInjectedDependencies,
  PaykitPaymentProviderBase,
} from "./base"
import {
  PAYKIT_PAYMENT_PROVIDER_IDENTIFIER,
  requirePaykitOptions,
} from "./config"
import { createPaykitClient, getGopayProviderOptions } from "./runtime"
import type {
  PaykitGopayOptions,
  PaykitPayment,
  PaykitPaymentClient,
} from "./types"

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

    requirePaykitOptions("PayKit GoPay", options, [
      "clientId",
      "clientSecret",
      "goId",
      "webhookUrl",
    ])
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

    return Math.round(normalized * this.getCurrencyMultiplier(currencyCode))
  }

  protected override normalizePaymentDataAmount(
    amount: InitiatePaymentInput["amount"],
    currencyCode?: string
  ): number {
    return super.normalizeAmount(amount, currencyCode)
  }

  protected override normalizeWebhookAmount(
    amount: BigNumberValue | undefined,
    payment: PaykitPayment
  ): BigNumberValue | undefined {
    if (amount === undefined) {
      return amount
    }

    const normalized = super.normalizeAmount(
      amount as InitiatePaymentInput["amount"],
      payment.currency ?? payment.currency_code
    )

    return (
      normalized /
      this.getCurrencyMultiplier(payment.currency ?? payment.currency_code)
    )
  }

  private getCurrencyMultiplier(currencyCode?: string): number {
    return ZERO_DECIMAL_CURRENCIES.has(currencyCode?.toLowerCase() ?? "")
      ? 1
      : 100
  }
}

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaykitGopayPaymentProvider],
})
