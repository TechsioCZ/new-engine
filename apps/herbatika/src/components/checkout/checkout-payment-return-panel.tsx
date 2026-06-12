"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import NextLink from "next/link"
import { useSearchParams } from "next/navigation"
import { type ReactNode, useEffect, useRef, useState } from "react"
import {
  resolveCompleteCartFailure,
  resolveOrderId,
} from "@/components/checkout/checkout-completion.utils"
import { clearStoredPaymentProviderSelection } from "@/components/checkout/checkout-payment-selection-storage"
import { resolveCheckoutStepHref } from "@/components/checkout/checkout-route.utils"
import { CheckoutCompletedOrderSection } from "@/components/checkout/sections/checkout-completed-order-section"
import { SupportingText } from "@/components/text/supporting-text"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import { storefront } from "@/lib/storefront/storefront"

const MAX_PAYMENT_RETURN_ATTEMPTS = 8
const PAYMENT_RETURN_RETRY_DELAY_MS = 1500

export function CheckoutPaymentReturnPanel() {
  const searchParams = useSearchParams()
  const cartId = normalizeSearchParam(searchParams.get("cart_id"))
  const isCancelled = resolvePaymentCancelled(searchParams)
  const _retryRequestKey = normalizeSearchParam(searchParams.get("retry"))
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null)
  const [returnError, setReturnError] = useState<string | null>(null)
  const completeCartMutation = storefront.flows.cart.useCompleteCart()
  const completeCartRef = useRef(completeCartMutation.mutateAsync)

  useEffect(() => {
    completeCartRef.current = completeCartMutation.mutateAsync
  }, [completeCartMutation.mutateAsync])

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
        const completeResult = await completeCartRef.current({
          cartId,
        })
        if (didCancel) {
          return
        }

        const orderId = resolveOrderId(completeResult)
        if (orderId) {
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
  }, [cartId, completedOrderId, isCancelled, returnError])

  if (completedOrderId) {
    return <CheckoutCompletedOrderSection completedOrderId={completedOrderId} />
  }

  const summaryHref = resolveCheckoutStepHref("suhrn")
  const paymentHref = resolveCheckoutStepHref("doprava-platba")

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
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-300 rounded-sm border border-border-primary bg-surface p-400 sm:p-550">
      <h1 className="font-rubik font-semibold text-fg-primary text-xl">
        {title}
      </h1>
      <StatusText aria-live="polite" showIcon status={status}>
        {children}
      </StatusText>
      <SupportingText>
        Ak sa stav nezmení, objednávku môžete skontrolovať v účte alebo skúsiť
        dokončenie znova.
      </SupportingText>
      {actions ? <div className="flex flex-wrap gap-200">{actions}</div> : null}
    </section>
  )
}

function resolvePaymentReturnFailureMessage(message: string) {
  if (isPaymentProviderAuthorizationFailure(message)) {
    return "Platba nebola dokončená alebo bola zrušená."
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
