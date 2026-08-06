"use client"

import { useForm } from "@tanstack/react-form"
import { useRouter } from "next/navigation"
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react"
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
const useCheckoutFormShape = (values: CheckoutFormData) =>
  useForm({ defaultValues: values })

/** Form type for checkout - inferred from useForm return type */
type CheckoutForm = ReturnType<typeof useCheckoutFormShape>

interface InitialCheckoutState {
  defaultValues: CheckoutFormData
  selectedAddressId: string | null
}

interface CheckoutIdentity {
  cart: ReturnType<typeof useSuspenseCart>["cart"]
  customer: ReturnType<typeof useSuspenseAuth>["customer"]
}

const resolveInitialCheckoutState = ({
  cart,
  customer,
}: CheckoutIdentity): InitialCheckoutState => {
  const cartBillingAddress = cart?.billing_address

  if ((cartBillingAddress?.first_name ?? "") !== "") {
    const addressData = addressToFormData(cartBillingAddress)

    return {
      defaultValues: {
        billingAddress: addressData,
        email: cart?.email ?? customer?.email ?? "",
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

/**
 * Identity reducer: `useReducer` is the only stable-by-contract way left to
 * freeze a value that is computed once from the first render's cart and
 * customer. The resolved state must never change identity because `useForm`
 * re-applies `defaultValues` on every render.
 */
const keepInitialCheckoutState = (state: InitialCheckoutState) => state

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

/**
 * Owns every piece of checkout state the provider publishes.
 *
 * Kept separate from `CheckoutProvider` so the provider passes an already
 * assembled value down: this app runs with the React Compiler
 * (`reactCompiler: true`), which caches this hook's return value, so no manual
 * `useMemo`/`useCallback` is added here.
 */
const useCheckoutContextValue = (): CheckoutContextValue => {
  const router = useRouter()

  const { customer } = useSuspenseAuth()
  const { cart, hasItems } = useSuspenseCart()
  const { regionId } = useSuspenseRegion()

  const shipping = useCheckoutShipping(cart?.id, cart)
  const payment = useCheckoutPayment(cart?.id, regionId, cart)

  const [initialCheckoutState] = useReducer(
    keepInitialCheckoutState,
    { cart, customer },
    resolveInitialCheckoutState,
  )

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    initialCheckoutState.selectedAddressId,
  )
  const [error, setError] = useState<string | null>(null)

  const [selectedAccessPoint, setSelectedAccessPoint] =
    useState<PplAccessPointData | null>(null)
  const [isPickupDialogOpen, setIsPickupDialogOpen] = useState(false)
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null)

  // Check if selected shipping requires access point
  const selectedShippingOption = shipping.selectedOption
  const requiresAccessPoint =
    selectedShippingOption !== undefined &&
    isPPLParcelOption(selectedShippingOption.name)

  // Reset access point when switching to non-parcel shipping method.
  // The reset is load-bearing: `ShippingOptionCard` silently reuses a retained
  // access point instead of reopening the picker. Adjusting during render
  // (instead of from an effect) keeps the cleared value in the same commit as
  // the option change.
  const [appliedShippingOptionId, setAppliedShippingOptionId] = useState(
    selectedShippingOption?.id,
  )
  if (selectedShippingOption?.id !== appliedShippingOptionId) {
    setAppliedShippingOptionId(selectedShippingOption?.id)
    // If switched to non-parcel option, clear access point
    if (selectedShippingOption !== undefined && !requiresAccessPoint) {
      setSelectedAccessPoint(null)
    }
  }

  const openPickupDialog = (optionId: string) => {
    setPendingOptionId(optionId)
    setIsPickupDialogOpen(true)
  }

  const closePickupDialog = () => {
    setIsPickupDialogOpen(false)
    setPendingOptionId(null)
  }

  const { mutateAsync: updateCartAddressAsync, isPending: isSavingAddress } =
    useUpdateCartAddress()
  const { mutateAsync: completeCartAsync, isPending: isCompletingCart } =
    useCompleteCart({
      // A completion that fails validation or payment resolves instead of
      // rejecting, so without this the submit handler's catch never runs and
      // the shopper is left on a silent, unchanged form.
      onError: (completionError) => {
        const prefix =
          COMPLETION_RESULT_ERROR_PREFIX[completionError.type] ??
          DEFAULT_COMPLETION_ERROR_PREFIX

        setError(`${prefix}: ${completionError.message}`)
      },
      onSuccess: (order) => {
        router.push(`/orders/${order.id}?success=true`)
      },
    })

  const form = useForm({
    defaultValues: initialCheckoutState.defaultValues,
    onSubmit: async ({ value }: { value: CheckoutFormData }) => {
      const cartId = cart?.id ?? ""
      if (cartId === "") {
        setError("Košík nebyl nalezen")
        return
      }

      setError(null)

      const { email, billingAddress } = value

      // Determine shipping address based on delivery method
      // If PPL Parcel selected + access point → shipping = access point address
      // Otherwise → shipping = billing address
      const shippingAddress: AddressFormData =
        requiresAccessPoint && selectedAccessPoint !== null
          ? accessPointToAddress(selectedAccessPoint, billingAddress)
          : billingAddress

      // Save both addresses to cart
      const customerEmail = customer?.email ?? ""
      const cartEmail = customerEmail === "" ? (email ?? "") : customerEmail

      try {
        await updateCartAddressAsync({
          billingAddress,
          cartId,
          shippingAddress,
          ...(cartEmail === "" ? {} : { email: cartEmail }),
        })
      } catch (addressError) {
        if (CartAddressUpdateError.isCartAddressUpdateError(addressError)) {
          setError(
            `${ADDRESS_ERROR_PREFIX[addressError.code]}: ${addressError.message}`,
          )
        } else if (addressError instanceof Error) {
          setError(`${DEFAULT_ADDRESS_ERROR_PREFIX}: ${addressError.message}`)
        } else {
          setError(DEFAULT_ADDRESS_ERROR_PREFIX)
        }
        return
      }

      // Complete the cart
      try {
        await completeCartAsync({ cartId })
      } catch (completeError) {
        if (CartServiceError.isCartServiceError(completeError)) {
          setError(
            `${COMPLETION_ERROR_PREFIX[completeError.code] ?? DEFAULT_COMPLETION_ERROR_PREFIX}: ${completeError.message}`,
          )
        } else if (completeError instanceof Error) {
          setError(
            `${DEFAULT_COMPLETION_ERROR_PREFIX}: ${completeError.message}`,
          )
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
      (shipping.selectedShippingMethodId ?? "") === ""
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

  const completeCheckout = async () => {
    await form.handleSubmit()
  }

  const hasShippingMethod = (shipping.selectedShippingMethodId ?? "") !== ""
  const hasRequiredAccessPoint =
    !requiresAccessPoint || selectedAccessPoint !== null

  const isShippingReady =
    hasShippingMethod && hasRequiredAccessPoint && !shipping.isSettingShipping
  const isPaymentReady =
    payment.hasPaymentSessions && !payment.isInitiatingPayment
  const isReady = form.state.isValid && isShippingReady && isPaymentReady

  return {
    cart,
    closePickupDialog,
    completeCheckout,
    customer,
    error,
    form,
    hasItems,
    isCompleting: isSavingAddress || isCompletingCart,
    isPickupDialogOpen,
    isReady,
    openPickupDialog,
    payment,
    pendingOptionId,
    // PPL Parcel state
    selectedAccessPoint,
    selectedAddressId,
    setSelectedAccessPoint,
    setSelectedAddressId,
    shipping,
  }
}

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
  const contextValue = useCheckoutContextValue()

  return (
    <CheckoutContext.Provider value={contextValue}>
      {children}
    </CheckoutContext.Provider>
  )
}

export const useCheckoutContext = () => {
  const context = useContext(CheckoutContext)
  if (!context) {
    throw new Error("useCheckoutContext must be used within CheckoutProvider")
  }
  return context
}

export const useCheckoutForm = () => {
  const { form } = useCheckoutContext()
  return form
}
