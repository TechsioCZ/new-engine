"use client"

import type { HttpTypes } from "@medusajs/types"
import { useEffect, useRef } from "react"

import { resolveEffectiveCheckoutAddressDetails } from "@/lib/forms/checkout/address.form"
import { useUpdateCart, useUpdateCartAddress } from "@/lib/storefront/cart"
import { buildHerbatikaCheckoutAddressInput } from "@/lib/storefront/cart/address-adapter"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"

import {
  buildAccountSetupRequestedMetadata,
  readAccountSetupRequested,
} from "./account-setup-metadata"
import { logCheckoutAccountSetupDebug } from "./checkout-account-setup-debug"
import { isCheckoutCountryAvailableForRegion } from "./checkout.constants"
import { useCheckoutDetailsForm } from "./use-checkout-details-form"

type CountryAvailabilityParams = Parameters<
  typeof isCheckoutCountryAvailableForRegion
>[0]

type UseCheckoutAddressDetailsProps = {
  activeCountryCode?: string
  activeRegionId?: string
  cart: HttpTypes.StoreCart | null | undefined
  customer: HttpTypes.StoreCustomer | null | undefined
  isAuthenticated: boolean
  isCartLoading: boolean
  isCustomerLoading: boolean
  regions: CountryAvailabilityParams["regions"]
  resetFeedback: () => void
  setCheckoutError: (message: string | null) => void
}

export function useCheckoutAddressDetails({
  activeCountryCode,
  activeRegionId,
  cart,
  customer,
  isAuthenticated,
  isCartLoading,
  isCustomerLoading,
  regions,
  resetFeedback,
  setCheckoutError,
}: UseCheckoutAddressDetailsProps) {
  const saveAddressSucceededRef = useRef(false)
  const updateCartAddressMutation = useUpdateCartAddress()
  const updateCartMutation = useUpdateCart()
  const cartId = cart?.id
  const cartCountryCode = cart?.shipping_address?.country_code?.toLowerCase()
  const mutateCart = updateCartMutation.mutate

  useEffect(() => {
    const countryCode = activeCountryCode?.toLowerCase()
    if (!(cartId && countryCode)) {
      return
    }
    if (
      cartCountryCode ||
      updateCartAddressMutation.isPending ||
      updateCartMutation.isPending
    ) {
      return
    }

    mutateCart({ cartId, country_code: countryCode })
  }, [
    activeCountryCode,
    cartCountryCode,
    cartId,
    mutateCart,
    updateCartAddressMutation.isPending,
    updateCartMutation.isPending,
  ])

  const checkoutDetailsForm = useCheckoutDetailsForm({
    cart,
    customer,
    isCartLoading,
    isCustomerLoading,
    onSubmit: async (values) => {
      if (!cart?.id) {
        setCheckoutError("Košík nie je pripravený.")
        return
      }

      const effectiveDetails = resolveEffectiveCheckoutAddressDetails(values)
      const countryParams = {
        ...(activeCountryCode === undefined ? {} : { activeCountryCode }),
        ...(activeRegionId === undefined ? {} : { regionId: activeRegionId }),
        regions,
      }
      const hasSupportedShippingCountry = isCheckoutCountryAvailableForRegion({
        ...countryParams,
        countryCode: effectiveDetails.shipping.countryCode,
      })
      const hasSupportedBillingCountry = isCheckoutCountryAvailableForRegion({
        ...countryParams,
        countryCode: effectiveDetails.billing.countryCode,
      })

      if (!(hasSupportedShippingCountry && hasSupportedBillingCountry)) {
        setCheckoutError(
          "Zvolena krajina nie je dostupna pre aktualny kosik. Zvolte krajinu z ponuky."
        )
        return
      }

      try {
        const metadata = buildAccountSetupRequestedMetadata(
          cart.metadata,
          !isAuthenticated && values.accountSetupRequested
        )
        logCheckoutAccountSetupDebug("address submit update cart request", {
          cart_id: cart.id,
          current_metadata_requested: readAccountSetupRequested(cart.metadata),
          form_requested: values.accountSetupRequested,
          is_authenticated: isAuthenticated,
          payload_metadata_requested: readAccountSetupRequested(metadata),
        })
        const updatedCart = await updateCartAddressMutation.mutateAsync({
          cartId: cart.id,
          email: values.shipping.email.trim(),
          metadata,
          shippingAddress: buildHerbatikaCheckoutAddressInput(
            effectiveDetails.shipping
          ),
          billingAddress: buildHerbatikaCheckoutAddressInput(
            effectiveDetails.billing
          ),
          useSameAddress: effectiveDetails.useSameAddress,
        })
        logCheckoutAccountSetupDebug("address submit update cart response", {
          cart_id: updatedCart.id,
          response_metadata_requested: readAccountSetupRequested(
            updatedCart.metadata
          ),
        })
        saveAddressSucceededRef.current = true
      } catch (error) {
        setCheckoutError(resolveErrorMessage(error, "Uloženie adresy zlyhalo."))
      }
    },
    ...(activeCountryCode === undefined
      ? {}
      : { regionCountryCode: activeCountryCode }),
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

  const syncAccountSetupPreference = async () => {
    if (!cart?.id) {
      setCheckoutError("Košík nie je pripravený.")
      return false
    }

    const requested =
      !isAuthenticated && checkoutDetailsForm.values.accountSetupRequested
    logCheckoutAccountSetupDebug("complete order metadata sync entered", {
      cart_id: cart.id,
      current_metadata_requested: readAccountSetupRequested(cart.metadata),
      form_requested: checkoutDetailsForm.values.accountSetupRequested,
      is_authenticated: isAuthenticated,
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
          updatedCart.metadata
        ),
      })
      return true
    } catch (error) {
      setCheckoutError(
        resolveErrorMessage(error, "Uloženie registrácie zlyhalo.")
      )
      return false
    }
  }

  return {
    checkoutDetailsForm,
    handleSaveAddress,
    syncAccountSetupPreference,
    updateCartAddressMutation,
    updateCartMutation,
  }
}
