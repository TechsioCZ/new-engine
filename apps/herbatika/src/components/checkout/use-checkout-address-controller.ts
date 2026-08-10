"use client"

import { useRef } from "react"

import { resolveEffectiveCheckoutAddressDetails } from "@/lib/forms/checkout/address.form"
import { buildHerbatikaCheckoutAddressInput } from "@/lib/storefront/cart/address-adapter"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"

import {
  buildAccountSetupRequestedMetadata,
  readAccountSetupRequested,
} from "./account-setup-metadata"
import { logCheckoutAccountSetupDebug } from "./checkout-account-setup-debug"
import { isCheckoutCountryAvailableForRegion } from "./checkout.constants"
import type { CheckoutRuntime } from "./use-checkout-controller-actions"
import { useCheckoutDetailsForm } from "./use-checkout-details-form"

export const useCheckoutAddressController = (
  runtime: CheckoutRuntime,
  resetFeedback: () => void,
) => {
  const {
    activeRegionId,
    authQuery,
    cartQuery,
    region,
    regionsQuery,
    setCheckoutError,
    tCheckout,
    updateCartAddressMutation,
  } = runtime
  const saveAddressSucceededRef = useRef(false)
  const checkoutDetailsForm = useCheckoutDetailsForm({
    cart: cartQuery.cart,
    customer: authQuery.customer,
    isCartLoading: cartQuery.isLoading,
    isCustomerLoading: authQuery.isLoading,
    onSubmit: async (values) => {
      if (cartQuery.cart?.id === undefined || cartQuery.cart.id.length === 0) {
        setCheckoutError(tCheckout("cart_not_ready"))
        return
      }
      const details = resolveEffectiveCheckoutAddressDetails(values)
      const countryAvailabilityInput = {
        ...(region?.country_code === undefined
          ? {}
          : { activeCountryCode: region.country_code }),
        ...(activeRegionId === undefined ? {} : { regionId: activeRegionId }),
        regions: regionsQuery.regions,
      }
      const hasSupportedShippingCountry = isCheckoutCountryAvailableForRegion({
        ...countryAvailabilityInput,
        countryCode: details.shipping.countryCode,
      })
      const hasSupportedBillingCountry = isCheckoutCountryAvailableForRegion({
        ...countryAvailabilityInput,
        countryCode: details.billing.countryCode,
      })
      if (!(hasSupportedShippingCountry && hasSupportedBillingCountry)) {
        setCheckoutError(tCheckout("country_unavailable"))
        return
      }

      try {
        const metadata = buildAccountSetupRequestedMetadata(
          cartQuery.cart.metadata,
          !authQuery.isAuthenticated && values.accountSetupRequested,
        )
        logCheckoutAccountSetupDebug("address submit update cart request", {
          cart_id: cartQuery.cart.id,
          current_metadata_requested: readAccountSetupRequested(
            cartQuery.cart.metadata,
          ),
          form_requested: values.accountSetupRequested,
          is_authenticated: authQuery.isAuthenticated,
          payload_metadata_requested: readAccountSetupRequested(metadata),
        })
        const updatedCart = await updateCartAddressMutation.mutateAsync({
          billingAddress: {
            ...buildHerbatikaCheckoutAddressInput(details.billing),
          },
          cartId: cartQuery.cart.id,
          email: values.shipping.email.trim(),
          metadata,
          shippingAddress: {
            ...buildHerbatikaCheckoutAddressInput(details.shipping),
          },
          useSameAddress: details.useSameAddress,
        })
        logCheckoutAccountSetupDebug("address submit update cart response", {
          cart_id: updatedCart.id,
          response_metadata_requested: readAccountSetupRequested(
            updatedCart.metadata,
          ),
        })
        saveAddressSucceededRef.current = true
      } catch (error) {
        setCheckoutError(
          resolveErrorMessage(error, tCheckout("address_update_failed")),
        )
      }
    },
    ...(region?.country_code === undefined
      ? {}
      : { regionCountryCode: region.country_code }),
  })

  const handleSaveAddress = async () => {
    resetFeedback()
    saveAddressSucceededRef.current = false
    await checkoutDetailsForm.form.handleSubmit()
    if (saveAddressSucceededRef.current) {
      checkoutDetailsForm.resetToValues(checkoutDetailsForm.form.state.values)
    }
    return saveAddressSucceededRef.current
  }

  return { checkoutDetailsForm, handleSaveAddress }
}
