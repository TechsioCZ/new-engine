"use client"

import { useForm } from "@tanstack/react-form"
import { StorefrontAddressValidationError } from "@techsio/storefront-data/shared/address"
import { useRouter } from "next/navigation"
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { useSuspenseAuth } from "@/hooks/use-auth"
import { useSuspenseCart } from "@/hooks/use-cart"
import { useCheckoutPayment } from "@/hooks/use-checkout-payment"
import { useCheckoutShipping } from "@/hooks/use-checkout-shipping"
import {
  type CompleteCheckoutError,
  useCompleteCheckout,
} from "@/hooks/use-complete-checkout"
import { useSuspenseRegion } from "@/hooks/use-region"
import { useUpdateCartAddress } from "@/hooks/use-update-cart-address"
import {
  accessPointToAddress,
  addressToFormData,
  DEFAULT_ADDRESS,
  getDefaultAddress,
  isPPLParcelOption,
  type PplAccessPointData,
} from "@/utils/address-helpers"
import type { AddressFormData } from "@/utils/address-validation"

export type CheckoutFormData = {
  email?: string
  billingAddress: AddressFormData
}

/** Helper to infer the correct form type - not actually called */
const _formTypeHelper = (d: CheckoutFormData) => useForm({ defaultValues: d })

/** Form type for checkout - inferred from useForm return type */
type CheckoutForm = ReturnType<typeof _formTypeHelper>

type InitialCheckoutState = {
  defaultValues: CheckoutFormData
  selectedAddressId: string | null
}

const includesMessagePart = (message: string, parts: string[]): boolean => {
  const normalizedMessage = message.toLowerCase()
  return parts.some((part) => normalizedMessage.includes(part))
}

const toCheckoutCompletionErrorMessage = (error: unknown): string => {
  if (!(error && typeof error === "object" && "stage" in error)) {
    return "Nepodařilo se dokončit objednávku"
  }

  const completeCheckoutError = error as CompleteCheckoutError

  switch (completeCheckoutError.stage) {
    case "cart":
      return "Košík nebyl nalezen"
    case "payment_provider":
      return "Není dostupný způsob platby"
    case "payment":
      return completeCheckoutError.message
        ? `Chyba platby: ${completeCheckoutError.message}`
        : "Nepodařilo se inicializovat platbu"
    case "complete":
      if (
        includesMessagePart(completeCheckoutError.message, ["payment", "platb"])
      ) {
        return `Chyba platby: ${completeCheckoutError.message}`
      }

      if (
        includesMessagePart(completeCheckoutError.message, ["stock", "sklad"])
      ) {
        return `Některé produkty nejsou skladem: ${completeCheckoutError.message}`
      }

      return completeCheckoutError.message
        ? `Nepodařilo se dokončit objednávku: ${completeCheckoutError.message}`
        : "Nepodařilo se dokončit objednávku"
    default:
      return "Nepodařilo se dokončit objednávku"
  }
}

const resolveInitialCheckoutState = (
  cart: ReturnType<typeof useSuspenseCart>["cart"],
  customer: ReturnType<typeof useSuspenseAuth>["customer"]
): InitialCheckoutState => {
  if (cart?.billing_address?.first_name) {
    const addressData = addressToFormData(cart.billing_address)

    return {
      defaultValues: {
        email: cart.email ?? customer?.email ?? "",
        billingAddress: addressData,
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
          email: customer?.email ?? "",
          billingAddress: addressData,
        },
        selectedAddressId: defaultAddress.id,
      }
    }
  }

  return {
    defaultValues: {
      email: customer?.email ?? "",
      billingAddress: DEFAULT_ADDRESS,
    },
    selectedAddressId: null,
  }
}

type CheckoutContextValue = {
  form: CheckoutForm
  cart: ReturnType<typeof useSuspenseCart>["cart"]
  hasItems: boolean
  shipping: ReturnType<typeof useCheckoutShipping>
  payment: ReturnType<typeof useCheckoutPayment>
  customer: ReturnType<typeof useSuspenseAuth>["customer"]
  selectedAddressId: string | null
  setSelectedAddressId: (id: string | null) => void
  completeCheckout: () => void
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
  const {
    mutateAsync: completeCheckoutAsync,
    isPending: isCompletingCheckout,
  } = useCompleteCheckout(
    {
      cartId: cart?.id,
      cart,
      regionId,
      enabled: Boolean(cart?.id),
    },
    {
      onSuccess: ({ order }) => {
        router.push(`/orders/${order.id}?success=true`)
      },
    }
  )

  const initialStateRef = useRef<InitialCheckoutState | null>(null)
  if (!initialStateRef.current) {
    initialStateRef.current = resolveInitialCheckoutState(cart, customer)
  }

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    initialStateRef.current.selectedAddressId
  )
  const [error, setError] = useState<string | null>(null)

  const [selectedAccessPoint, setSelectedAccessPoint] =
    useState<PplAccessPointData | null>(null)
  const [isPickupDialogOpen, setIsPickupDialogOpen] = useState(false)
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null)
  const hasAutoSelectedShippingRef = useRef(false)

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
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: checkout flow includes many validation branches
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
          billingAddress
        )
      } else {
        shippingAddress = billingAddress
      }

      // Save both addresses to cart
      try {
        const cartEmail = customer?.email || email
        await updateCartAddressAsync({
          cartId: cart.id,
          region_id: regionId,
          billingAddress,
          shippingAddress,
          email: cartEmail,
        })
      } catch (err) {
        if (err instanceof StorefrontAddressValidationError) {
          const firstIssue = err.issues[0]
          if (firstIssue?.scope === "billing") {
            setError(
              `Chyba fakturační adresy: ${firstIssue.message ?? err.message}`
            )
          } else if (firstIssue?.scope === "shipping") {
            setError(
              `Chyba doručovací adresy: ${firstIssue.message ?? err.message}`
            )
          } else {
            setError(`Neplatná adresa: ${firstIssue?.message ?? err.message}`)
          }
        } else if (err instanceof Error) {
          if (
            err.message.includes("billing") ||
            err.message.includes("faktur")
          ) {
            setError(`Chyba fakturační adresy: ${err.message}`)
          } else if (
            err.message.includes("shipping") ||
            err.message.includes("doruč")
          ) {
            setError(`Chyba doručovací adresy: ${err.message}`)
          } else if (err.message.includes("Validation")) {
            setError(`Neplatná adresa: ${err.message}`)
          } else {
            setError(`Nepodařilo se uložit adresu: ${err.message}`)
          }
        } else {
          setError("Nepodařilo se uložit adresu")
        }
        return
      }

      try {
        await completeCheckoutAsync({
          paymentProviderId:
            cart.payment_collection?.payment_sessions?.[0]?.provider_id,
        })
      } catch (err) {
        setError(toCheckoutCompletionErrorMessage(err))
      }
    },
  })

  // Auto-select PPL Private as default.
  // Other manual_manual options are currently exposed by backend config,
  // but fail when applied to the cart.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset auto-selected shipping when cart changes
  useEffect(() => {
    hasAutoSelectedShippingRef.current = false
  }, [cart?.id])

  useEffect(() => {
    if (hasAutoSelectedShippingRef.current) {
      return
    }

    if (
      shipping.shippingOptions &&
      shipping.shippingOptions.length > 0 &&
      !shipping.selectedShippingMethodId
    ) {
      const pplPrivate = shipping.shippingOptions.find((opt) =>
        opt.name.toLowerCase().includes("ppl private")
      )
      if (pplPrivate) {
        hasAutoSelectedShippingRef.current = true
        shipping.setShipping(pplPrivate.id)
      }
    }

    if (shipping.selectedShippingMethodId) {
      hasAutoSelectedShippingRef.current = true
    }
  }, [
    shipping.shippingOptions,
    shipping.selectedShippingMethodId,
    shipping.setShipping,
  ])

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

  const completeCheckout = () => {
    form.handleSubmit()
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
    isCompleting: isSavingAddress || isCompletingCheckout,
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
