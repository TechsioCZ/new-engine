import { ShoppingCart, Users } from "@medusajs/icons"
import type { ReactNode } from "react"
import type { BadgeKey } from "./admin-types"

export type AdminNavItem = {
  activeMatch: string
  badgeKey?: BadgeKey
  href: string
  icon: ReactNode
  label: string
}

export const adminNavItems: AdminNavItem[] = [
  {
    activeMatch: "/orders",
    badgeKey: "ordersActionRequired",
    href: "/orders?view=action-required",
    icon: <ShoppingCart />,
    label: "Objednavky",
  },
  {
    activeMatch: "/customers",
    badgeKey: "customersActionRequired",
    href: "/customers?view=b2b-pending",
    icon: <Users />,
    label: "Zakaznici",
  },
]
