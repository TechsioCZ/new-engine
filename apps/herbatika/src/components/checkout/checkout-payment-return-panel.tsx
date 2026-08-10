"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"

import NextLink from "@/components/app-link"
import { CheckoutCompletedOrderSection } from "@/components/checkout/sections/checkout-completed-order-section"

import {
  normalizePaymentReturnParam,
  resolvePaymentReturnCancelled,
} from "./checkout-payment-return.utils"
import { resolveCheckoutStepHref } from "./checkout-route.utils"
import { PaymentReturnStatusCard } from "./payment-return-status-card"
import { usePaymentReturnCompletion } from "./use-payment-return-completion"

export const CheckoutPaymentReturnPanel = () => {
  const tCheckout = useTranslations("checkout")
  const searchParams = useSearchParams()
  const cartId = normalizePaymentReturnParam(searchParams.get("cart_id"))
  const isCancelled = resolvePaymentReturnCancelled(searchParams)
  const completion = usePaymentReturnCompletion({
    cartId,
    confirmationPendingMessage: tCheckout(
      "payment_return_confirmation_pending",
    ),
    isCancelled,
    paymentNotCompletedMessage: tCheckout("payment_return_not_completed"),
    verificationFailedMessage: tCheckout("payment_return_verification_failed"),
  })
  const handleRetry = completion.retry

  if (completion.completedOrderId !== null) {
    return (
      <CheckoutCompletedOrderSection
        completedOrderId={completion.completedOrderId}
      />
    )
  }

  const summaryHref = resolveCheckoutStepHref("suhrn")
  const paymentHref = resolveCheckoutStepHref("doprava-platba")

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

  if (cartId === null) {
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

  if (completion.returnError !== null && completion.returnError.length > 0) {
    return (
      <PaymentReturnStatusCard
        actions={
          <>
            <Button
              isLoading={completion.isCompleting}
              onClick={handleRetry}
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
        {completion.returnError}
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
