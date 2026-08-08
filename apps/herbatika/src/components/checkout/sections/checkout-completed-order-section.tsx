"use client"

import { useQuery } from "@tanstack/react-query"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import NextLink from "@/components/app-link"
import { SupportingText } from "@/components/text/supporting-text"
import { fetchOrderPaymentQr } from "@/lib/storefront/order-payment-qr"

import { CheckoutPaymentQrPanel } from "./checkout-payment-qr-panel"

interface CheckoutCompletedOrderSectionProps {
  completedOrderId: string
}

const QR_PAYMENT_PENDING_REFETCH_INTERVAL_MS = 1500
const QR_PAYMENT_PENDING_TIMEOUT_MS = 15_000

export const CheckoutCompletedOrderSection = ({
  completedOrderId,
}: CheckoutCompletedOrderSectionProps) => {
  const tCheckout = useTranslations("checkout")
  const [timedOutOrderId, setTimedOutOrderId] = useState<string | null>(null)
  const hasQrPaymentPendingTimedOut = timedOutOrderId === completedOrderId
  const qrPaymentQuery = useQuery({
    enabled: Boolean(completedOrderId),
    queryFn: async () =>
      await fetchOrderPaymentQr({
        orderId: completedOrderId,
      }),
    queryKey: ["checkout-order-payment-qr", completedOrderId],
    refetchInterval: (query) =>
      query.state.data?.status === "pending" && !hasQrPaymentPendingTimedOut
        ? QR_PAYMENT_PENDING_REFETCH_INTERVAL_MS
        : false,
    retry: 2,
    staleTime: Number.POSITIVE_INFINITY,
  })
  const qrPaymentStatus = qrPaymentQuery.data?.status
  const qrPayment = qrPaymentQuery.data?.qrPayment ?? null
  const isPendingQrPayment =
    qrPaymentStatus === "pending" && !hasQrPaymentPendingTimedOut
  const isQrPaymentFetchPending =
    qrPaymentQuery.isFetching && qrPayment === null
  const canContinuePreparingQrPayment =
    qrPaymentStatus !== "not_applicable" && !hasQrPaymentPendingTimedOut
  const isPreparingQrPayment =
    (isQrPaymentFetchPending && canContinuePreparingQrPayment) ||
    isPendingQrPayment
  const didQrPaymentFail =
    qrPaymentQuery.isError ||
    qrPaymentStatus === "unavailable" ||
    (qrPaymentStatus === "pending" && hasQrPaymentPendingTimedOut)

  useEffect(() => {
    let timeout: number | null = null
    if (qrPaymentStatus === "pending" && timedOutOrderId !== completedOrderId) {
      timeout = window.setTimeout(() => {
        setTimedOutOrderId(completedOrderId)
      }, QR_PAYMENT_PENDING_TIMEOUT_MS)
    }

    return () => {
      if (timeout !== null) {
        window.clearTimeout(timeout)
      }
    }
  }, [completedOrderId, qrPaymentStatus, timedOutOrderId])

  return (
    <section className="mx-auto flex max-w-checkout-status flex-col gap-400">
      <section className="mx-auto max-w-checkout-status space-y-300 rounded-sm border border-border-primary bg-surface p-350">
        <h2 className="font-semibold text-fg-primary text-xl">
          {tCheckout("completed_order_title")}
        </h2>
        <StatusText showIcon status="success">
          {tCheckout("completed_order_created", {
            orderId: completedOrderId,
          })}
        </StatusText>

        {isPreparingQrPayment ? (
          <SupportingText aria-live="polite">
            {tCheckout("completed_order_qr_preparing")}
          </SupportingText>
        ) : null}

        {qrPayment ? <CheckoutPaymentQrPanel qrPayment={qrPayment} /> : null}

        {didQrPaymentFail ? (
          <StatusText showIcon size="sm" status="warning">
            {tCheckout("completed_order_qr_failed")}
          </StatusText>
        ) : null}
      </section>
      <div className="flex w-full flex-wrap gap-200">
        <LinkButton as={NextLink} href="/" size="md">
          {tCheckout("completed_order_continue_shopping")}
        </LinkButton>
        <LinkButton
          as={NextLink}
          href="/account"
          size="md"
          theme="outlined"
          variant="secondary"
        >
          {tCheckout("completed_order_go_to_account")}
        </LinkButton>
      </div>
    </section>
  )
}
