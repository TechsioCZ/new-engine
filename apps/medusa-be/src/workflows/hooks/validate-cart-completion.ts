import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { isCashOnDeliveryPaymentProviderId } from "../../modules/payment-cash-on-delivery/constants"
import { checkSpendingLimit } from "../../utils/check-spending-limit"
import { getCartApprovalStatus } from "../../utils/get-cart-approval-status"

type CartPaymentSession = {
  is_selected?: boolean | null
  provider_id?: string | null
  status?: PaymentSessionStatus | null
}

type CartShippingMethod = {
  data?: Record<string, unknown> | null
  shipping_option?: {
    data?: Record<string, unknown> | null
    type?: {
      code?: string | null
    } | null
  } | null
}

function hasCashOnDeliveryMarker(
  data?: Record<string, unknown> | null,
  fallbackCode?: string | null
) {
  const code =
    typeof data?.code === "string"
      ? data.code.trim().toLowerCase()
      : (fallbackCode?.trim().toLowerCase() ?? "")

  return (
    data?.supports_cod === true ||
    code === "z_point_cod" ||
    code.endsWith("_cod") ||
    code.endsWith("-cod")
  )
}

function isCashOnDeliveryShippingMethod(
  shippingMethod: CartShippingMethod | undefined
) {
  const shippingOption = shippingMethod?.shipping_option

  return (
    hasCashOnDeliveryMarker(shippingMethod?.data) ||
    hasCashOnDeliveryMarker(shippingOption?.data, shippingOption?.type?.code)
  )
}

function resolveSelectedPaymentProviderId(
  paymentSessions: CartPaymentSession[] | undefined
) {
  const activeSessions = paymentSessions?.filter((session) =>
    [
      PaymentSessionStatus.PENDING,
      PaymentSessionStatus.REQUIRES_MORE,
      PaymentSessionStatus.AUTHORIZED,
      PaymentSessionStatus.CAPTURED,
      PaymentSessionStatus.PENDING_AUTHORIZATION,
    ].includes(session.status as PaymentSessionStatus)
  )
  const selectedSession =
    activeSessions?.find((session) => session.is_selected === true) ??
    activeSessions?.[0]

  return selectedSession?.provider_id
}

completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const {
    data: [queryCart],
  } = await query.graph({
    entity: "cart",
    fields: [
      "approvals.*",
      "customer_id",
      "total",
      "shipping_methods.data",
      "shipping_methods.shipping_option.data",
      "shipping_methods.shipping_option.type.code",
      "payment_collection.payment_sessions.*",
    ],
    filters: {
      id: cart.id,
    },
  })

  if (!queryCart) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart "${cart.id}" was not found`
    )
  }

  const shippingMethods = queryCart.shipping_methods as
    | CartShippingMethod[]
    | undefined
  const paymentSessions = queryCart.payment_collection?.payment_sessions as
    | CartPaymentSession[]
    | undefined
  const selectedPaymentProviderId =
    resolveSelectedPaymentProviderId(paymentSessions)
  const usesCashOnDeliveryShipping = shippingMethods?.some(
    isCashOnDeliveryShippingMethod
  )
  const usesCashOnDeliveryPayment = isCashOnDeliveryPaymentProviderId(
    selectedPaymentProviderId
  )

  if (usesCashOnDeliveryShipping !== usesCashOnDeliveryPayment) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Cash-on-delivery shipping must use the cash-on-delivery payment provider"
    )
  }

  // Check if cart is pending approval
  const { isPendingApproval } = getCartApprovalStatus(queryCart)

  if (isPendingApproval) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Cart is pending approval"
    )
  }

  // Check if spending limit will be exceeded
  if (queryCart.customer_id) {
    const {
      data: [customer],
    } = await query.graph({
      entity: "customer",
      fields: ["employee.spending_limit"],
      filters: {
        id: queryCart.customer_id,
      },
    })

    if (!customer) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Customer "${queryCart.customer_id}" was not found`
      )
    }

    if (customer.employee?.spending_limit) {
      const spendLimitExceeded = checkSpendingLimit(queryCart, customer)

      if (spendLimitExceeded) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "Cart total exceeds spending limit"
        )
      }
    }
  }

  return new StepResponse(undefined, null)
})
