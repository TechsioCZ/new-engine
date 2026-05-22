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

const getStringValue = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value
    }
  }

  return
}

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

  protected override getCreateProviderMetadata(
    input: InitiatePaymentInput,
    data: Record<string, unknown>
  ): Record<string, unknown> {
    const providerMetadata = super.getCreateProviderMetadata(input, data)
    const successUrl = getStringValue(
      providerMetadata.success_url,
      providerMetadata.return_url
    )

    return {
      ...providerMetadata,
      // GoPay calls the callback URL `return_url`; PayKit's provider-level
      // abstraction expects `success_url` and writes it to GoPay's callback.return_url.
      ...(successUrl ? { success_url: successUrl } : {}),
    }
  }
}

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaykitGopayPaymentProvider],
})
