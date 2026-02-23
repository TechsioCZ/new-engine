import type { IconType } from "@techsio/ui-kit/atoms/icon";

type HeaderNavItem = {
  href: string;
  label: string;
};

type HeaderActionItem = HeaderNavItem & {
  icon: IconType;
};

export const PRIMARY_NAV_ITEMS: HeaderNavItem[] = [
  { href: "/c/trapi-ma", label: "Trápi ma" },
  { href: "/c/prirodna-kozmetika", label: "Prírodná kozmetika" },
  { href: "/c/doplnky-vyzivy", label: "Doplnky výživy" },
  { href: "/c/potraviny-a-napoje", label: "Potraviny a nápoje" },
  { href: "/c/eko-domacnost", label: "EKO domácnosť" },
  { href: "/c/ucinne-zlozky-od-a-po-z", label: "Účinné zložky od A po Z" },
  { href: "/c/novinky", label: "Novinky" },
];

export const HEADER_ACTION_ITEMS: HeaderActionItem[] = [
  {
    href: "/c/darceky",
    icon: "icon-[mdi--gift-outline]",
    label: "Darčeky",
  },
  {
    href: "/c/vypredaj-zlavy-a-akcie",
    icon: "icon-[mdi--fire]",
    label: "Akcie",
  },
];
