import type { QueryKey } from "../shared/query-keys"

/**
 * Mutation options with full TanStack Query lifecycle support
 * Enables optimistic updates via onMutate returning context
 */
export type CheckoutMutationOptions<
  TData,
  TVariables,
  TContext = unknown,
> = {
  /** Called before mutation, return value becomes context */
  onMutate?: (variables: TVariables) => Promise<TContext> | TContext
  /** Called on success with context from onMutate */
  onSuccess?: (
    data: TData,
    variables: TVariables,
    context: TContext | undefined
  ) => void
  /** Called on error with context from onMutate (for rollback) */
  onError?: (
    error: unknown,
    variables: TVariables,
    context: TContext | undefined
  ) => void
  /** Called after mutation completes (success or error) */
  onSettled?: (
    data: TData | undefined,
    error: unknown | null,
    variables: TVariables,
    context: TContext | undefined
  ) => void
}

export type ShippingOptionLike = {
  id: string
  price_type?: string | null
  amount?: number | null
}

export type CheckoutCartLike = {
  id: string
  region_id?: string | null
  shipping_methods?: { shipping_option_id?: string }[]
  payment_collection?: { payment_sessions?: unknown[] }
}

export type CheckoutShippingInputBase = {
  cartId?: string
  enabled?: boolean
  cacheKey?: string
}

export type CheckoutPaymentInputBase = {
  cartId?: string
  regionId?: string
  enabled?: boolean
}

export type CheckoutService<
  TCart,
  TShippingOption,
  TPaymentProvider,
  TPaymentCollection,
  TCompleteResult,
> = {
  listShippingOptions: (
    cartId: string,
    signal?: AbortSignal
  ) => Promise<TShippingOption[]>
  calculateShippingOption?: (
    optionId: string,
    input: { cart_id: string; data?: Record<string, unknown> },
    signal?: AbortSignal
  ) => Promise<TShippingOption>
  addShippingMethod: (
    cartId: string,
    optionId: string,
    data?: Record<string, unknown>
  ) => Promise<TCart>
  listPaymentProviders: (
    regionId: string,
    signal?: AbortSignal
  ) => Promise<TPaymentProvider[]>
  initiatePaymentSession: (
    cartId: string,
    providerId: string,
    cart?: TCart | null
  ) => Promise<TPaymentCollection>
  completeCart?: (cartId: string) => Promise<TCompleteResult>
}

export type CheckoutQueryKeys = {
  all: () => QueryKey
  shippingOptions: (cartId: string, cacheKey?: string) => QueryKey
  shippingOptionPrice: (params: {
    cartId: string
    optionId: string
    data?: Record<string, unknown>
  }) => QueryKey
  paymentProviders: (regionId: string) => QueryKey
}

export type UseCheckoutShippingResult<TShippingOption, TCart = unknown> = {
  shippingOptions: TShippingOption[]
  shippingPrices: Record<string, number>
  isLoading: boolean
  isFetching: boolean
  isCalculating: boolean
  setShippingMethod: (optionId: string, data?: Record<string, unknown>) => void
  setShippingMethodAsync: (
    optionId: string,
    data?: Record<string, unknown>
  ) => Promise<TCart>
  isSettingShipping: boolean
  selectedShippingMethodId?: string
  selectedOption?: TShippingOption
}

export type UseCheckoutPaymentResult<
  TPaymentProvider,
  TPaymentCollection = unknown,
> = {
  paymentProviders: TPaymentProvider[]
  initiatePayment: (providerId: string) => void
  initiatePaymentAsync: (providerId: string) => Promise<TPaymentCollection>
  isInitiatingPayment: boolean
  isLoading: boolean
  isFetching: boolean
  canInitiatePayment: boolean
  hasPaymentCollection: boolean
  hasPaymentSessions: boolean
}
