import {
  Buildings,
  CogSixTooth,
  CurrencyDollar,
  DraftOrders,
  Envelope,
  Folder,
  Images,
  QueueList,
  ReceiptPercent,
  ShoppingCart,
  Tag,
  TruckFast,
  Users,
} from "@medusajs/icons"
import type { ReactNode } from "react"
import type { BadgeKey } from "./admin-types"

export type AdminNavItem = {
  activeMatch: string
  badgeKey?: BadgeKey
  href: string
  icon: ReactNode
  label: string
  section?: string
}

export const adminNavItems: AdminNavItem[] = [
  {
    activeMatch: "/orders",
    badgeKey: "ordersActionRequired",
    href: "/orders?view=action-required",
    icon: <ShoppingCart />,
    label: "Objednavky",
    section: "Obchod",
  },
  {
    activeMatch: "/drafts",
    href: "/drafts",
    icon: <DraftOrders />,
    label: "Drafts",
    section: "Obchod",
  },
  {
    activeMatch: "/products",
    href: "/products",
    icon: <Tag />,
    label: "Produkty",
    section: "Obchod",
  },
  {
    activeMatch: "/inventory",
    href: "/inventory",
    icon: <Buildings />,
    label: "Sklad",
    section: "Obchod",
  },
  {
    activeMatch: "/customers",
    badgeKey: "customersActionRequired",
    href: "/customers?view=b2b-pending",
    icon: <Users />,
    label: "Zakaznici",
    section: "Obchod",
  },
  {
    activeMatch: "/promotions",
    href: "/promotions",
    icon: <ReceiptPercent />,
    label: "Promoce",
    section: "Obchod",
  },
  {
    activeMatch: "/price-lists",
    href: "/price-lists",
    icon: <CurrencyDollar />,
    label: "Ceniky",
    section: "Obchod",
  },
  {
    activeMatch: "/content",
    href: "/content",
    icon: <Folder />,
    label: "Content",
    section: "Extensions",
  },
  {
    activeMatch: "/image-gallery",
    href: "/image-gallery",
    icon: <Images />,
    label: "Image Gallery",
    section: "Extensions",
  },
  {
    activeMatch: "/emails",
    href: "/emails",
    icon: <Envelope />,
    label: "Emails",
    section: "Extensions",
  },
  {
    activeMatch: "/producers",
    href: "/producers",
    icon: <Buildings />,
    label: "Producers",
    section: "Extensions",
  },
  {
    activeMatch: "/packeta-labels",
    href: "/packeta-labels",
    icon: <TruckFast />,
    label: "Packeta Labels",
    section: "Extensions",
  },
  {
    activeMatch: "/order-operations",
    href: "/order-operations",
    icon: <QueueList />,
    label: "Order Operations",
    section: "Extensions",
  },
  {
    activeMatch: "/settings",
    href: "/settings",
    icon: <CogSixTooth />,
    label: "Nastaveni",
    section: "System",
  },
]
