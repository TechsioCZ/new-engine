"use client"

import { resolveErrorMessage } from "@/lib/storefront/error-utils"

import {
  buildAccountSetupRequestedMetadata,
  readAccountSetupRequested,
} from "./account-setup-metadata"
import { logCheckoutAccountSetupDebug } from "./checkout-account-setup-debug"
import type { CheckoutRuntime } from "./use-checkout-controller-actions"
import type { CheckoutDetailsFormController } from "./use-checkout-details-form"

interface UseCheckoutCompletionControllerProps {
  checkoutDetailsForm: CheckoutDetailsFormController
  completeOrder: () => Promise<void>
  runtime: CheckoutRuntime
}

export const useCheckoutCompletionController = ({
  checkoutDetailsForm,
  completeOrder,
  runtime,
}: UseCheckoutCompletionControllerProps) => {
  const {
    authQuery,
    cartQuery,
    setCheckoutError,
    tCheckout,
    updateCartMutation,
  } = runtime

  const syncAccountSetupPreference = async () => {
    const { cart } = cartQuery
    if (cart?.id === undefined || cart.id.length === 0) {
      setCheckoutError(tCheckout("cart_not_ready"))
      return false
    }
    const requested =
      !authQuery.isAuthenticated &&
      checkoutDetailsForm.values.accountSetupRequested
    logCheckoutAccountSetupDebug("complete order metadata sync entered", {
      cart_id: cart.id,
      current_metadata_requested: readAccountSetupRequested(cart.metadata),
      form_requested: checkoutDetailsForm.values.accountSetupRequested,
      is_authenticated: authQuery.isAuthenticated,
      requested,
    })
    if (readAccountSetupRequested(cart.metadata) === requested) {
      logCheckoutAccountSetupDebug("complete order metadata already synced", {
        cart_id: cart.id,
        requested,
      })
      return true
    }

    try {
      const updatedCart = await updateCartMutation.mutateAsync({
        cartId: cart.id,
        metadata: buildAccountSetupRequestedMetadata(cart.metadata, requested),
      })
      logCheckoutAccountSetupDebug("complete order metadata sync response", {
        cart_id: updatedCart.id,
        response_metadata_requested: readAccountSetupRequested(
          updatedCart.metadata,
        ),
      })
      return true
    } catch (error) {
      setCheckoutError(
        resolveErrorMessage(error, tCheckout("registration_update_failed")),
      )
      return false
    }
  }

  return async () => {
    const didSyncAccountSetup = await syncAccountSetupPreference()
    logCheckoutAccountSetupDebug("handle complete order sync verdict", {
      did_sync_account_setup: didSyncAccountSetup,
    })
    if (didSyncAccountSetup) {
      await completeOrder()
    }
  }
}
