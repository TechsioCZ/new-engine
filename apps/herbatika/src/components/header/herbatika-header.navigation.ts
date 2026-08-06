import type { StaticImageData } from "next/image"
import flameIcon from "@/assets/icons/flame-icon.avif"
import giftIcon from "@/assets/icons/gift-icon.avif"
import { buildUrl } from "@/lib/url/builder"
import type { Market } from "@/lib/url/types"

type HeaderNavItem = {
  href: string
  label: string
  slug: string
}

type HeaderActionItem = HeaderNavItem & {
  src: StaticImageData
}

const PRIMARY_NAV_DATA = [
  { slug: "trapi-ma", label: "Trápi ma" },
  { slug: "prirodna-kozmetika", label: "Prírodná kozmetika" },
  { slug: "doplnky-vyzivy", label: "Doplnky výživy" },
  { slug: "potraviny-a-napoje", label: "Potraviny a nápoje" },
  { slug: "eko-domacnost", label: "EKO domácnosť" },
  { slug: "ucinne-zlozky-od-a-po-z", label: "Účinné zložky od A po Z" },
  { slug: "novinky", label: "Novinky" },
] as const

const HEADER_ACTION_DATA = [
  { slug: "darceky", src: giftIcon, label: "Darčeky" },
  {
    slug: "vypredaj-zlavy-a-akcie",
    src: flameIcon,
    label: "Akcie",
  },
] as const

const buildCategoryHref = (market: Market, slug: string) =>
  buildUrl({ market, kind: "category", slug })

export const createPrimaryNavItems = (market: Market): HeaderNavItem[] =>
  PRIMARY_NAV_DATA.map(({ label, slug }) => ({
    href: buildCategoryHref(market, slug),
    label,
    slug,
  }))

export const createHeaderActionItems = (market: Market): HeaderActionItem[] =>
  HEADER_ACTION_DATA.map(({ label, slug, src }) => ({
    href: buildCategoryHref(market, slug),
    label,
    slug,
    src,
  }))
