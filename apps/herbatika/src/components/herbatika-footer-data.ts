import type { IconType } from "@techsio/ui-kit/atoms/icon"

import { appHref } from "@/lib/routing"
import type { AppHref } from "@/lib/routing"

type FooterNavigationLink =
  | {
      href: AppHref
      labelKey: string
      external?: false
    }
  | {
      href: `https://${string}`
      labelKey: string
      external: true
    }

interface FooterColumn {
  titleKey: string
  links: readonly FooterNavigationLink[]
}

const giftVoucherHref = appHref("/c/darceky")
const brandListingHref = appHref("/znacka")
export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    links: [
      { href: "/blog", labelKey: "footer.columns.information.blog" },
      { href: "/o-nas", labelKey: "footer.columns.information.about" },
      { href: "/faq", labelKey: "footer.columns.information.faq" },
      {
        href: giftVoucherHref,
        labelKey: "footer.columns.information.gift_voucher",
      },
      {
        href: brandListingHref,
        labelKey: "footer.columns.information.brands",
      },
      {
        external: true,
        href: "https://obchody.heureka.sk/herbatica-sk/recenze/",
        labelKey: "footer.columns.information.reviews",
      },
    ],
    titleKey: "footer.columns.information.title",
  },
  {
    links: [
      {
        href: "/#doprava-a-platby",
        labelKey: "footer.columns.important.shipping_payment",
      },
      {
        href: "/#reklamacia-a-vratenie",
        labelKey: "footer.columns.important.claims_returns",
      },
      {
        href: "/#obchodne-podmienky",
        labelKey: "footer.columns.important.terms",
      },
      {
        href: "/#ochrana-osobnych-udajov",
        labelKey: "footer.columns.important.privacy",
      },
      {
        href: "/#cookies",
        labelKey: "footer.columns.important.cookies",
      },
    ],
    titleKey: "footer.columns.important.title",
  },
  {
    links: [
      {
        href: "/#affiliate",
        labelKey: "footer.columns.partners.affiliate",
      },
      {
        href: "/#velkoobchod",
        labelKey: "footer.columns.partners.wholesale",
      },
      {
        href: "/#dropshipping",
        labelKey: "footer.columns.partners.dropshipping",
      },
      {
        href: "/#private-label",
        labelKey: "footer.columns.partners.private_label",
      },
    ],
    titleKey: "footer.columns.partners.title",
  },
]

export const SOCIAL_LINKS: { href: string; icon: IconType; label: string }[] = [
  {
    href: "https://www.facebook.com/vasaherbatica",
    icon: "token-icon-fb",
    label: "Facebook",
  },
  {
    href: "https://www.instagram.com/herbatica/",
    icon: "token-icon-instagram",
    label: "Instagram",
  },
  {
    href: "https://www.youtube.com/@herbatica",
    icon: "token-icon-youtube",
    label: "YouTube",
  },
  {
    href: "https://www.linkedin.com/company/herbaticask/",
    icon: "token-icon-linkedin",
    label: "LinkedIn",
  },
  {
    href: "https://www.tiktok.com/@herbatica.sk",
    icon: "token-icon-tiktok",
    label: "TikTok",
  },
]

export const FOOTER_LOCALES: {
  active?: boolean
  code: string
  icon: IconType
}[] = [
  { active: true, code: "SK", icon: "token-icon-sk" },
  { code: "CZ", icon: "token-icon-cz" },
  { code: "HU", icon: "token-icon-hu" },
  { code: "RO", icon: "token-icon-ro" },
]
