"use client"

import { useEffect, useRef, useState } from "react"

import { useCart } from "@/lib/storefront/cart"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import { storefront } from "@/lib/storefront/storefront"

import { readAccountSetupRequested } from "./account-setup-metadata"
import {
  logCheckoutAccountSetupDebug,
  useCheckoutAccountSetupDebugEnabled,
} from "./checkout-account-setup-debug"
import {
  resolveCompleteCartFailure,
  resolveOrderId,
} from "./checkout-completion.utils"
import { resolvePaymentReturnFailureMessage } from "./checkout-payment-return.utils"
import { clearStoredPaymentProviderSelection } from "./checkout-payment-selection-storage"

const MAX_PAYMENT_RETURN_ATTEMPTS = 8
const PAYMENT_RETURN_RETRY_DELAY_MS = 1500

interface UsePaymentReturnCompletionProps {
  cartId: string | null
  confirmationPendingMessage: string
  isCancelled: boolean
  paymentNotCompletedMessage: string
  verificationFailedMessage: string
}

export const usePaymentReturnCompletion = ({
  cartId,
  confirmationPendingMessage,
  isCancelled,
  paymentNotCompletedMessage,
  verificationFailedMessage,
}: UsePaymentReturnCompletionProps) => {
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null)
  const [returnError, setReturnError] = useState<string | null>(null)
  const isDebugEnabled = useCheckoutAccountSetupDebugEnabled()
  const debugCartQuery = useCart({
    autoCreate: false,
    ...(cartId === null ? {} : { cartId }),
    enabled: cartId !== null && isDebugEnabled,
  })
  const debugCartMetadata = debugCartQuery.cart?.metadata
  const completeCartMutation = storefront.flows.cart.useCompleteCart()
  const completeCartRef = useRef(completeCartMutation.mutateAsync)

  useEffect(() => {
    completeCartRef.current = completeCartMutation.mutateAsync
  }, [completeCartMutation.mutateAsync])

  useEffect(() => {
    if (!(isDebugEnabled && cartId !== null)) {
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
    isDebugEnabled,
  ])

  useEffect(() => {
    let retryTimeout: number | undefined
    let didCancel = false
    let attemptCount = 0
    const hasReturnError = returnError !== null && returnError.length > 0
    const shouldSkipCompletion =
      isCancelled || completedOrderId !== null || hasReturnError
    const activeCartId = shouldSkipCompletion ? null : cartId

    if (activeCartId !== null) {
      const scheduleRetryOrFail = (
        message: string,
        retryAttempt: () => Promise<void>,
      ) => {
        if (attemptCount >= MAX_PAYMENT_RETURN_ATTEMPTS) {
          setReturnError(
            resolvePaymentReturnFailureMessage(
              message,
              paymentNotCompletedMessage,
            ),
          )
          return
        }
        retryTimeout = window.setTimeout(() => {
          runDetachedPromise(retryAttempt())
        }, PAYMENT_RETURN_RETRY_DELAY_MS)
      }

      const completeReturnedPayment = async () => {
        attemptCount += 1
        try {
          logCheckoutAccountSetupDebug("payment return complete attempt", {
            attempt_count: attemptCount,
            cart_id: activeCartId,
            cart_metadata_requested:
              readAccountSetupRequested(debugCartMetadata),
          })
          const result = await completeCartRef.current({ cartId: activeCartId })
          if (didCancel) {
            return
          }
          const orderId = resolveOrderId(result)
          if (orderId !== null && orderId.length > 0) {
            logCheckoutAccountSetupDebug("payment return complete succeeded", {
              attempt_count: attemptCount,
              cart_id: activeCartId,
              order_id: orderId,
            })
            clearStoredPaymentProviderSelection(activeCartId)
            setCompletedOrderId(orderId)
            return
          }
          const failureMessage =
            resolveCompleteCartFailure(result) ?? confirmationPendingMessage
          scheduleRetryOrFail(failureMessage, completeReturnedPayment)
        } catch (error) {
          if (didCancel) {
            return
          }
          scheduleRetryOrFail(
            resolveErrorMessage(error, verificationFailedMessage),
            completeReturnedPayment,
          )
        }
      }
      runDetachedPromise(completeReturnedPayment())
    }

    return () => {
      didCancel = true
      if (retryTimeout !== undefined) {
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

  return {
    completedOrderId,
    isCompleting: completeCartMutation.isPending,
    retry: () => {
      setReturnError(null)
    },
    returnError,
  }
}
