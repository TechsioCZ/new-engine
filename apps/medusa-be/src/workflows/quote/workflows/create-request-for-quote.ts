import type {
  CreateOrderAddressDTO,
  CreateOrderLineItemDTO,
  CreateOrderShippingMethodDTO,
  UpdateOrderAddressDTO,
} from "@medusajs/framework/types"
import { MedusaError, OrderStatus } from "@medusajs/framework/utils"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type {
  StepFunctionReturnConfig,
  WorkflowData,
} from "@medusajs/framework/workflows-sdk"
import {
  beginOrderEditOrderWorkflow,
  createOrderWorkflow,
  useRemoteQueryStep,
} from "@medusajs/medusa/core-flows"

import { createQuotesWorkflow } from "./create-quote"

/*
  A workflow that creates a request for quote.

  Quotes contain links to a draft order, customer and cart. Any changes (updated price, quantity, etc) made on the quote
  is performed within the scope of a draft order. We then re-use the order edit functionality of the order to stage
  any changes to the quote made by the merchant.

  The customer can then accept or reject the changes. The lifecycle of the quote is managed through its status,
  that is performed by independent workflows - accept / reject.
*/

interface QuoteCartQueryResult {
  billing_address?: CreateOrderAddressDTO | UpdateOrderAddressDTO
  currency_code: string
  id: string
  items: CreateOrderLineItemDTO[]
  promotions: { code: string }[]
  region_id?: string
  sales_channel_id?: string
  shipping_address?: CreateOrderAddressDTO | UpdateOrderAddressDTO
  shipping_methods: Omit<CreateOrderShippingMethodDTO, "order_id">[]
}

interface QuoteCustomerQueryResult {
  email: string
  id: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const assertIsQuoteCartQueryResult: (
  value: unknown,
) => asserts value is WorkflowData<QuoteCartQueryResult> = (value) => {
  if (!isRecord(value) || typeof value["id"] !== "string") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Unexpected cart query result shape",
      "quote_cart_query_result_invalid",
    )
  }
}

const assertIsQuoteCustomerQueryResult: (
  value: unknown,
) => asserts value is WorkflowData<QuoteCustomerQueryResult> &
  StepFunctionReturnConfig<QuoteCustomerQueryResult> = (value) => {
  if (!isRecord(value) || typeof value["id"] !== "string") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Unexpected customer query result shape",
      "quote_customer_query_result_invalid",
    )
  }
}

const queryCustomerStep: (
  input: Parameters<typeof useRemoteQueryStep>[0],
) => WorkflowData<QuoteCustomerQueryResult> &
  StepFunctionReturnConfig<QuoteCustomerQueryResult> = useRemoteQueryStep

export const createRequestForQuoteWorkflow = createWorkflow(
  "create-request-for-quote",
  (input: { cart_id: string; customer_id: string }) => {
    const cart: unknown = useRemoteQueryStep({
      entry_point: "cart",
      fields: [
        "id",
        "sales_channel_id",
        "currency_code",
        "region_id",
        "customer.id",
        "customer.email",
        "shipping_address.*",
        "billing_address.*",
        "items.*",
        "shipping_methods.*",
        "promotions.code",
      ],
      list: false,
      throw_if_key_not_found: true,
      variables: { id: input.cart_id },
    })
    assertIsQuoteCartQueryResult(cart)

    const customerQueryResult: unknown = queryCustomerStep({
      entry_point: "customer",
      fields: ["id", "email"],
      list: false,
      throw_if_key_not_found: true,
      variables: { id: input.customer_id },
    }).config({ name: "customer-query" })
    assertIsQuoteCustomerQueryResult(customerQueryResult)
    const customer = customerQueryResult

    const orderInput = transform(
      { cart, customer },
      ({ cart: cartData, customer: customerData }) => ({
        ...(cartData.billing_address === undefined
          ? {}
          : { billing_address: cartData.billing_address }),
        currency_code: cartData.currency_code,
        customer_id: customerData.id,
        email: customerData.email,
        is_draft_order: true,
        items: cartData.items,
        promo_codes: cartData.promotions.map(
          ({ code }: { code: string }) => code,
        ),
        ...(cartData.region_id === undefined
          ? {}
          : { region_id: cartData.region_id }),
        ...(cartData.sales_channel_id === undefined
          ? {}
          : { sales_channel_id: cartData.sales_channel_id }),
        ...(cartData.shipping_address === undefined
          ? {}
          : { shipping_address: cartData.shipping_address }),
        shipping_methods: cartData.shipping_methods,
        status: OrderStatus.DRAFT,
      }),
    )

    const draftOrder = createOrderWorkflow.runAsStep({
      input: orderInput,
    })

    const orderEditInput = transform(
      { draftOrder },
      ({ draftOrder: draftOrderData }) => ({
        description: "",
        internal_note: "",
        metadata: {},
        order_id: draftOrderData.id,
      }),
    )

    const changeOrder = beginOrderEditOrderWorkflow.runAsStep({
      input: orderEditInput,
    })

    const quotes = createQuotesWorkflow.runAsStep({
      input: [
        {
          cart_id: cart.id,
          customer_id: customer.id,
          draft_order_id: draftOrder.id,
          order_change_id: changeOrder.id,
        },
      ],
    })

    return new WorkflowResponse({ quote: quotes[0] })
  },
)
