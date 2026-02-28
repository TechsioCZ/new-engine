import { queryKeys } from "@/lib/query-keys"

type ActiveCartParams = {
  cartId?: string | null
  regionId?: string | null
}

export const cartQueryKeys = {
  all: () => queryKeys.cart.all(),
  active: (params: ActiveCartParams) => queryKeys.cart.active(params),
  detail: (cartId: string) => queryKeys.cart.detail(cartId),
}

