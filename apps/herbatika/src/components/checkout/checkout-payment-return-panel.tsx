"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { readAccountSetupRequested } from "@/components/checkout/account-setup-metadata"
import {
  logCheckoutAccountSetupDebug,
  useCheckoutAccountSetupDebugEnabled,
} from "@/components/checkout/checkout-account-setup-debug"
import {
  resolveCompleteCartFailure,
  resolveOrderId,
} from "@/components/checkout/checkout-completion.utils"
import {
  reportCheckoutError,
  resolveCheckoutCustomerErrorMessage,
} from "@/components/checkout/checkout-customer-error"
import { clearStoredPaymentProviderSelection } from "@/components/checkout/checkout-payment-selection-storage"
import { resolveCheckoutStepHref } from "@/components/checkout/checkout-route.utils"
import { CheckoutCompletedOrderSection } from "@/components/checkout/sections/checkout-completed-order-section"
import { StorefrontLink } from "@/components/storefront-link"
import { SupportingText } from "@/components/text/supporting-text"
import { useAuth } from "@/lib/storefront/auth"
import { useCart } from "@/lib/storefront/cart"
import {
  buildOrderConfirmationHref,
  issueOrderConfirmationAccess,
  syncCartSession,
} from "@/lib/storefront/checkout-access"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import type { PaymentResultProjection } from "@/lib/storefront/payment-result-session"
import { storefront } from "@/lib/storefront/storefront"

const MAX_PAYMENT_RETURN_ATTEMPTS = 8
const PAYMENT_RETURN_RETRY_DELAY_MS = 1500

const resolveProjectedOrderId = (paymentResult: PaymentResultProjection) =>
  paymentResult.status === "completed" && paymentResult.publicOrderId
    ? paymentResult.publicOrderId
    : null

const navigateToOrderConfirmation = async ({
  cartId,
  isAuthenticated,
  market,
  orderId,
}: Readonly<{
  cartId: string
  isAuthenticated: boolean
  market: Parameters<typeof buildOrderConfirmationHref>[0]["market"]
  orderId: string
}>) => {
  const access = isAuthenticated
    ? null
    : await issueOrderConfirmationAccess({
        cartId,
        publicOrderId: orderId,
      })

  window.location.replace(
    buildOrderConfirmationHref({
      market,
      publicOrderId: access?.publicOrderId ?? orderId,
    })
  )
}

const completeReturnedCart = async ({
  attemptCount,
  cartId,
  completeCart,
  debugCartMetadata,
}: Readonly<{
  attemptCount: number
  cartId: string
  completeCart: (input: { cartId: string }) => Promise<unknown>
  debugCartMetadata: unknown
}>) => {
  await syncCartSession(cartId)
  logCheckoutAccountSetupDebug("payment return complete attempt", {
    attempt_count: attemptCount,
    cart_id: cartId,
    cart_metadata_requested: readAccountSetupRequested(debugCartMetadata),
  })
  return completeCart({ cartId })
}

export function CheckoutPaymentReturnPanel({
  paymentResult,
}: Readonly<{ paymentResult: PaymentResultProjection }>) {
  const tCheckout = useTranslations("checkout")
  const tCart = useTranslations("cart")
  const marketContext = useMarketContext()
  const authQuery = useAuth()
  const confirmationPendingMessage = tCheckout(
    "payment_return_confirmation_pending"
  )
  const verificationFailedMessage = tCheckout(
    "payment_return_verification_failed"
  )
  const paymentNotCompletedMessage = tCheckout("payment_return_not_completed")
  const cartUnavailableMessage = tCheckout("cart_not_ready")
  const insufficientInventoryMessage = tCart("insufficient_quantity")
  const customerErrorMessages = useMemo(
    () => ({
      cartUnavailable: cartUnavailableMessage,
      insufficientInventory: insufficientInventoryMessage,
      paymentAuthorizationFailed: paymentNotCompletedMessage,
    }),
    [
      cartUnavailableMessage,
      insufficientInventoryMessage,
      paymentNotCompletedMessage,
    ]
  )
  const cartId = paymentResult.cartId
  const isCancelled = paymentResult.status === "cancelled"
  const projectedOrderId = resolveProjectedOrderId(paymentResult)
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null)
  const [returnError, setReturnError] = useState<string | null>(null)
  const isAccountSetupDebugEnabled = useCheckoutAccountSetupDebugEnabled()
  const debugCartQuery = useCart({
    autoCreate: false,
    cartId,
    enabled: Boolean(cartId && isAccountSetupDebugEnabled),
  })
  const debugCartMetadata = debugCartQuery.cart?.metadata
  const completeCartMutation = storefront.flows.cart.useCompleteCart()
  const completeCartRef = useRef(completeCartMutation.mutateAsync)

  useEffect(() => {
    completeCartRef.current = completeCartMutation.mutateAsync
  }, [completeCartMutation.mutateAsync])

  useEffect(() => {
    if (!(isAccountSetupDebugEnabled && cartId)) {
      return
    }

    logCheckoutAccountSetupDebug("payment return cart snapshot", {
      cart_id: cartId,
      cart_metadata_requested: readAccountSetupRequested(debugCartMetadata),
      is_cart_fetching: debugCartQuery.isFetching,
      is_cart_loading: debugCartQuery.isLoading,
    })
  }, [
    cartId,
    debugCartMetadata,
    debugCartQuery.isFetching,
    debugCartQuery.isLoading,
    isAccountSetupDebugEnabled,
  ])

  useEffect(() => {
    if (isCancelled || completedOrderId || returnError) {
      return
    }

    let retryTimeout: number | undefined
    let didCancel = false
    let attemptCount = 0

    const completeReturnedPayment = async () => {
      attemptCount += 1

      try {
        if (projectedOrderId) {
          clearStoredPaymentProviderSelection(cartId)
          await navigateToOrderConfirmation({
            cartId,
            isAuthenticated: authQuery.isAuthenticated,
            market: marketContext.code,
            orderId: projectedOrderId,
          })
          setCompletedOrderId(projectedOrderId)
          return
        }

        const completeResult = await completeReturnedCart({
          attemptCount,
          cartId,
          completeCart: completeCartRef.current,
          debugCartMetadata,
        })
        if (didCancel) {
          return
        }

        const orderId = resolveOrderId(completeResult)
        if (orderId) {
          logCheckoutAccountSetupDebug("payment return complete succeeded", {
            attempt_count: attemptCount,
            cart_id: cartId,
            order_id: orderId,
          })
          clearStoredPaymentProviderSelection(cartId)
          await navigateToOrderConfirmation({
            cartId,
            isAuthenticated: authQuery.isAuthenticated,
            market: marketContext.code,
            orderId,
          })
          setCompletedOrderId(orderId)
          return
        }

        const completionFailure = resolveCompleteCartFailure(completeResult)
        if (completionFailure) {
          reportCheckoutError("payment return response", completionFailure)
          scheduleRetryOrFail(
            resolveCheckoutCustomerErrorMessage(
              completionFailure,
              confirmationPendingMessage,
              customerErrorMessages,
              "payment-return"
            )
          )
          return
        }

        scheduleRetryOrFail(confirmationPendingMessage)
      } catch (error) {
        reportCheckoutError("payment return verification", error)
        const errorMessage = resolveCheckoutCustomerErrorMessage(
          error,
          verificationFailedMessage,
          customerErrorMessages,
          "payment-return"
        )
        scheduleRetryOrFail(errorMessage)
      }
    }

    const scheduleRetryOrFail = (message: string) => {
      if (didCancel) {
        return
      }

      if (attemptCount >= MAX_PAYMENT_RETURN_ATTEMPTS) {
        setReturnError(message)
        return
      }

      retryTimeout = window.setTimeout(() => {
        runDetachedPromise(completeReturnedPayment())
      }, PAYMENT_RETURN_RETRY_DELAY_MS)
    }

    runDetachedPromise(completeReturnedPayment())

    return () => {
      didCancel = true
      if (retryTimeout) {
        window.clearTimeout(retryTimeout)
      }
    }
  }, [
    authQuery.isAuthenticated,
    cartId,
    completedOrderId,
    confirmationPendingMessage,
    customerErrorMessages,
    debugCartMetadata,
    isCancelled,
    marketContext.code,
    projectedOrderId,
    returnError,
    verificationFailedMessage,
  ])

  if (completedOrderId) {
    return <CheckoutCompletedOrderSection completedOrderId={completedOrderId} />
  }

  const summaryHref = resolveCheckoutStepHref("suhrn", marketContext.code)
  const paymentHref = resolveCheckoutStepHref(
    "doprava-platba",
    marketContext.code
  )

  if (isCancelled) {
    return (
      <PaymentReturnStatusCard
        actions={
          <>
            <LinkButton as={StorefrontLink} href={summaryHref} size="md">
              {tCheckout("payment_return_back_to_summary")}
            </LinkButton>
            <LinkButton
              as={StorefrontLink}
              href={paymentHref}
              size="md"
              theme="outlined"
              variant="secondary"
            >
              {tCheckout("payment_return_change_payment")}
            </LinkButton>
          </>
        }
        status="warning"
        title={tCheckout("payment_return_cancelled_title")}
      >
        {tCheckout("payment_return_cancelled_description")}
      </PaymentReturnStatusCard>
    )
  }

  if (returnError) {
    return (
      <PaymentReturnStatusCard
        actions={
          <>
            <Button
              isLoading={completeCartMutation.isPending}
              onClick={() => {
                setReturnError(null)
              }}
              size="md"
              type="button"
            >
              {tCheckout("payment_return_retry")}
            </Button>
            <LinkButton
              as={StorefrontLink}
              href={summaryHref}
              size="md"
              theme="outlined"
              variant="secondary"
            >
              {tCheckout("payment_return_back_to_summary")}
            </LinkButton>
          </>
        }
        status="warning"
        title={tCheckout("payment_return_failed_title")}
      >
        {returnError}
      </PaymentReturnStatusCard>
    )
  }

  return (
    <PaymentReturnStatusCard
      status="default"
      title={tCheckout("payment_return_verifying_title")}
    >
      {tCheckout("payment_return_verifying_description")}
    </PaymentReturnStatusCard>
  )
}

function PaymentReturnStatusCard({
  actions,
  children,
  status,
  title,
}: {
  actions?: ReactNode
  children: ReactNode
  status: "default" | "error" | "success" | "warning"
  title: string
}) {
  const tCheckout = useTranslations("checkout")

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-300 rounded-sm border border-border-primary bg-surface p-400 sm:p-550">
      <h1 className="font-rubik font-semibold text-fg-primary text-xl">
        {title}
      </h1>
      <StatusText aria-live="polite" showIcon status={status}>
        {children}
      </StatusText>
      <SupportingText>{tCheckout("payment_return_help")}</SupportingText>
      {actions ? <div className="flex flex-wrap gap-200">{actions}</div> : null}
    </section>
  )
}
