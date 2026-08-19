import type {
  CmsFooterNavigationGlobalDTO,
  CmsFooterNavigationItemDTO,
  CmsStoreFooterNavigationDTO,
  CmsStoreFooterNavigationItemDTO,
} from "./types"

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "")

const CMS_PAGE_PREFIX_BY_LOCALE: Readonly<Record<string, string>> = {
  cs: "informace",
  "cs-CZ": "informace",
  hu: "informaciok",
  "hu-HU": "informaciok",
  ro: "informatii",
  "ro-RO": "informatii",
  sk: "informacie",
  "sk-SK": "informacie",
}

const toStoreItem = (
  item: CmsFooterNavigationItemDTO,
  locale: string | undefined
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
  const pagePrefix = locale ? CMS_PAGE_PREFIX_BY_LOCALE[locale] : undefined
  if (!(slug && pagePrefix)) {
    return null
  }

  return {
    slot: item.slot,
    href: `/${pagePrefix}/${trimSlashes(slug)}`,
    type: "internal",
  }
}

export const toCmsStoreFooterNavigation = (
  navigation: CmsFooterNavigationGlobalDTO,
  locale?: string
): CmsStoreFooterNavigationDTO => {
  const columns = (navigation.columns ?? []).map((column) => ({
    slot: column.slot,
    items: (column.items ?? [])
      .map((item) => toStoreItem(item, locale))
      .filter((item): item is CmsStoreFooterNavigationItemDTO => Boolean(item)),
  }))

  return {
    columns: columns.filter((column) => column.items.length > 0),
  }
}
