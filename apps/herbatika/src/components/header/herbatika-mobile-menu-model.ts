import { PRIMARY_NAV_ITEMS } from "./herbatika-header.navigation"
import { HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS } from "./herbatika-header.submenu-data"
import type { useHerbatikaHeaderSubmenu } from "./use-herbatika-header-submenu"

interface HerbatikaMobileMenuChildItem {
  href: string
  id: string
  label: string
}

interface HerbatikaMobileMenuLinkEntry {
  href: string
  label: string
  type: "link"
}

interface HerbatikaMobileMenuGroupEntry {
  href: string
  items: readonly HerbatikaMobileMenuChildItem[]
  label: string
  type: "group"
  value: string
}

export type HerbatikaMobileMenuEntry =
  | HerbatikaMobileMenuLinkEntry
  | HerbatikaMobileMenuGroupEntry

const SUBMENU_ROOT_HANDLES = new Set<string>(
  HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS.map((group) => group.rootHandle),
)

const resolveRootHandleFromHref = (href: string) => {
  if (!href.startsWith("/c/")) {
    return null
  }

  return href.slice(3)
}

const resolveMobileChildItems = (
  featuredItems: {
    handle: string
    id: string
    label: string
  }[],
): readonly HerbatikaMobileMenuChildItem[] =>
  featuredItems.map((item) => ({
    href: `/c/${item.handle}`,
    id: item.id,
    label: item.label,
  }))

export const buildMobileMenuEntries = (
  groupsByRootHandle: ReturnType<
    typeof useHerbatikaHeaderSubmenu
  >["groupsByRootHandle"],
): readonly HerbatikaMobileMenuEntry[] =>
  PRIMARY_NAV_ITEMS.map((item) => {
    const rootHandle = resolveRootHandleFromHref(item.href)

    if (rootHandle === null || !SUBMENU_ROOT_HANDLES.has(rootHandle)) {
      return {
        href: item.href,
        label: item.label,
        type: "link",
      } satisfies HerbatikaMobileMenuLinkEntry
    }

    const submenuGroup = groupsByRootHandle.get(rootHandle)

    return {
      href: item.href,
      items: resolveMobileChildItems(submenuGroup?.featuredItems ?? []),
      label: item.label,
      type: "group",
      value: rootHandle,
    } satisfies HerbatikaMobileMenuGroupEntry
  })

export const resolveExpandedValues = (
  pathname: string,
  mobileMenuEntries: readonly HerbatikaMobileMenuEntry[],
) => {
  const activeGroup = mobileMenuEntries.find(
    (entry) =>
      entry.type === "group" &&
      (pathname === entry.href ||
        entry.items.some((item) => item.href === pathname)),
  )

  if (!activeGroup || activeGroup.type !== "group") {
    return []
  }

  return [activeGroup.value]
}
