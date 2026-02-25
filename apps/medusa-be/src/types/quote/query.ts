import type {
  AdminCustomer,
  AdminOrder,
  AdminUser,
  StoreCart,
} from "@medusajs/types"
import type { QueryEmployee } from "../company"
import type { ModuleQuote, ModuleQuoteMessage } from "./module"

export type QueryQuote = ModuleQuote & {
  draft_order: AdminOrder
  cart: StoreCart
  customer: AdminCustomer & {
    employee: QueryEmployee
  }
  messages: QueryQuoteMessage[]
}

export type QueryQuoteMessage = ModuleQuoteMessage & {
  customer: AdminCustomer
  admin: AdminUser
}
