import type {
  BigNumberValue,
  InitiatePaymentInput,
} from "@medusajs/framework/types"
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import {
  fromStripeSmallestCurrencyUnit,
  toStripeSmallestCurrencyUnit,
} from "./amounts"
import {
  type PaykitInjectedDependencies,
  PaykitPaymentProviderBase,
} from "./base"
import {
  PAYKIT_PAYMENT_PROVIDER_IDENTIFIER,
  requirePaykitOptions,
} from "./config"
import { createPaykitClient, getStripeProviderOptions } from "./runtime"
import type {
  PaykitPayment,
  PaykitPaymentClient,
  PaykitStripeOptions,
} from "./types"

export class PaykitStripePaymentProvider extends PaykitPaymentProviderBase<PaykitStripeOptions> {
  static override identifier = PAYKIT_PAYMENT_PROVIDER_IDENTIFIER

  // Medusa's provider loader instantiates provider classes directly.
  // biome-ignore lint/complexity/noUselessConstructor: the base constructor is protected; this keeps the provider constructor public.
  constructor(
    container: PaykitInjectedDependencies,
    options: PaykitStripeOptions
  ) {
    super(container, options)
  }

  static override validateOptions(options: PaykitStripeOptions = {}): void {
    if (options.client || options.clientFactory) {
      return
    }

    requirePaykitOptions("PayKit Stripe", options, ["apiKey", "webhookSecret"])
  }

  protected async createDefaultClient(): Promise<PaykitPaymentClient> {
    return await createPaykitClient(
      "@paykit-sdk/stripe",
      "createStripe",
      getStripeProviderOptions(this.options_)
    )
  }

  protected override normalizeAmount(
    amount: InitiatePaymentInput["amount"],
    currencyCode?: string
  ): number {
    const normalized = super.normalizeAmount(amount, currencyCode)

    return toStripeSmallestCurrencyUnit(normalized, currencyCode)
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

    return fromStripeSmallestCurrencyUnit(
      normalized,
      payment.currency ?? payment.currency_code
    )
  }
}

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaykitStripePaymentProvider],
})
