import type {
  BigNumberValue,
  InitiatePaymentInput,
} from "@medusajs/framework/types"
import { MedusaError, ModuleProvider, Modules } from "@medusajs/framework/utils"
import { payeeSchema } from "@paykit-sdk/core"

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

  return undefined
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

const getEmailValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined
  }

  const email = value.trim()

  return EMAIL_PATTERN.test(email) ? email : undefined
}

const getComgateCustomerEmail = (
  input: InitiatePaymentInput,
  data: NonNullable<InitiatePaymentInput["data"]>,
): string | undefined => {
  const dataCustomer = data["customer"]

  const directCustomerEmail =
    typeof dataCustomer === "string" ? getEmailValue(dataCustomer) : undefined
  const customerResult = payeeSchema.safeParse(dataCustomer)
  const nestedCustomerEmail =
    customerResult.success && "email" in customerResult.data
      ? getEmailValue(customerResult.data.email)
      : undefined
  const dataEmail = getEmailValue(data["email"])
  const contextEmail = getEmailValue(input.context?.customer?.email)

  return directCustomerEmail ?? nestedCustomerEmail ?? dataEmail ?? contextEmail
}

export class PaykitComgatePaymentProvider extends PaykitPaymentProviderBase<PaykitComgateOptions> {
  static override readonly identifier = PAYKIT_PAYMENT_PROVIDER_IDENTIFIER

  readonly #comgateOptions: PaykitComgateOptions

  constructor(
    container: PaykitInjectedDependencies,
    options: PaykitComgateOptions,
  ) {
    super(container, options)
    this.#comgateOptions = options
  }

  static override validateOptions(options: PaykitComgateOptions = {}): void {
    if (
      options.client !== undefined ||
      options.clientFactory !== undefined ||
      (options.apiStoreName !== undefined && options.apiStoreName !== "")
    ) {
      return
    }

    requirePaykitOptions("PayKit Comgate", options, ["merchant", "secret"])
  }

  protected async createDefaultClient(): Promise<PaykitPaymentClient> {
    const options = await resolveComgateRuntimeOptions(
      this.providerContainer,
      this.#comgateOptions,
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
    data: NonNullable<InitiatePaymentInput["data"]>,
  ): { id: string } {
    const email = this.#getComgateCustomerEmail(input, data)

    if (email === undefined || email === "") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit Comgate requires a customer email",
      )
    }

    return { id: email }
  }

  readonly #getComgateCustomerEmail = getComgateCustomerEmail

  protected override getCreateProviderMetadata(
    input: InitiatePaymentInput,
    data: NonNullable<InitiatePaymentInput["data"]>,
  ) {
    const providerMetadata = super.getProviderMetadata(data)
    const email = this.#getComgateCustomerEmail(input, data)
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
