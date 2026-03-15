import type { HttpTypes } from "@medusajs/types"

export interface AddressData {
  firstName: string
  lastName: string
  email: string
  phone: string
  street: string
  city: string
  postalCode: string
  country: string
  company?: string
}

export interface CheckoutAddressData {
  shipping: AddressData
  billing: AddressData
  useSameAddress: boolean
}

export interface ShippingMethod {
  id: string
  name: string
  description: string
  price: number
  priceFormatted: string
  delivery: string
  deliveryDate: string
  image: string
}

export interface PaymentMethod {
  id: string
  name: string
  fee: number
  image: string
}

export interface Country {
  label: string
  value: string
  [key: string]: unknown
}

export interface AddressFormProps {
  onComplete: (data: CheckoutAddressData) => void | Promise<void>
  sameData?: boolean
  isLoading?: boolean
}

export interface ReducedShippingMethod {
  id: string
  name: string
  calculated_price: HttpTypes.StoreCalculatedPrice
  provider_id?: string
  type_code?: string
}

// UseCheckout hook return type
export interface UseCheckoutReturn {
  // State
  currentStep: number
  selectedPayment: string
  selectedShipping: string
  addressData: CheckoutAddressData | null
  isProcessingPayment: boolean
  shippingMethods: ReducedShippingMethod[] | undefined
  paymentMethods: PaymentMethod[]
  isLoadingShipping: boolean

  // Actions
  setCurrentStep: (step: number) => void
  setSelectedPayment: (payment: string) => void
  setSelectedShipping: (shipping: string) => void
  setAddressData: (data: CheckoutAddressData) => void
  updateAddresses: (data: CheckoutAddressData) => Promise<void>
  addShippingMethod: (methodId: string) => Promise<void>
  processOrder: () => Promise<HttpTypes.StoreOrder | undefined>
  canProceedToStep: (step: number) => boolean
  // getShippingMethod: () => void
}

export interface FormUserData {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  company_name: string
}

export interface FormAddressData {
  street: string
  city: string
  postalCode: string
  country: string
}
