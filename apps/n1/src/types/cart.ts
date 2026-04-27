import type { HttpTypes } from "@medusajs/types"

export type Cart = HttpTypes.StoreCart
export type CartLineItem = HttpTypes.StoreCartLineItem
export type OptimisticCart = Cart & { _optimistic?: boolean }
export type OptimisticLineItem = CartLineItem & {
  _optimistic?: boolean
}

export type CompleteCartResult =
  | { success: true; order: HttpTypes.StoreOrder }
  | {
      success: false
      cart: HttpTypes.StoreCart
      error: {
        message: string
        type: string
        name?: string
      }
    }

export type ShippingMethodData = {
  access_point_id?: string
  access_point_name?: string
  access_point_type?: string
  access_point_street?: string
  access_point_city?: string
  access_point_zip?: string
  access_point_country?: string
}
