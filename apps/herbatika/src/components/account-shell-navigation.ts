import type { IconType } from "@techsio/ui-kit/atoms/icon"

const ACCOUNT_NAV_LABEL_KEYS = {
  lists: "account.navigation.lists",
  orders: "account.navigation.orders",
  overview: "account.navigation.overview",
  settings: "account.navigation.settings",
} as const

interface AccountNavItemType {
  href: string
  icon: IconType
  labelKey: (typeof ACCOUNT_NAV_LABEL_KEYS)[keyof typeof ACCOUNT_NAV_LABEL_KEYS]
}

export const ACCOUNT_NAV_ITEMS: AccountNavItemType[] = [
  {
    href: "/account",
    icon: "token-icon-user",
    labelKey: "account.navigation.overview",
  },
  {
    href: "/account/orders",
    icon: "token-icon-order",
    labelKey: "account.navigation.orders",
  },
  {
    href: "/account/lists",
    icon: "token-icon-heart",
    labelKey: "account.navigation.lists",
  },
  {
    href: "/account/settings",
    icon: "token-icon-settings",
    labelKey: "account.navigation.settings",
  },
] as const

export const isNavItemActive = (pathname: string, href: string) => {
  if (pathname === href) {
    return true
  }

  if (href === "/account") {
    return false
  }

  return pathname.startsWith(`${href}/`)
}
