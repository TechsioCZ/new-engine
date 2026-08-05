"use client"

import { useForm } from "@tanstack/react-form"
import { useRouter } from "next/navigation"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"

import { useSuspenseAuth } from "@/hooks/use-auth"
import { useCompleteCart, useSuspenseCart } from "@/hooks/use-cart"
import { useCheckoutPayment } from "@/hooks/use-checkout-payment"
import { useCheckoutShipping } from "@/hooks/use-checkout-shipping"
import { useSuspenseRegion } from "@/hooks/use-region"
import { useUpdateCartAddress } from "@/hooks/use-update-cart-address"
import { CartAddressUpdateError, CartServiceError } from "@/lib/errors"
import type {
  CartAddressUpdateErrorCode,
  CartServiceErrorCode,
} from "@/lib/errors"
import {
  accessPointToAddress,
  addressToFormData,
  DEFAULT_ADDRESS,
  getDefaultAddress,
  isPPLParcelOption,
} from "@/utils/address-helpers"
import type { PplAccessPointData } from "@/utils/address-helpers"
import type { AddressFormData } from "@/utils/address-validation"

/**
 * User-facing prefixes keyed by the error code the address mutation reports.
 * Branching on the code keeps the copy stable when the underlying Medusa
 * message text is reworded or localized.
 */
const DEFAULT_ADDRESS_ERROR_PREFIX = "Nepodařilo se uložit adresu"
const ADDRESS_ERROR_PREFIX: Record<CartAddressUpdateErrorCode, string> = {
  ADDRESS_UPDATE_REJECTED: DEFAULT_ADDRESS_ERROR_PREFIX,
  BILLING_ADDRESS_INVALID: "Neplatná adresa",
}

/**
 * User-facing prefixes keyed by `CartServiceError.code`.
 *
 * `completeCart` only ever rejects with `ORDER_CREATION_FAILED` or with the
 * code `CartServiceError.fromMedusaError` derives from the HTTP status, so the
 * payment and inventory codes never reach this branch. Medusa reports those as
 * a resolved `success: false` result instead, attributed below.
 */
const DEFAULT_COMPLETION_ERROR_PREFIX = "Nepodařilo se dokončit objednávku"
const COMPLETION_ERROR_PREFIX: Partial<Record<CartServiceErrorCode, string>> = {
  CART_NOT_FOUND: "Košík nebyl nalezen",
  NETWORK_ERROR: "Chyba spojení se serverem",
  VALIDATION_ERROR: "Objednávka obsahuje neplatné údaje",
}

/**
 * User-facing prefixes keyed by the `MedusaError` type the store API reports on
 * a completion that fails without rejecting. Only the payment types carry a
 * stable discriminator here; insufficient inventory travels as a `code` the
 * store response does not expose, so it falls back to the default copy.
 */
const COMPLETION_RESULT_ERROR_PREFIX: Record<string, string> = {
  payment_authorization_error: "Chyba platby",
  payment_requires_more_error: "Platba vyžaduje dodatečné potvrzení",
}

export interface CheckoutFormData {
  email?: string
  billingAddress: AddressFormData
}

/** Helper to infer the correct form type - not actually called */
const _formTypeHelper = (d: CheckoutFormData) => useForm({ defaultValues: d })

/** Form type for checkout - inferred from useForm return type */
type CheckoutForm = ReturnType<typeof _formTypeHelper>

interface InitialCheckoutState {
  defaultValues: CheckoutFormData
  selectedAddressId: string | null
}

const resolveInitialCheckoutState = (
  cart: ReturnType<typeof useSuspenseCart>["cart"],
  customer: ReturnType<typeof useSuspenseAuth>["customer"],
): InitialCheckoutState => {
  if (cart?.billing_address?.first_name) {
    const addressData = addressToFormData(cart.billing_address)

    return {
      defaultValues: {
        billingAddress: addressData,
        email: cart.email ?? customer?.email ?? "",
      },
      selectedAddressId: null,
    }
  }

  if (customer?.addresses && customer.addresses.length > 0) {
    const defaultAddress = getDefaultAddress(customer.addresses)
    if (defaultAddress) {
      const addressData = addressToFormData(defaultAddress)
      return {
        defaultValues: {
          billingAddress: addressData,
          email: customer?.email ?? "",
        },
        selectedAddressId: defaultAddress.id,
      }
    }
  }

  return {
    defaultValues: {
      billingAddress: DEFAULT_ADDRESS,
      email: customer?.email ?? "",
    },
    selectedAddressId: null,
  }
}

interface CheckoutContextValue {
  form: CheckoutForm
  cart: ReturnType<typeof useSuspenseCart>["cart"]
  hasItems: boolean
  shipping: ReturnType<typeof useCheckoutShipping>
  payment: ReturnType<typeof useCheckoutPayment>
  customer: ReturnType<typeof useSuspenseAuth>["customer"]
  selectedAddressId: string | null
  setSelectedAddressId: (id: string | null) => void
  completeCheckout: () => Promise<void>
  isCompleting: boolean
  error: string | null
  isReady: boolean
  // PPL Parcel state
  selectedAccessPoint: PplAccessPointData | null
  setSelectedAccessPoint: (accessPoint: PplAccessPointData | null) => void
  isPickupDialogOpen: boolean
  openPickupDialog: (optionId: string) => void
  closePickupDialog: () => void
  pendingOptionId: string | null
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null)

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const router = useRouter()

  const { customer } = useSuspenseAuth()
  const { cart, hasItems } = useSuspenseCart()
  const { regionId } = useSuspenseRegion()

  const shipping = useCheckoutShipping(cart?.id, cart)
  const payment = useCheckoutPayment(cart?.id, regionId, cart)

  const { mutateAsync: updateCartAddressAsync, isPending: isSavingAddress } =
    useUpdateCartAddress()
  const { mutateAsync: completeCartAsync, isPending: isCompletingCart } =
    useCompleteCart({
      onSuccess: (order) => {
        router.push(`/orders/${order.id}?success=true`)
      },
      // A completion that fails validation or payment resolves instead of
      // rejecting, so without this the submit handler's catch never runs and
      // the shopper is left on a silent, unchanged form.
      onError: (completionError) => {
        const prefix =
          COMPLETION_RESULT_ERROR_PREFIX[completionError.type] ??
          DEFAULT_COMPLETION_ERROR_PREFIX

        setError(`${prefix}: ${completionError.message}`)
      },
    })

  const initialStateRef = useRef<InitialCheckoutState | null>(null)
  if (!initialStateRef.current) {
    initialStateRef.current = resolveInitialCheckoutState(cart, customer)
  }

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    initialStateRef.current.selectedAddressId,
  )
  const [error, setError] = useState<string | null>(null)

  const [selectedAccessPoint, setSelectedAccessPoint] =
    useState<PplAccessPointData | null>(null)
  const [isPickupDialogOpen, setIsPickupDialogOpen] = useState(false)
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null)

  const openPickupDialog = (optionId: string) => {
    setPendingOptionId(optionId)
    setIsPickupDialogOpen(true)
  }

  const closePickupDialog = () => {
    setIsPickupDialogOpen(false)
    setPendingOptionId(null)
  }

  const form = useForm({
    defaultValues: initialStateRef.current.defaultValues,
    onSubmit: async ({ value }: { value: CheckoutFormData }) => {
      if (!cart?.id) {
        setError("Košík nebyl nalezen")
        return
      }

      setError(null)

      const { email, billingAddress } = value

      // Determine shipping address based on delivery method
      // If PPL Parcel selected + access point → shipping = access point address
      // Otherwise → shipping = billing address
      const isPplParcel =
        shipping.selectedOption &&
        isPPLParcelOption(shipping.selectedOption.name)

      let shippingAddress: AddressFormData
      if (isPplParcel && selectedAccessPoint) {
        shippingAddress = accessPointToAddress(
          selectedAccessPoint,
          billingAddress,
        )
      } else {
        shippingAddress = billingAddress
      }

      // Save both addresses to cart
      try {
        const cartEmail = customer?.email || email
        await updateCartAddressAsync({
          billingAddress,
          cartId: cart.id,
          shippingAddress,
          ...(cartEmail ? { email: cartEmail } : {}),
        })
      } catch (error) {
        if (CartAddressUpdateError.isCartAddressUpdateError(error)) {
          setError(`${ADDRESS_ERROR_PREFIX[error.code]}: ${error.message}`)
        } else if (error instanceof Error) {
          setError(`${DEFAULT_ADDRESS_ERROR_PREFIX}: ${error.message}`)
        } else {
          setError(DEFAULT_ADDRESS_ERROR_PREFIX)
        }
        return
      }

      // Complete the cart
      try {
        await completeCartAsync({ cartId: cart.id })
      } catch (error) {
        if (CartServiceError.isCartServiceError(error)) {
          setError(
            `${COMPLETION_ERROR_PREFIX[error.code] ?? DEFAULT_COMPLETION_ERROR_PREFIX}: ${error.message}`,
          )
        } else if (error instanceof Error) {
          setError(`${DEFAULT_COMPLETION_ERROR_PREFIX}: ${error.message}`)
        } else {
          setError(DEFAULT_COMPLETION_ERROR_PREFIX)
        }
      }
    },
  })

  // Auto-select PPL Private as default (PPL Parcel requires dialog)
  // NOTE: Options 0-6 use manual_manual provider which is disabled on backend
  useEffect(() => {
    if (
      shipping.shippingOptions &&
      shipping.shippingOptions.length > 0 &&
      !shipping.selectedShippingMethodId
    ) {
      // Find PPL Private option (doesn't require access point selection)
      const pplPrivate = shipping.shippingOptions.find((opt) =>
        opt.name.toLowerCase().includes("ppl private"),
      )
      if (pplPrivate) {
        shipping.setShipping(pplPrivate.id)
      }
      // Don't auto-select if no PPL Private found - let user choose manually
    }
  }, [shipping.shippingOptions, shipping.selectedShippingMethodId, shipping])

  // Reset access point when switching to non-parcel shipping method
  useEffect(() => {
    // If switched to non-parcel option, clear access point
    if (
      shipping.selectedOption &&
      !isPPLParcelOption(shipping.selectedOption.name)
    ) {
      setSelectedAccessPoint(null)
    }
  }, [shipping.selectedOption])

  const completeCheckout = async () => {
    await form.handleSubmit()
  }

  // Check if selected shipping requires access point
  const requiresAccessPoint =
    shipping.selectedOption && isPPLParcelOption(shipping.selectedOption.name)
  const hasRequiredAccessPoint = !requiresAccessPoint || !!selectedAccessPoint

  const isReady =
    form.state.isValid &&
    !!shipping.selectedShippingMethodId &&
    hasRequiredAccessPoint &&
    payment.hasPaymentSessions &&
    !shipping.isSettingShipping &&
    !payment.isInitiatingPayment

  const contextValue: CheckoutContextValue = {
    form,
    cart,
    hasItems,
    shipping,
    payment,
    customer,
    selectedAddressId,
    setSelectedAddressId,
    completeCheckout,
    isCompleting: isSavingAddress || isCompletingCart,
    error,
    isReady,
    // PPL Parcel state
    selectedAccessPoint,
    setSelectedAccessPoint,
    isPickupDialogOpen,
    openPickupDialog,
    closePickupDialog,
    pendingOptionId,
  }

  return (
    <CheckoutContext.Provider value={contextValue}>
      {children}
    </CheckoutContext.Provider>
  )
}

export function useCheckoutContext() {
  const context = useContext(CheckoutContext)
  if (!context) {
    throw new Error("useCheckoutContext must be used within CheckoutProvider")
  }
  return context
}

export function useCheckoutForm() {
  const { form } = useCheckoutContext()
  return form
}
