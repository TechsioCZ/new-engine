const ACCOUNT_TABS = ["profile", "addresses", "orders"] as const
export type AccountTab = (typeof ACCOUNT_TABS)[number]

export const resolveTab = (
  tabParam: string | null,
  pathname: string,
): AccountTab => {
  if (
    tabParam === ACCOUNT_TABS[0] ||
    tabParam === ACCOUNT_TABS[1] ||
    tabParam === ACCOUNT_TABS[2]
  ) {
    return tabParam
  }

  if (pathname.startsWith("/ucet/objednavky")) {
    return "orders"
  }

  return "profile"
}
