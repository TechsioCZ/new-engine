import type { HttpTypes } from "@medusajs/types"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"

import { useCartToast } from "@/hooks/use-toast"
import { CACHE_TIMES } from "@/lib/constants"
import { CartServiceError } from "@/lib/errors"
import { queryKeys } from "@/lib/query-keys"
import {
  createPaymentCollection,
  getPaymentProviders,
} from "@/services/cart-service"
import type { Cart } from "@/services/cart-service"

interface CartMutationError {
  message: string
  code?: string
}

interface UseCheckoutPaymentReturn {
  paymentProviders?: HttpTypes.StorePaymentProvider[]
  initiatePayment: (providerId: string) => void
  isInitiatingPayment: boolean
  canInitiatePayment: boolean
  hasPaymentCollection: boolean
  hasPaymentSessions: boolean
}

export function useCheckoutPayment(
  cartId?: string,
  regionId?: string,
  cart?: Cart | null
): UseCheckoutPaymentReturn {
  const queryClient = useQueryClient()
  const toast = useCartToast()

  const canLoadProviders = !!regionId

  // Fetch available payment providers for region
  const { data: paymentProviders } = useSuspenseQuery({
    queryFn: () => {
      if (!(canLoadProviders && regionId)) {
        return []
      }
      return getPaymentProviders(regionId)
    },
    queryKey: queryKeys.payment.providers(regionId || "unknown"),
    staleTime: CACHE_TIMES.PAYMENT_PROVIDERS_STALE,
  })

  // Initiate payment collection mutation
  const { mutate: initiatePayment, isPending: isInitiatingPayment } =
    useMutation<
      HttpTypes.StorePaymentCollectionResponse,
      CartMutationError,
      string
    >({
      mutationFn: async (providerId: string) => {
        if (!cartId) {
          throw new CartServiceError("Cart ID je povinné", "VALIDATION_ERROR")
        }
        if (!providerId) {
          throw new CartServiceError(
            "Provider ID je povinné",
            "VALIDATION_ERROR"
          )
        }
        return createPaymentCollection(cartId, providerId)
      },
      onError: (error) => {
        if (process.env.NODE_ENV === "development") {
          console.error(
            "[useCheckoutPayment] Failed to initiate payment:",
            error
          )
        }

        // Show error toast
        toast.paymentInitiatedError()
      },
      onSuccess: async () => {
        // Refresh cart to get payment collection
        await queryClient.invalidateQueries({
          queryKey: queryKeys.cart.active(),
        })
        if (process.env.NODE_ENV === "development") {
          console.log("[useCheckoutPayment] Payment collection created")
        }
      },
    })

  const hasShippingMethod = !!cart?.shipping_methods?.[0]
  const canInitiatePayment = !!cartId && hasShippingMethod
  const hasPaymentCollection = !!cart?.payment_collection
  const hasPaymentSessions =
    (cart?.payment_collection?.payment_sessions?.length || 0) > 0

  return {
    canInitiatePayment,
    hasPaymentCollection,
    hasPaymentSessions,
    initiatePayment,
    isInitiatingPayment,
    paymentProviders,
  }
}
