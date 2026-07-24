"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import type { Route } from "next"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import NextLink from "@/components/app-link"
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
  normalizePaymentReturnSearchParam,
  resolvePaymentCancelled,
  resolvePaymentReturnFailureMessage,
} from "@/components/checkout/checkout-payment-return.utils"
import { clearStoredPaymentProviderSelection } from "@/components/checkout/checkout-payment-selection-storage"
import { resolveCheckoutStepHref } from "@/components/checkout/checkout-route.utils"
import { PaymentReturnStatusCard } from "@/components/checkout/payment-return-status-card"
import { CheckoutCompletedOrderSection } from "@/components/checkout/sections/checkout-completed-order-section"
import { useCart } from "@/lib/storefront/cart"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import { storefront } from "@/lib/storefront/storefront"

const MAX_PAYMENT_RETURN_ATTEMPTS = 8
const PAYMENT_RETURN_RETRY_DELAY_MS = 1500

export function CheckoutPaymentReturnPanel() {
  const searchParams = useSearchParams()
  const cartId = normalizePaymentReturnSearchParam(searchParams.get("cart_id"))
  const isCancelled = resolvePaymentCancelled(searchParams)
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null)
  const [returnError, setReturnError] = useState<string | null>(null)
  const isAccountSetupDebugEnabled = useCheckoutAccountSetupDebugEnabled()
  const debugCartQuery = useCart({
    autoCreate: false,
    ...(cartId == null ? {} : { cartId }),
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
          "Platbu sa zatiaľ nepodarilo potvrdiť."
        scheduleRetryOrFail(failureMessage)
      } catch (error) {
        if (didCancel) {
          return
        }

        const errorMessage = resolveErrorMessage(
          error,
          "Overenie platby zlyhalo."
        )
        scheduleRetryOrFail(errorMessage)
      }
    }

    const scheduleRetryOrFail = (message: string) => {
      if (attemptCount >= MAX_PAYMENT_RETURN_ATTEMPTS) {
        setReturnError(resolvePaymentReturnFailureMessage(message))
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
  }, [cartId, completedOrderId, debugCartMetadata, isCancelled, returnError])

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
              Späť na súhrn
            </LinkButton>
            <LinkButton
              as={NextLink}
              href={paymentHref}
              size="md"
              theme="outlined"
              variant="secondary"
            >
              Zmeniť platbu
            </LinkButton>
          </>
        }
        status="warning"
        title="Platba bola zrušená"
      >
        Môžete sa vrátiť do súhrnu objednávky a skúsiť platbu znova.
      </PaymentReturnStatusCard>
    )
  }

  if (!cartId) {
    return (
      <PaymentReturnStatusCard
        actions={
          <LinkButton as={NextLink} href={summaryHref} size="md">
            Späť na súhrn
          </LinkButton>
        }
        status="error"
        title="Chýba košík platby"
      >
        Návrat z platobnej brány neobsahuje identifikátor košíka.
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
              Skúsiť znova
            </Button>
            <LinkButton
              as={NextLink}
              href={summaryHref}
              size="md"
              theme="outlined"
              variant="secondary"
            >
              Späť na súhrn
            </LinkButton>
          </>
        }
        status="warning"
        title="Platbu sa nepodarilo potvrdiť"
      >
        {returnError}
      </PaymentReturnStatusCard>
    )
  }

  return (
    <PaymentReturnStatusCard status="default" title="Overujeme platbu">
      Po návrate z platobnej brány dokončujeme objednávku. Zvyčajne to trvá len
      pár sekúnd.
    </PaymentReturnStatusCard>
  )
}
