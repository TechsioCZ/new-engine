import type { StaticImageData } from "next/image"
import flameIcon from "@/assets/icons/flame-icon.avif"
import giftIcon from "@/assets/icons/gift-icon.avif"

export type HeaderCategoryNavConfig = {
  label: string
  rootHandle: string
}

export type HeaderCategoryActionConfig = HeaderCategoryNavConfig & {
  src: StaticImageData
}

export const PRIMARY_NAV_ITEMS: HeaderCategoryNavConfig[] = [
  { label: "Trápi ma", rootHandle: "trapi-ma" },
  { label: "Prírodná kozmetika", rootHandle: "prirodna-kozmetika" },
  { label: "Doplnky výživy", rootHandle: "doplnky-vyzivy" },
  { label: "Potraviny a nápoje", rootHandle: "potraviny-a-napoje" },
  { label: "EKO domácnosť", rootHandle: "eko-domacnost" },
  {
    label: "Účinné zložky od A po Z",
    rootHandle: "ucinne-zlozky-od-a-po-z",
  },
  { label: "Novinky", rootHandle: "novinky" },
]

export const HEADER_ACTION_ITEMS: HeaderCategoryActionConfig[] = [
  {
    label: "Darčeky",
    rootHandle: "darceky",
    src: giftIcon,
  },
  {
    label: "Akcie",
    rootHandle: "vypredaj-zlavy-a-akcie",
    src: flameIcon,
  },
]
