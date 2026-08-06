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
import type {
  BillingInfo,
  CreatePaymentSchema,
  UpdatePaymentSchema,
} from "@paykit-sdk/core"
import { isRecord } from "@techsio/std/object"

import { resolveConfiguredClient } from "../runtime"
import type {
  PaykitAdapterOptions,
  PaykitCustomer,
  PaykitPayment,
  PaykitPaymentClient,
  PaykitWebhookEvent,
} from "../types"
import {
  getPaymentStatusValue,
  mapPaykitStatusToMedusa,
  mapPaykitWebhookEvent,
  toPaykitPaymentData,
  toPaykitRefundData,
} from "../utils/mappers"

export type PaykitInjectedDependencies = Record<string, unknown>

type BillingInfoInput =
  | InitiatePaymentInput
  | CreateAccountHolderInput
  | UpdateAccountHolderInput

interface PaykitAddressFields {
  city: string
  country: string
  line1: string
  name: string
  postalCode: string
}

interface MedusaAddressFields {
  addressLine1: string
  city: string
  countryCode: string
  postalCode: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

const isEmailValue = (value: string): boolean => EMAIL_PATTERN.test(value)

const firstNonEmptyString = (
  ...values: readonly unknown[]
): string | undefined =>
  values.find(
    (value): value is string => typeof value === "string" && value.length > 0,
  )

// Mirrors the historical truthiness check on provider data, so non-string ids
// still reach the typed provider id validation instead of silently skipping it.
const hasProviderPaymentId = (data: Record<string, unknown>): boolean =>
  Boolean(data["id"])

const isBigNumberLike = (value: Record<string, unknown>): boolean => {
  const numericValue = value["value"]

  if (typeof numericValue === "number" || typeof numericValue === "string") {
    return true
  }

  return "toJSON" in value && "valueOf" in value
}

const isPaymentAmount = (
  value: unknown,
): value is InitiatePaymentInput["amount"] => {
  if (typeof value === "number" || typeof value === "string") {
    return true
  }

  return isRecord(value) && isBigNumberLike(value)
}

const getCurrencyCode = (data?: Record<string, unknown>): string | undefined =>
  firstNonEmptyString(data?.["currency"])

const getMetadataRecord = (
  metadata: unknown,
): Record<string, unknown> | undefined =>
  isRecord(metadata) ? metadata : undefined

const getCaptureAmount = (
  input: CapturePaymentInput,
): RefundPaymentInput["amount"] | undefined => {
  if (!("amount" in input)) {
    return undefined
  }

  const amount = Reflect.get(input, "amount")

  if (amount !== undefined && !isPaymentAmount(amount)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PayKit capture amount must be numeric",
    )
  }

  return amount
}

const isProviderNotSupportedError = (error: unknown): boolean =>
  error instanceof Error && error.name === "ProviderNotSupportedError"

const noAccountHolderCreated = (): CreateAccountHolderOutput =>
  Object.create(null)

const joinName = (...values: unknown[]): string | undefined => {
  const name = values
    .filter((value): value is string => typeof value === "string" && !!value)
    .join(" ")

  return name || undefined
}

const toStringMetadata = (
  metadata?: Record<string, unknown> | null,
): Record<string, string> | undefined => {
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
  data: Record<string, unknown>
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

const getSessionId = (data: Record<string, unknown>): string => {
  const sessionId = firstNonEmptyString(data["session_id"])

  if (sessionId === undefined) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PayKit requires session_id in payment session data",
    )
  }

  return sessionId
}

const readPaykitAddressFields = (
  address: Record<string, unknown>,
): PaykitAddressFields | undefined => {
  const { city, country, line1, name } = address
  const postalCode = address["postal_code"]

  if (
    typeof city !== "string" ||
    typeof country !== "string" ||
    typeof line1 !== "string"
  ) {
    return undefined
  }

  if (typeof name !== "string" || typeof postalCode !== "string") {
    return undefined
  }

  return { city, country, line1, name, postalCode }
}

const mapPaykitBillingInfo = (
  billing: unknown,
  currencyCode?: string,
): BillingInfo | undefined => {
  if (!(isRecord(billing) && isRecord(billing["address"]))) {
    return undefined
  }

  const { address } = billing
  const fields = readPaykitAddressFields(address)
  const currency = firstNonEmptyString(billing["currency"], currencyCode)

  if (fields === undefined || currency === undefined) {
    return undefined
  }

  const addressLine2 = address["line2"]
  const { phone, state } = address
  const { carrier } = billing

  return {
    address: {
      city: fields.city,
      country: fields.country,
      line1: fields.line1,
      line2: typeof addressLine2 === "string" ? addressLine2 : "",
      name: fields.name,
      postal_code: fields.postalCode,
      ...(typeof state === "string" ? { state } : {}),
      ...(typeof phone === "string" ? { phone } : {}),
    },
    currency,
    ...(typeof carrier === "string" ? { carrier } : {}),
  }
}

const readMedusaAddressFields = (
  billing: Record<string, unknown>,
): MedusaAddressFields | undefined => {
  const addressLine1 = billing["address_1"]
  const { city } = billing
  const countryCode = billing["country_code"]
  const postalCode = billing["postal_code"]

  if (typeof addressLine1 !== "string" || typeof city !== "string") {
    return undefined
  }

  if (typeof countryCode !== "string" || typeof postalCode !== "string") {
    return undefined
  }

  return { addressLine1, city, countryCode, postalCode }
}

const resolveBillingPhone = (
  billingPhone: unknown,
  customerPhone?: string | null,
): string | undefined =>
  typeof billingPhone === "string"
    ? billingPhone
    : firstNonEmptyString(customerPhone)

const mapMedusaBillingAddress = (
  billing: unknown,
  currencyCode: string | undefined,
  input: BillingInfoInput,
): BillingInfo | undefined => {
  if (!isRecord(billing)) {
    return undefined
  }

  const fields = readMedusaAddressFields(billing)
  const currency = firstNonEmptyString(currencyCode)

  if (fields === undefined || currency === undefined) {
    return undefined
  }

  const customer = input.context?.customer
  const addressLine2 = billing["address_2"]
  const { province } = billing
  const phone = resolveBillingPhone(billing["phone"], customer?.phone)

  return {
    address: {
      city: fields.city,
      country: fields.countryCode,
      line1: fields.addressLine1,
      line2: typeof addressLine2 === "string" ? addressLine2 : "",
      name:
        firstNonEmptyString(
          joinName(billing["first_name"], billing["last_name"]),
          joinName(customer?.first_name, customer?.last_name),
          customer?.email,
          customer?.id,
        ) ?? "Customer",
      postal_code: fields.postalCode,
      ...(typeof province === "string" ? { state: province } : {}),
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

  if ("data" in input && isRecord(input.data)) {
    const explicitBilling =
      mapPaykitBillingInfo(input.data["billing"], currencyCode) ??
      mapMedusaBillingAddress(input.data["billing"], currencyCode, input)

    if (explicitBilling !== undefined) {
      return explicitBilling
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
  protected readonly container_: PaykitInjectedDependencies
  protected readonly options_: TOptions
  private clientPromise: Promise<PaykitPaymentClient> | undefined

  protected constructor(
    container: PaykitInjectedDependencies,
    options: TOptions,
  ) {
    super(container, options)

    this.container_ = container
    this.options_ = options
  }

  protected abstract createDefaultClient(): Promise<PaykitPaymentClient>

  protected async getClient(): Promise<PaykitPaymentClient> {
    const configuredClient = await resolveConfiguredClient(this.options_)
    if (configuredClient) {
      this.clientPromise ??= Promise.resolve(configuredClient)
      return await this.clientPromise
    }

    // Runtime API Store configs can change in Admin, so don't cache SDK clients
    // created from provider credentials.
    return await this.createDefaultClient()
  }

  protected getProviderPaymentId(data?: Record<string, unknown>): string {
    const id = data?.["id"]

    if (typeof id !== "string" || id.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit payment id is missing from payment data.id",
      )
    }

    return id
  }

  protected normalizeAmount(
    amount: InitiatePaymentInput["amount"],
    _currencyCode?: string,
  ): number {
    return this.normalizeNumericAmount(
      amount,
      "PayKit payment amount must be numeric",
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
    return amount
  }

  protected normalizeNumericAmount(
    amount: BigNumberValue | InitiatePaymentInput["amount"],
    message: string,
  ): number {
    const normalized =
      isRecord(amount) && "value" in amount
        ? Number(amount.value)
        : Number(amount)

    if (!Number.isFinite(normalized)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
    }

    return normalized
  }

  protected normalizeWebhookNumericAmount(
    amount: BigNumberValue,
    _currencyCode?: string,
  ): number {
    // Keep webhook payload parsing in the base class; provider overrides should
    // only convert from provider units, such as Stripe cents, to Medusa units.
    return this.normalizeNumericAmount(
      amount,
      "PayKit webhook amount must be numeric",
    )
  }

  protected getProviderMetadata(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    return isRecord(data["provider_metadata"]) ? data["provider_metadata"] : {}
  }

  protected getCreateProviderMetadata(
    _input: InitiatePaymentInput,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    return this.getProviderMetadata(data)
  }

  protected getUpdateProviderMetadata(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    return this.getProviderMetadata(data)
  }

  protected getPaykitCustomer(
    input: InitiatePaymentInput,
    data: Record<string, unknown>,
  ): CreatePaymentSchema["customer"] {
    const dataCustomer = data["customer"]

    if (typeof dataCustomer === "string" && dataCustomer.length > 0) {
      return isEmailValue(dataCustomer)
        ? { email: dataCustomer }
        : { id: dataCustomer }
    }

    if (isRecord(dataCustomer)) {
      if (
        typeof dataCustomer["email"] === "string" &&
        isEmailValue(dataCustomer["email"])
      ) {
        return { email: dataCustomer["email"] }
      }

      if (
        typeof dataCustomer["id"] === "string" ||
        typeof dataCustomer["id"] === "number"
      ) {
        return { id: dataCustomer["id"] }
      }
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

  protected getItemId(data: Record<string, unknown>): string {
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
    data: Record<string, unknown>,
  ): "automatic" | "manual" {
    const providerMetadata = this.getProviderMetadata(data)
    const captureMethod =
      data["capture_method"] ?? providerMetadata["capture_method"]

    if (captureMethod === "automatic" || captureMethod === "manual") {
      return captureMethod
    }

    return this.options_.capture === true ? "automatic" : "manual"
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
    let paymentDataAmount: RefundPaymentInput["amount"] | undefined

    if (input.data?.["amount"] !== undefined) {
      if (!isPaymentAmount(input.data["amount"])) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "PayKit stored payment amount must be numeric",
        )
      }

      paymentDataAmount = input.data["amount"]
    }

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
