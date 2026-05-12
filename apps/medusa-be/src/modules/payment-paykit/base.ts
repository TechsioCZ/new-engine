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
import {
  getPaymentStatusValue,
  mapPaykitStatusToMedusa,
  mapPaykitWebhookEvent,
  toPaykitPaymentData,
} from "./mappers"
import { resolveConfiguredClient } from "./runtime"
import type {
  PaykitBillingInfo,
  PaykitCreatePaymentInput,
  PaykitPayment,
  PaykitPaymentClient,
  PaykitProviderOptions,
  PaykitUpdatePaymentInput,
  PaykitWebhookEvent,
} from "./types"

export type PaykitInjectedDependencies = Record<string, unknown>

type CapturePaymentInputWithAmount = CapturePaymentInput & {
  amount?: RefundPaymentInput["amount"]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isProviderNotSupportedError = (error: unknown): boolean =>
  error instanceof Error && error.name === "ProviderNotSupportedError"

export abstract class PaykitPaymentProviderBase<
  TOptions extends PaykitProviderOptions = PaykitProviderOptions,
> extends AbstractPaymentProvider<TOptions> {
  protected readonly options_: TOptions
  private client_: Promise<PaykitPaymentClient> | undefined

  protected constructor(
    container: PaykitInjectedDependencies,
    options: TOptions
  ) {
    super(container, options)

    this.options_ = options
  }

  protected abstract createDefaultClient(): Promise<PaykitPaymentClient>

  protected async getClient(): Promise<PaykitPaymentClient> {
    this.client_ ??= (async () => {
      const configuredClient = await resolveConfiguredClient(this.options_)
      return configuredClient ?? this.createDefaultClient()
    })()

    return await this.client_
  }

  protected getProviderPaymentId(data?: Record<string, unknown>): string {
    const id = data?.id

    if (typeof id !== "string" || id.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit payment id is missing from payment data.id"
      )
    }

    return id
  }

  protected normalizePaymentOutput(payment: PaykitPayment): {
    data: Record<string, unknown>
    status: ReturnType<typeof mapPaykitStatusToMedusa>
  } {
    return {
      data: toPaykitPaymentData(payment),
      status: mapPaykitStatusToMedusa(getPaymentStatusValue(payment)),
    }
  }

  protected requirePayment(
    payment: PaykitPayment | null,
    id: string
  ): PaykitPayment {
    if (!payment) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PayKit payment ${id} could not be retrieved`
      )
    }

    return payment
  }

  protected normalizeAmount(
    amount: InitiatePaymentInput["amount"],
    _currencyCode?: string
  ): number {
    return this.normalizeNumericAmount(
      amount,
      "PayKit payment amount must be numeric"
    )
  }

  protected normalizePaymentDataAmount(
    amount: RefundPaymentInput["amount"],
    currencyCode?: string
  ): number {
    return this.normalizeAmount(amount, currencyCode)
  }

  protected normalizeWebhookAmount(
    amount: BigNumberValue | undefined,
    _payment: PaykitPayment,
    _event: PaykitWebhookEvent
  ): BigNumberValue | undefined {
    return amount
  }

  protected normalizeNumericAmount(
    amount: InitiatePaymentInput["amount"],
    message: string
  ): number {
    const normalized = Number(amount)

    if (!Number.isFinite(normalized)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
    }

    return normalized
  }

  protected toStringMetadata(
    metadata?: Record<string, unknown> | null
  ): Record<string, string> | undefined {
    if (!metadata) {
      return
    }

    return Object.fromEntries(
      Object.entries(metadata).map(([key, value]) => [
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      ])
    )
  }

  protected mapBillingInfo(
    input:
      | InitiatePaymentInput
      | CreateAccountHolderInput
      | UpdateAccountHolderInput
  ): PaykitBillingInfo | undefined {
    const billing = input.context?.customer?.billing_address

    if (!(billing?.address_1 && billing.city && billing.country_code)) {
      return
    }

    if (
      !("currency_code" in input) ||
      typeof input.currency_code !== "string"
    ) {
      return
    }

    return {
      address: {
        name:
          [
            input.context?.customer?.first_name,
            input.context?.customer?.last_name,
          ]
            .filter(Boolean)
            .join(" ") ||
          input.context?.customer?.email ||
          input.context?.customer?.id ||
          "Customer",
        line1: billing.address_1,
        line2: billing.address_2 ?? "",
        city: billing.city,
        state: billing.province ?? undefined,
        postal_code: billing.postal_code ?? "",
        country: billing.country_code,
        phone: billing.phone ?? input.context?.customer?.phone ?? undefined,
      },
      currency: input.currency_code,
    }
  }

  protected getProviderMetadata(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    return isRecord(data.provider_metadata) ? data.provider_metadata : {}
  }

  protected getCreateProviderMetadata(
    _input: InitiatePaymentInput,
    data: Record<string, unknown>
  ): Record<string, unknown> {
    return this.getProviderMetadata(data)
  }

  protected getUpdateProviderMetadata(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    return this.getProviderMetadata(data)
  }

  protected getPaykitCustomer(
    input: InitiatePaymentInput,
    data: Record<string, unknown>
  ): string | { email: string } {
    const dataCustomer = data.customer

    if (typeof dataCustomer === "string" && dataCustomer.length > 0) {
      return dataCustomer
    }

    if (isRecord(dataCustomer) && typeof dataCustomer.email === "string") {
      return { email: dataCustomer.email }
    }

    if (typeof data.customer_email === "string") {
      return { email: data.customer_email }
    }

    if (typeof data.email === "string") {
      return { email: data.email }
    }

    const contextCustomer = input.context?.customer
    if (contextCustomer?.email) {
      return { email: contextCustomer.email }
    }

    const accountHolderEmail = input.context?.account_holder?.data?.email
    if (typeof accountHolderEmail === "string") {
      return { email: accountHolderEmail }
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PayKit requires customer email in payment session data.customer.email, data.customer_email, or context.customer.email"
    )
  }

  protected getItemId(data: Record<string, unknown>): string {
    const providerMetadata = this.getProviderMetadata(data)
    const itemId =
      data.item_id ??
      providerMetadata.item_id ??
      data.cart_id ??
      data.session_id

    if (typeof itemId === "string" && itemId.length > 0) {
      return itemId
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PayKit requires item_id in payment session data"
    )
  }

  protected getCaptureMethod(
    data: Record<string, unknown>
  ): "automatic" | "manual" {
    const providerMetadata = this.getProviderMetadata(data)
    const captureMethod = data.capture_method ?? providerMetadata.capture_method

    if (captureMethod === "automatic" || captureMethod === "manual") {
      return captureMethod
    }

    return this.options_.capture ? "automatic" : "manual"
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const client = await this.getClient()
    const data = input.data ?? {}
    const metadata = {
      ...((data.metadata as Record<string, unknown> | undefined) ?? {}),
      session_id: data.session_id,
    }
    const providerMetadata = this.getCreateProviderMetadata(input, data)
    const createInput: PaykitCreatePaymentInput = {
      amount: this.normalizeAmount(input.amount, input.currency_code),
      billing: this.mapBillingInfo(input),
      currency: input.currency_code,
      metadata,
      provider_metadata: providerMetadata,
      customer: this.getPaykitCustomer(input, data),
      item_id: this.getItemId(data),
      capture_method: this.getCaptureMethod(data),
    }
    const payment = await client.payments.create(createInput)

    if (!payment.id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit create payment response did not include an id"
      )
    }

    const output = this.normalizePaymentOutput(payment)

    return {
      id: payment.id,
      ...output,
      data: {
        ...output.data,
        id: payment.id,
      },
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const client = await this.getClient()
    const id = this.getProviderPaymentId(input.data)
    const payment = this.requirePayment(await client.payments.retrieve(id), id)

    return this.normalizePaymentOutput(payment)
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    return this.getPaymentStatus(input)
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const client = await this.getClient()
    const id = this.getProviderPaymentId(input.data)
    const payment = this.requirePayment(await client.payments.retrieve(id), id)

    return { data: toPaykitPaymentData(payment) }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const client = await this.getClient()
    const id = this.getProviderPaymentId(input.data)

    if (!client.payments.update) {
      const payment = this.requirePayment(
        await client.payments.retrieve(id),
        id
      )
      return this.normalizePaymentOutput(payment)
    }

    const updateInput: PaykitUpdatePaymentInput = {
      amount: this.normalizeAmount(input.amount, input.currency_code),
      currency: input.currency_code,
      metadata: this.toStringMetadata(
        input.data?.metadata as Record<string, unknown> | undefined
      ),
      provider_metadata: this.getUpdateProviderMetadata(input.data ?? {}),
    }
    const payment = await client.payments.update(id, updateInput)

    return this.normalizePaymentOutput(payment)
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const client = await this.getClient()
    const id = this.getProviderPaymentId(input.data)

    if (!client.payments.capture) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PayKit provider does not support payment capture"
      )
    }

    const explicitAmount = (input as CapturePaymentInputWithAmount).amount
    const paymentDataAmount = input.data?.amount as
      | RefundPaymentInput["amount"]
      | undefined
    const amount = explicitAmount ?? paymentDataAmount

    if (amount === undefined) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit capture amount is missing"
      )
    }

    const currencyCode = input.data?.currency as string | undefined
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
      input.data?.currency as string
    )

    if (client.refunds?.create) {
      const refund = await client.refunds.create({
        payment_id: id,
        amount,
        reason: null,
        metadata: null,
      })

      return {
        data: {
          ...input.data,
          id,
          refund: toPaykitPaymentData(refund),
          refund_id: refund.id,
        },
      }
    }

    if (!client.payments.refund) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PayKit provider does not support refunds"
      )
    }

    const payment = await client.payments.refund(id, { amount })

    return { data: toPaykitPaymentData(payment) }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const id = this.getProviderPaymentId(input.data)
    const client = await this.getClient()

    if (!client.payments.cancel) {
      return { data: input.data }
    }

    const payment = await client.payments.cancel(id)

    return { data: toPaykitPaymentData(payment) }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    // Medusa can call deletePayment during create-session rollback with only
    // the original input data, before provider data.id has been persisted.
    if (!input.data?.id) {
      return { data: input.data }
    }

    const client = await this.getClient()
    const id = this.getProviderPaymentId(input.data)

    if (!client.payments.cancel) {
      return { data: input.data }
    }

    const payment = await client.payments.cancel(id)

    return { data: toPaykitPaymentData(payment) }
  }

  async retrieveAccountHolder(
    input: RetrieveAccountHolderInput
  ): Promise<RetrieveAccountHolderOutput> {
    const id = input.id

    if (typeof id !== "string" || !id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit account holder id is missing"
      )
    }

    const client = await this.getClient()

    if (!client.customers?.retrieve) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PayKit provider does not support retrieving account holders"
      )
    }

    const customer = await client.customers.retrieve(id)

    if (!customer?.id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PayKit account holder ${id} could not be retrieved`
      )
    }

    return { id: customer.id, data: customer }
  }

  async createAccountHolder(
    input: CreateAccountHolderInput
  ): Promise<CreateAccountHolderOutput> {
    const customer = input.context.customer

    if (!customer?.email) {
      return {} as CreateAccountHolderOutput
    }

    const client = await this.getClient()

    if (!client.customers?.create) {
      return {} as CreateAccountHolderOutput
    }

    try {
      const providerCustomer = await client.customers.create({
        billing: this.mapBillingInfo(input) ?? null,
        email: customer.email,
        name:
          [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
          customer.email.split("@")[0],
        phone: customer.phone ?? "",
        metadata: this.toStringMetadata({
          medusa_customer_id: customer.id,
        }),
      })

      if (!providerCustomer.id) {
        return {} as CreateAccountHolderOutput
      }

      return { id: providerCustomer.id, data: providerCustomer }
    } catch (error) {
      if (isProviderNotSupportedError(error)) {
        return {} as CreateAccountHolderOutput
      }

      throw error
    }
  }

  async updateAccountHolder(
    input: UpdateAccountHolderInput
  ): Promise<UpdateAccountHolderOutput> {
    const id = input.context.account_holder.data.id

    if (typeof id !== "string" || !id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PayKit account holder id is missing from context.account_holder.data.id"
      )
    }

    const client = await this.getClient()

    if (!client.customers?.update) {
      return {}
    }

    const customer = input.context.customer

    try {
      const billing = this.mapBillingInfo(input)
      const providerCustomer = await client.customers.update(id, {
        ...(billing ? { billing } : {}),
        email: customer?.email,
        name: customer
          ? [customer.first_name, customer.last_name]
              .filter(Boolean)
              .join(" ") || customer.email
          : undefined,
        phone: customer?.phone ?? undefined,
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
    input: DeleteAccountHolderInput
  ): Promise<DeleteAccountHolderOutput> {
    const id = input.context.account_holder.data?.id

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
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const client = await this.getClient()

    if (!client.handleWebhook) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const events = await client.handleWebhook(payload)
    const eventList = Array.isArray(events) ? events : [events]

    for (const event of eventList) {
      const result = mapPaykitWebhookEvent(event, {
        normalizeAmount: (amount, payment, webhookEvent) =>
          this.normalizeWebhookAmount(amount, payment, webhookEvent),
      })

      if (result.action !== PaymentActions.NOT_SUPPORTED) {
        return result
      }
    }

    return { action: PaymentActions.NOT_SUPPORTED }
  }
}
