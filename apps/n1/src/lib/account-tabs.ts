const ACCOUNT_TABS = ["profile", "addresses", "orders"] as const
export type AccountTab = (typeof ACCOUNT_TABS)[number]

export const resolveTab = (
  tabParam: string | null,
  pathname: string
): AccountTab => {
  if (tabParam && ACCOUNT_TABS.includes(tabParam as AccountTab)) {
    return tabParam as AccountTab
  }

  if (pathname.startsWith("/ucet/objednavky")) {
    return "orders"
  }

  return "profile"
}
