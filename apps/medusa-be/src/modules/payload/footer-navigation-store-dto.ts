import type {
  CmsFooterNavigationGlobalDTO,
  CmsFooterNavigationItemDTO,
  CmsStoreFooterNavigationDTO,
  CmsStoreFooterNavigationItemDTO,
} from "./types"

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "")

const toStoreItem = (
  item: CmsFooterNavigationItemDTO
): CmsStoreFooterNavigationItemDTO | null => {
  if (item.blockType === "appRouteLink") {
    return {
      slot: item.slot,
      href: item.path,
      type: "internal",
    }
  }

  if (item.blockType === "externalLink") {
    return {
      slot: item.slot,
      href: item.url,
      type: "external",
      newTab: item.newTab ?? true,
    }
  }

  const page = item.page
  if (
    !page ||
    typeof page !== "object" ||
    page.status !== "published" ||
    page.visibility !== "public"
  ) {
    return null
  }

  const slug = page.slug?.trim()
  if (!slug) {
    return null
  }

  return {
    slot: item.slot,
    href: `/${trimSlashes(slug)}`,
    type: "internal",
  }
}

export const toCmsStoreFooterNavigation = (
  navigation: CmsFooterNavigationGlobalDTO
): CmsStoreFooterNavigationDTO => {
  const columns = (navigation.columns ?? []).map((column) => ({
    slot: column.slot,
    items: (column.items ?? [])
      .map(toStoreItem)
      .filter((item): item is CmsStoreFooterNavigationItemDTO => Boolean(item)),
  }))

  return {
    columns: columns.filter((column) => column.items.length > 0),
  }
}
