"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import type { Route } from "next"
import { useTranslations } from "next-intl"
import NextLink from "next/link"
import { useSearchParams } from "next/navigation"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { readAccountSetupRequested } from "@/components/checkout/account-setup-metadata"
import {
  logCheckoutAccountSetupDebug,
  useCheckoutAccountSetupDebugEnabled,
} from "@/components/checkout/checkout-account-setup-debug"
import {
  resolveCompleteCartFailure,
  resolveOrderId,
} from "@/components/checkout/checkout-completion.utils"
import { clearStoredPaymentProviderSelection } from "@/components/checkout/checkout-payment-selection-storage"
import { resolveCheckoutStepHref } from "@/components/checkout/checkout-route.utils"
import { CheckoutCompletedOrderSection } from "@/components/checkout/sections/checkout-completed-order-section"
import { SupportingText } from "@/components/text/supporting-text"
import { useCart } from "@/lib/storefront/cart"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import { storefront } from "@/lib/storefront/storefront"

const MAX_PAYMENT_RETURN_ATTEMPTS = 8
const PAYMENT_RETURN_RETRY_DELAY_MS = 1500

export function CheckoutPaymentReturnPanel() {
  const tCheckout = useTranslations("checkout")
  const confirmationPendingMessage = tCheckout(
    "payment_return_confirmation_pending"
  )
  const verificationFailedMessage = tCheckout(
    "payment_return_verification_failed"
  )
  const paymentNotCompletedMessage = tCheckout(
    "payment_return_not_completed"
  )
  const searchParams = useSearchParams()
  const cartId = normalizeSearchParam(searchParams.get("cart_id"))
  const isCancelled = resolvePaymentCancelled(searchParams)
  const _retryRequestKey = normalizeSearchParam(searchParams.get("retry"))
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null)
  const [returnError, setReturnError] = useState<string | null>(null)
  const isAccountSetupDebugEnabled = useCheckoutAccountSetupDebugEnabled()
  const debugCartQuery = useCart({
    autoCreate: false,
    cartId: cartId ?? undefined,
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
    if (!cartId || isCancelled || completedOrderId || returnError) {
      return
    }

    let retryTimeout: number | undefined
    let didCancel = false
    let attemptCount = 0

    const completeReturnedPayment = async () => {
      attemptCount += 1

      try {
        logCheckoutAccountSetupDebug("payment return complete attempt", {
          attempt_count: attemptCount,
          cart_id: cartId,
          cart_metadata_requested: readAccountSetupRequested(debugCartMetadata),
        })

        const completeResult = await completeCartRef.current({
          cartId,
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
          setCompletedOrderId(orderId)
          return
        }

        const failureMessage =
          resolveCompleteCartFailure(completeResult) ??
          confirmationPendingMessage
        scheduleRetryOrFail(failureMessage)
      } catch (error) {
        if (didCancel) {
          return
        }

        const errorMessage = resolveErrorMessage(
          error,
          verificationFailedMessage
        )
        scheduleRetryOrFail(errorMessage)
      }
    }

    const scheduleRetryOrFail = (message: string) => {
      if (attemptCount >= MAX_PAYMENT_RETURN_ATTEMPTS) {
        setReturnError(
          resolvePaymentReturnFailureMessage(
            message,
            paymentNotCompletedMessage
          )
        )
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
    cartId,
    completedOrderId,
    confirmationPendingMessage,
    debugCartMetadata,
    isCancelled,
    paymentNotCompletedMessage,
    returnError,
    verificationFailedMessage,
  ])

  if (completedOrderId) {
    return <CheckoutCompletedOrderSection completedOrderId={completedOrderId} />
  }

  const summaryHref = resolveCheckoutStepHref("suhrn") as Route
  const paymentHref = resolveCheckoutStepHref("doprava-platba") as Route

  if (isCancelled) {
    return (
      <PaymentReturnStatusCard
        actions={
          <>
            <LinkButton as={NextLink} href={summaryHref} size="md">
              {tCheckout("payment_return_back_to_summary")}
            </LinkButton>
            <LinkButton
              as={NextLink}
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

  if (!cartId) {
    return (
      <PaymentReturnStatusCard
        actions={
          <LinkButton as={NextLink} href={summaryHref} size="md">
            {tCheckout("payment_return_back_to_summary")}
          </LinkButton>
        }
        status="error"
        title={tCheckout("payment_return_missing_cart_title")}
      >
        {tCheckout("payment_return_missing_cart_description")}
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
              as={NextLink}
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
      <SupportingText>
        {tCheckout("payment_return_help")}
      </SupportingText>
      {actions ? <div className="flex flex-wrap gap-200">{actions}</div> : null}
    </section>
  )
}

function resolvePaymentReturnFailureMessage(
  message: string,
  authorizationFailureMessage: string
) {
  if (isPaymentProviderAuthorizationFailure(message)) {
    return authorizationFailureMessage
  }

  return message
}

function isPaymentProviderAuthorizationFailure(message: string) {
  const normalizedMessage = message.toLowerCase()

  return (
    normalizedMessage.includes("not authorized with the provider") ||
    normalizedMessage.includes("was not authorized")
  )
}

function normalizeSearchParam(value: string | null) {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : null
}

function resolvePaymentCancelled(searchParams: {
  get: (name: string) => string | null
}) {
  return ["payment_cancelled", "cancelled", "canceled"].some((key) => {
    const value = searchParams.get(key)?.toLowerCase()
    return value === "true" || value === "1" || value === "yes"
  })
}
