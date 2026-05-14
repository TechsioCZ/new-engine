import type {
  BigNumberValue,
  InitiatePaymentInput,
} from "@medusajs/framework/types"
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import {
  PAYKIT_PAYMENT_PROVIDER_IDENTIFIER,
  requirePaykitOptions,
} from "../config"
import {
  type PaykitInjectedDependencies,
  PaykitPaymentProviderBase,
} from "../core/base"
import { createPaykitClient, getGopayProviderOptions } from "../runtime"
import type {
  PaykitGopayOptions,
  PaykitPayment,
  PaykitPaymentClient,
} from "../types"
import {
  fromSmallestCurrencyUnit,
  toSmallestCurrencyUnit,
} from "../utils/amounts"

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

    return toSmallestCurrencyUnit(normalized, currencyCode)
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

    const currencyCode = payment.currency ?? payment.currency_code ?? undefined
    const normalized = super.normalizeWebhookNumericAmount(amount, currencyCode)

    return fromSmallestCurrencyUnit(normalized, currencyCode)
  }
}

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaykitGopayPaymentProvider],
})
