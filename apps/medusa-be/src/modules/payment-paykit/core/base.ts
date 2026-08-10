import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  BigNumberValue,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CreateAccountHolderInput,
  CreateAccountHolderOutput,
  DeleteAccountHolderInput,
  DeleteAccountHolderOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrieveAccountHolderInput,
  RetrieveAccountHolderOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdateAccountHolderInput,
  UpdateAccountHolderOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import type {
  BillingInfo,
  CreatePaymentSchema,
  UpdatePaymentSchema,
} from "@paykit-sdk/core"
import {
  billingSchema,
  createPaymentSchema,
  payeeSchema,
} from "@paykit-sdk/core"

import type { IntegrationConfigContainer } from "../../api-store/integration-config"
import { resolveConfiguredClient } from "../runtime"
import type {
  PaykitAdapterOptions,
  PaykitCustomer,
  PaykitPayment,
  PaykitPaymentClient,
  PaykitWebhookEvent,
} from "../types"
import { toNumericPaymentAmount } from "../utils/amounts"
import {
  getPaymentStatusValue,
  mapPaykitStatusToMedusa,
  mapPaykitWebhookEvent,
  toPaykitPaymentData,
  toPaykitRefundData,
} from "../utils/mappers"

export type PaykitInjectedDependencies = {
  [TKey in keyof IntegrationConfigContainer]: IntegrationConfigContainer[TKey]
}

type BillingInfoInput =
  | InitiatePaymentInput
  | CreateAccountHolderInput
  | UpdateAccountHolderInput

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

const isEmailValue = (value: string): boolean => EMAIL_PATTERN.test(value)

const optionalStringSchema = z
  .unknown()
  .transform((value) => (typeof value === "string" ? value : undefined))

const paykitBillingInputSchema = billingSchema.partial({ currency: true })

const medusaBillingAddressSchema = z.object({
  address_1: z.string(),
  address_2: optionalStringSchema,
  city: z.string(),
  country_code: z.string(),
  first_name: optionalStringSchema,
  last_name: optionalStringSchema,
  phone: optionalStringSchema,
  postal_code: z.string(),
  province: optionalStringSchema,
})

const createPaymentMetadataSchema = createPaymentSchema.shape.metadata.unwrap()
const providerMetadataSchema =
  createPaymentSchema.shape.provider_metadata.unwrap()

const firstNonEmptyString = (
  ...values: readonly unknown[]
): string | undefined =>
  values.find(
    (value): value is string => typeof value === "string" && value.length > 0,
  )

// Mirrors the historical truthiness check on provider data, so non-string ids
// still reach the typed provider id validation instead of silently skipping it.
const hasProviderPaymentId = (
  data: NonNullable<DeletePaymentInput["data"]>,
): boolean => Boolean(data["id"])

const getCurrencyCode = (
  data?: RefundPaymentInput["data"],
): string | undefined => firstNonEmptyString(data?.["currency"])

const getMetadataRecord = (
  metadata: unknown,
): CreatePaymentSchema["metadata"] | undefined => {
  const result = createPaymentMetadataSchema.safeParse(metadata)
  return result.success ? result.data : undefined
}

const getCaptureAmount = (input: CapturePaymentInput): number | undefined => {
  if (!("amount" in input)) {
    return undefined
  }

  const amount = Reflect.get(input, "amount")
  return amount === undefined
    ? undefined
    : toNumericPaymentAmount(amount, "PayKit capture amount must be numeric")
}

const isProviderNotSupportedError = (error: unknown): boolean =>
  error instanceof Error && error.name === "ProviderNotSupportedError"

const preserveWebhookAmount = (
  amount: BigNumberValue | undefined,
): BigNumberValue | undefined => amount

const noAccountHolderCreated = (): CreateAccountHolderOutput =>
  Object.defineProperty({ id: "" }, "id", { enumerable: false })

const joinName = (...values: unknown[]): string | undefined => {
  const name = values
    .filter((value): value is string => typeof value === "string" && !!value)
    .join(" ")

  return name || undefined
}

const toStringMetadata = (
  metadata?: CreatePaymentSchema["metadata"] | null,
): UpdatePaymentSchema["metadata"] | undefined => {
  if (!metadata) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      ]),
  )
}

const normalizePaymentOutput = (
  payment: PaykitPayment,
): {
  data: NonNullable<GetPaymentStatusOutput["data"]>
  status: ReturnType<typeof mapPaykitStatusToMedusa>
} => ({
  data: toPaykitPaymentData(payment),
  status: mapPaykitStatusToMedusa(getPaymentStatusValue(payment)),
})

const requirePayment = (
  payment: PaykitPayment | null,
  id: string,
): PaykitPayment => {
  if (!payment) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `PayKit payment ${id} could not be retrieved`,
    )
  }

  return payment
}

const getSessionId = (
  data: NonNullable<InitiatePaymentInput["data"]>,
): string => {
  const sessionId = firstNonEmptyString(data["session_id"])

  if (sessionId === undefined) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PayKit requires session_id in payment session data",
    )
  }

  return sessionId
}

const mapPaykitBillingInfo = (
  billing: unknown,
  currencyCode?: string,
): BillingInfo | undefined => {
  const result = paykitBillingInputSchema.safeParse(billing)

  if (!result.success) {
    return undefined
  }

  const currency = firstNonEmptyString(result.data.currency, currencyCode)
  if (currency === undefined) {
    return undefined
  }

  const { address, carrier } = result.data

  return {
    address: {
      city: address.city,
      country: address.country,
      line1: address.line1,
      line2: address.line2 ?? "",
      name: address.name,
      postal_code: address.postal_code,
      ...(address.state === undefined ? {} : { state: address.state }),
      ...(address.phone === undefined ? {} : { phone: address.phone }),
    },
    currency,
    ...(carrier === undefined ? {} : { carrier }),
  }
}

const resolveBillingPhone = (
  billingPhone: string | undefined,
  customerPhone?: string | null,
): string | undefined => billingPhone ?? firstNonEmptyString(customerPhone)

const mapMedusaBillingAddress = (
  billing: unknown,
  currencyCode: string | undefined,
  input: BillingInfoInput,
): BillingInfo | undefined => {
  const result = medusaBillingAddressSchema.safeParse(billing)
  const currency = firstNonEmptyString(currencyCode)

  if (!result.success || currency === undefined) {
    return undefined
  }

  const customer = input.context?.customer
  const address = result.data
  const phone = resolveBillingPhone(address.phone, customer?.phone)

  return {
    address: {
      city: address.city,
      country: address.country_code,
      line1: address.address_1,
      line2: address.address_2 ?? "",
      name:
        firstNonEmptyString(
          joinName(address.first_name, address.last_name),
          joinName(customer?.first_name, customer?.last_name),
          customer?.email,
          customer?.id,
        ) ?? "Customer",
      postal_code: address.postal_code,
      ...(address.province === undefined ? {} : { state: address.province }),
      ...(phone === undefined ? {} : { phone }),
    },
    currency,
  }
}

const mapBillingInfo = (input: BillingInfoInput): BillingInfo | undefined => {
  const currencyCode =
    "currency_code" in input && typeof input.currency_code === "string"
      ? input.currency_code
      : undefined
  const explicitBilling = "data" in input ? input.data?.["billing"] : undefined

  if (explicitBilling !== undefined) {
    const billing =
      mapPaykitBillingInfo(explicitBilling, currencyCode) ??
      mapMedusaBillingAddress(explicitBilling, currencyCode, input)

    if (billing !== undefined) {
      return billing
    }
  }

  return mapMedusaBillingAddress(
    input.context?.customer?.billing_address,
    currencyCode,
    input,
  )
}

// `PaymentActions` is a TypeScript enum in `@medusajs/framework/utils` while
// `WebhookActionResult["action"]` is the string union in the types package, so
// the comparison value is pinned to the union to stay enum-safe.
const NOT_SUPPORTED_ACTION: WebhookActionResult["action"] =
  PaymentActions.NOT_SUPPORTED

export abstract class PaykitPaymentProviderBase<
  TOptions extends PaykitAdapterOptions = PaykitAdapterOptions,
> extends AbstractPaymentProvider<TOptions> {
  protected readonly providerContainer: PaykitInjectedDependencies
  protected readonly providerOptions: TOptions
  private clientPromise: Promise<PaykitPaymentClient> | undefined
  private readonly customerDataKey = "customer"
  private readonly invalidDataType = MedusaError.Types.INVALID_DATA
  private readonly providerMetadataKey = "provider_metadata"
  private readonly providerPaymentIdKey = "id"
  private readonly normalizeDefaultWebhookAmount = preserveWebhookAmount

  protected constructor(
    container: PaykitInjectedDependencies,
    options: TOptions,
  ) {
    super(container, options)

    this.providerContainer = container
    this.providerOptions = options
  }

  protected abstract createDefaultClient(): Promise<PaykitPaymentClient>

  protected async getClient(): Promise<PaykitPaymentClient> {
    const configuredClient = await resolveConfiguredClient(this.providerOptions)
    if (configuredClient) {
      this.clientPromise ??= Promise.resolve(configuredClient)
      return await this.clientPromise
    }

    // Runtime API Store configs can change in Admin, so don't cache SDK clients
    // created from provider credentials.
    return await this.createDefaultClient()
  }

  protected getProviderPaymentId(data?: InitiatePaymentInput["data"]): string {
    const id = data?.[this.providerPaymentIdKey]

    if (typeof id !== "string" || id.length === 0) {
      throw new MedusaError(
        this.invalidDataType,
        "PayKit payment id is missing from payment data.id",
      )
    }

    return id
  }

  protected normalizeAmount(
    amount: InitiatePaymentInput["amount"],
    _currencyCode?: string,
  ): number {
    return toNumericPaymentAmount(
      amount,
      "PayKit payment amount must be numeric",
      this.invalidDataType,
    )
  }

  protected normalizePaymentDataAmount(
    amount: RefundPaymentInput["amount"],
    currencyCode?: string,
  ): number {
    return this.normalizeAmount(amount, currencyCode)
  }

  protected normalizeWebhookAmount(
    amount: BigNumberValue | undefined,
    _payment: PaykitPayment,
    _event: PaykitWebhookEvent,
  ): BigNumberValue | undefined {
    return this.normalizeDefaultWebhookAmount(amount)
  }

  protected normalizeWebhookNumericAmount(
    amount: BigNumberValue,
    _currencyCode?: string,
  ): number {
    // Keep webhook payload parsing in the base class; provider overrides should
    // only convert from provider units, such as Stripe cents, to Medusa units.
    return toNumericPaymentAmount(
      amount,
      "PayKit webhook amount must be numeric",
      this.invalidDataType,
    )
  }

  protected getProviderMetadata(
    data: NonNullable<InitiatePaymentInput["data"]>,
  ): NonNullable<CreatePaymentSchema["provider_metadata"]> {
    const result = providerMetadataSchema.safeParse(
      data[this.providerMetadataKey],
    )
    return result.success ? result.data : {}
  }

  protected getCreateProviderMetadata(
    _input: InitiatePaymentInput,
    data: NonNullable<InitiatePaymentInput["data"]>,
  ): NonNullable<CreatePaymentSchema["provider_metadata"]> {
    return this.getProviderMetadata(data)
  }

  protected getUpdateProviderMetadata(
    data: NonNullable<UpdatePaymentInput["data"]>,
  ): NonNullable<UpdatePaymentSchema["provider_metadata"]> {
    return this.getProviderMetadata(data)
  }

  protected getPaykitCustomer(
    input: InitiatePaymentInput,
    data: NonNullable<InitiatePaymentInput["data"]>,
  ): CreatePaymentSchema["customer"] {
    const dataCustomer = data[this.customerDataKey]

    if (typeof dataCustomer === "string" && dataCustomer.length > 0) {
      return isEmailValue(dataCustomer)
        ? { email: dataCustomer }
        : { id: dataCustomer }
    }

    const customerResult = payeeSchema.safeParse(dataCustomer)
    if (customerResult.success) {
      return customerResult.data
    }

    if (typeof data["customer_email"] === "string") {
      return { email: data["customer_email"] }
    }

    if (typeof data["email"] === "string") {
      return { email: data["email"] }
    }

    const contextEmail = firstNonEmptyString(input.context?.customer?.email)
    if (contextEmail !== undefined) {
      return { email: contextEmail }
    }

    const accountHolderEmail = input.context?.account_holder?.data?.["email"]
    if (typeof accountHolderEmail === "string") {
      return { email: accountHolderEmail }
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PayKit requires customer email or id in payment session data.customer, data.customer_email, or context.customer.email",
    )
  }

  protected getItemId(data: NonNullable<InitiatePaymentInput["data"]>): string {
    const providerMetadata = this.getProviderMetadata(data)
    const itemId =
      data["item_id"] ??
      providerMetadata["item_id"] ??
      data["cart_id"] ??
      data["session_id"]

    if (typeof itemId === "string" && itemId.length > 0) {
      return itemId
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PayKit requires item_id in payment session data",
    )
  }

  protected getCaptureMethod(
    data: NonNullable<InitiatePaymentInput["data"]>,
  ): "automatic" | "manual" {
    const providerMetadata = this.getProviderMetadata(data)
    const captureMethod =
      data["capture_method"] ?? providerMetadata["capture_method"]

    if (captureMethod === "automatic" || captureMethod === "manual") {
      return captureMethod
    }

    return this.providerOptions.capture === true ? "automatic" : "manual"
  }

  async initiatePayment(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentOutput> {
    const client = await this.getClient()
    const data = input.data ?? {}
    const sessionId = getSessionId(data)
    const metadata = {
      ...getMetadataRecord(data["metadata"]),
      session_id: sessionId,
    }
    const providerMetadata = this.getCreateProviderMetadata(input, data)
    const billing = mapBillingInfo(input)
    const createInput: CreatePaymentSchema = {
      amount: this.normalizeAmount(input.amount, input.currency_code),
      capture_method: this.getCaptureMethod(data),
      currency: input.currency_code,
      customer: this.getPaykitCustomer(input, data),
      item_id: this.getItemId(data),
      metadata,
      provider_metadata: providerMetadata,
      ...(billing ? { billing } : {}),
    }
    const payment = await client.payments.create(createInput)
    const paymentId = firstNonEmptyString(payment.id)

    if (paymentId === undefined) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit create payment response did not include an id",
      )
    }

    const output = normalizePaymentOutput(payment)

    return {
      id: paymentId,
      ...output,
      data: {
        ...output.data,
        id: paymentId,
      },
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput,
  ): Promise<GetPaymentStatusOutput> {
    const client = await this.getClient()
    const id = this.getProviderPaymentId(input.data)
    const payment = requirePayment(await client.payments.retrieve(id), id)

    return normalizePaymentOutput(payment)
  }

  async authorizePayment(
    input: AuthorizePaymentInput,
  ): Promise<AuthorizePaymentOutput> {
    return await this.getPaymentStatus(input)
  }

  async retrievePayment(
    input: RetrievePaymentInput,
  ): Promise<RetrievePaymentOutput> {
    const client = await this.getClient()
    const id = this.getProviderPaymentId(input.data)
    const payment = requirePayment(await client.payments.retrieve(id), id)

    return { data: toPaykitPaymentData(payment) }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const client = await this.getClient()
    const id = this.getProviderPaymentId(input.data)

    if (!client.payments.update) {
      const payment = requirePayment(await client.payments.retrieve(id), id)
      return normalizePaymentOutput(payment)
    }

    const metadata = toStringMetadata(
      getMetadataRecord(input.data?.["metadata"]),
    )
    const updateInput: UpdatePaymentSchema = {
      amount: this.normalizeAmount(input.amount, input.currency_code),
      currency: input.currency_code,
      ...(metadata ? { metadata } : {}),
      provider_metadata: this.getUpdateProviderMetadata(input.data ?? {}),
    }
    const payment = await client.payments.update(id, updateInput)

    return normalizePaymentOutput(payment)
  }

  async capturePayment(
    input: CapturePaymentInput,
  ): Promise<CapturePaymentOutput> {
    const client = await this.getClient()
    const id = this.getProviderPaymentId(input.data)

    if (!client.payments.capture) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PayKit provider does not support payment capture",
      )
    }

    const explicitAmount = getCaptureAmount(input)
    const storedAmount = input.data?.["amount"]
    const paymentDataAmount =
      storedAmount === undefined
        ? undefined
        : toNumericPaymentAmount(
            storedAmount,
            "PayKit stored payment amount must be numeric",
          )

    const amount = explicitAmount ?? paymentDataAmount

    if (amount === undefined) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit capture amount is missing",
      )
    }

    const currencyCode = getCurrencyCode(input.data)
    const normalizedAmount =
      explicitAmount === undefined
        ? this.normalizePaymentDataAmount(amount, currencyCode)
        : this.normalizeAmount(amount, currencyCode)

    const payment = await client.payments.capture(id, {
      amount: normalizedAmount,
    })

    return { data: toPaykitPaymentData(payment) }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const client = await this.getClient()
    const id = this.getProviderPaymentId(input.data)
    const amount = this.normalizeAmount(
      input.amount,
      getCurrencyCode(input.data),
    )

    if (client.refunds?.create) {
      const refund = await client.refunds.create({
        amount,
        metadata: null,
        payment_id: id,
        reason: null,
      })
      const refundId = firstNonEmptyString(refund.id)

      if (refundId === undefined) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "PayKit refund response did not include an id",
        )
      }

      return {
        data: {
          ...input.data,
          id,
          refund: toPaykitRefundData(refund),
          refund_id: refundId,
        },
      }
    }

    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "PayKit provider does not support refunds",
    )
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const id = this.getProviderPaymentId(input.data)
    const client = await this.getClient()

    if (!client.payments.cancel) {
      return input.data ? { data: input.data } : {}
    }

    const payment = await client.payments.cancel(id)

    return { data: toPaykitPaymentData(payment) }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    const { data } = input

    if (data === undefined) {
      return {}
    }

    // Medusa can call deletePayment during create-session rollback with only
    // the original input data, before provider data.id has been persisted.
    if (!hasProviderPaymentId(data)) {
      return { data }
    }

    const client = await this.getClient()
    const id = this.getProviderPaymentId(data)

    if (!client.payments.cancel) {
      return { data }
    }

    const payment = await client.payments.cancel(id)

    return { data: toPaykitPaymentData(payment) }
  }

  async retrieveAccountHolder(
    input: RetrieveAccountHolderInput,
  ): Promise<RetrieveAccountHolderOutput> {
    const { id } = input

    if (typeof id !== "string" || !id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit account holder id is missing",
      )
    }

    const client = await this.getClient()

    if (!client.customers?.retrieve) {
      return { id }
    }

    let customer: PaykitCustomer | null

    try {
      customer = await client.customers.retrieve(id)
    } catch (error) {
      if (isProviderNotSupportedError(error)) {
        return { id }
      }

      throw error
    }

    const customerId = firstNonEmptyString(customer?.id)

    if (customer === null || customerId === undefined) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PayKit account holder ${id} could not be retrieved`,
      )
    }

    return { data: customer, id: customerId }
  }

  async createAccountHolder(
    input: CreateAccountHolderInput,
  ): Promise<CreateAccountHolderOutput> {
    const { customer } = input.context

    if (!customer?.email) {
      return noAccountHolderCreated()
    }

    const client = await this.getClient()

    if (!client.customers?.create) {
      return noAccountHolderCreated()
    }

    try {
      const name = firstNonEmptyString(
        joinName(customer.first_name, customer.last_name),
        customer.email.split("@")[0],
      )
      const metadata = toStringMetadata({
        medusa_customer_id: customer.id,
      })
      const providerCustomer = await client.customers.create({
        billing: mapBillingInfo(input) ?? null,
        email: customer.email,
        ...(name === undefined ? {} : { name }),
        phone: customer.phone ?? "",
        ...(metadata ? { metadata } : {}),
      })
      const providerCustomerId = firstNonEmptyString(providerCustomer.id)

      if (providerCustomerId === undefined) {
        return noAccountHolderCreated()
      }

      return { data: providerCustomer, id: providerCustomerId }
    } catch (error) {
      if (isProviderNotSupportedError(error)) {
        return noAccountHolderCreated()
      }

      throw error
    }
  }

  async updateAccountHolder(
    input: UpdateAccountHolderInput,
  ): Promise<UpdateAccountHolderOutput> {
    const { id } = input.context.account_holder.data

    if (typeof id !== "string" || !id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit account holder id is missing from context.account_holder.data.id",
      )
    }

    const client = await this.getClient()

    if (!client.customers?.update) {
      return {}
    }

    const { customer } = input.context

    try {
      const billing = mapBillingInfo(input)
      const email = firstNonEmptyString(customer?.email)
      const name = firstNonEmptyString(
        joinName(customer?.first_name, customer?.last_name),
        customer?.email,
      )
      const phone = firstNonEmptyString(customer?.phone)
      const providerCustomer = await client.customers.update(id, {
        ...(billing ? { billing } : {}),
        ...(email === undefined ? {} : { email }),
        ...(name === undefined ? {} : { name }),
        ...(phone === undefined ? {} : { phone }),
      })

      return { data: providerCustomer }
    } catch (error) {
      if (isProviderNotSupportedError(error)) {
        return {}
      }

      throw error
    }
  }

  async deleteAccountHolder(
    input: DeleteAccountHolderInput,
  ): Promise<DeleteAccountHolderOutput> {
    const id = input.context.account_holder.data?.["id"]

    if (typeof id !== "string" || !id) {
      return {}
    }

    const client = await this.getClient()

    if (!client.customers?.delete) {
      return {}
    }

    try {
      await client.customers.delete(id)
      return {}
    } catch (error) {
      if (isProviderNotSupportedError(error)) {
        return {}
      }

      throw error
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"],
  ): Promise<WebhookActionResult> {
    const client = await this.getClient()

    if (!client.handleWebhook) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const events = await client.handleWebhook(payload)
    const eventList = Array.isArray(events) ? events : [events]
    const validEvents = eventList.filter(
      (webhookEvent): webhookEvent is PaykitWebhookEvent =>
        Boolean(webhookEvent),
    )

    if (!validEvents.length) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    for (const event of validEvents) {
      const result = mapPaykitWebhookEvent(event, {
        normalizeAmount: (amount, payment, webhookEvent) =>
          this.normalizeWebhookAmount(amount, payment, webhookEvent),
      })

      if (result.action !== NOT_SUPPORTED_ACTION) {
        return result
      }
    }

    return { action: PaymentActions.NOT_SUPPORTED }
  }
}
