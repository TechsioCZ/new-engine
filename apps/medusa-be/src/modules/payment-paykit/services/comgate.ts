import type {
  BigNumberValue,
  InitiatePaymentInput,
} from "@medusajs/framework/types"
import { MedusaError, ModuleProvider, Modules } from "@medusajs/framework/utils"

import { PAYKIT_PAYMENT_PROVIDER_IDENTIFIER } from "../constants"
import { PaykitPaymentProviderBase } from "../core/base"
import type { PaykitInjectedDependencies } from "../core/base"
import { createPaykitClient, getComgateProviderOptions } from "../runtime"
import { resolveComgateRuntimeOptions } from "../runtime-config"
import type {
  PaykitComgateOptions,
  PaykitPayment,
  PaykitPaymentClient,
} from "../types"
import {
  fromSmallestCurrencyUnit,
  toSmallestCurrencyUnit,
} from "../utils/amounts"
import { requirePaykitOptions } from "../utils/validation"

const DEFAULT_PAYMENT_LABEL = "Order from Eshop"

const getStringValue = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value
    }
  }

  return
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const getEmailValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return
  }

  const email = value.trim()

  return EMAIL_PATTERN.test(email) ? email : undefined
}

export class PaykitComgatePaymentProvider extends PaykitPaymentProviderBase<PaykitComgateOptions> {
  static override identifier = PAYKIT_PAYMENT_PROVIDER_IDENTIFIER

  // Medusa's provider loader instantiates provider classes directly.
  // the base constructor is protected; this keeps the provider constructor public.
  constructor(
    container: PaykitInjectedDependencies,
    options: PaykitComgateOptions,
  ) {
    super(container, options)
  }

  static override validateOptions(options: PaykitComgateOptions = {}): void {
    if (options.client || options.clientFactory || options.apiStoreName) {
      return
    }

    requirePaykitOptions("PayKit Comgate", options, ["merchant", "secret"])
  }

  protected async createDefaultClient(): Promise<PaykitPaymentClient> {
    const options = await resolveComgateRuntimeOptions(
      this.container_,
      this.options_,
    )

    return await createPaykitClient(
      "@paykit-sdk/comgate",
      "createComgate",
      getComgateProviderOptions(options),
    )
  }

  protected override normalizeAmount(
    amount: InitiatePaymentInput["amount"],
    currencyCode?: string,
  ): number {
    const normalized = super.normalizeAmount(amount, currencyCode)

    return toSmallestCurrencyUnit(normalized, currencyCode)
  }

  protected override normalizePaymentDataAmount(
    amount: InitiatePaymentInput["amount"],
    currencyCode?: string,
  ): number {
    return super.normalizeAmount(amount, currencyCode)
  }

  protected override normalizeWebhookAmount(
    amount: BigNumberValue | undefined,
    payment: PaykitPayment,
  ): BigNumberValue | undefined {
    if (amount === undefined) {
      return amount
    }

    const currencyCode = payment.currency ?? payment.currency_code ?? undefined
    const normalized = super.normalizeWebhookNumericAmount(amount, currencyCode)

    return fromSmallestCurrencyUnit(normalized, currencyCode)
  }

  protected override getPaykitCustomer(
    input: InitiatePaymentInput,
    data: Record<string, unknown>,
  ): { id: string } {
    const email = this.getComgateCustomerEmail(input, data)

    if (!email) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit Comgate requires a customer email",
      )
    }

    return { id: email }
  }

  private getComgateCustomerEmail(
    input: InitiatePaymentInput,
    data: Record<string, unknown>,
  ): string | undefined {
    const dataCustomer = data["customer"]

    return (
      (typeof dataCustomer === "string"
        ? getEmailValue(dataCustomer)
        : undefined) ??
      (dataCustomer &&
      typeof dataCustomer === "object" &&
      "email" in dataCustomer
        ? getEmailValue(dataCustomer.email)
        : undefined) ??
      getEmailValue(data["email"]) ??
      getEmailValue(input.context?.customer?.email)
    )
  }

  protected override getCreateProviderMetadata(
    input: InitiatePaymentInput,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const providerMetadata = super.getProviderMetadata(data)
    const email = this.getComgateCustomerEmail(input, data)
    const paymentLabel = getStringValue(
      providerMetadata["paymentLabel"],
      providerMetadata["label"],
      data["session_id"],
      data["cart_id"],
    )

    return {
      ...providerMetadata,
      email,
      // PayKit Comgate validates paymentLabel as required, so mirror its
      // provider default when no app-level label is configured.
      paymentLabel:
        paymentLabel === undefined
          ? DEFAULT_PAYMENT_LABEL
          : `Order ${paymentLabel}`,
    }
  }
}

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaykitComgatePaymentProvider],
})
