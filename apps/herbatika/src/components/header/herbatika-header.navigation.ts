import type { StaticImageData } from "next/image"
import flameIcon from "@/assets/icons/flame-icon.avif"
import giftIcon from "@/assets/icons/gift-icon.avif"
import { normalizeCategoryName } from "@/components/category/category-product-utils"

export type HeaderCategoryNavConfig = {
  rootHandle: string
}

export type HeaderCategoryActionConfig = HeaderCategoryNavConfig & {
  src: StaticImageData
}

export const resolveHeaderCategoryLabel = (
  localizedName: string | null | undefined,
  rootHandle: string
) => {
  const normalizedName = localizedName?.trim()

  return normalizedName
    ? normalizeCategoryName(normalizedName) || rootHandle
    : rootHandle
}

export const PRIMARY_NAV_ITEMS: HeaderCategoryNavConfig[] = [
  { rootHandle: "trapi-ma" },
  { rootHandle: "prirodna-kozmetika" },
  { rootHandle: "doplnky-vyzivy" },
  { rootHandle: "potraviny-a-napoje" },
  { rootHandle: "eko-domacnost" },
  { rootHandle: "ucinne-zlozky-od-a-po-z" },
  { rootHandle: "novinky" },
]

export const HEADER_ACTION_ITEMS: HeaderCategoryActionConfig[] = [
  {
    rootHandle: "darceky",
    src: giftIcon,
  },
  {
    rootHandle: "vypredaj-zlavy-a-akcie",
    src: flameIcon,
  },
]
