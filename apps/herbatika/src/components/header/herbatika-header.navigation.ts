import giftIcon from "@/assets/icons/gift-icon.avif";
import flameIcon from "@/assets/icons/flame-icon.avif";
import { StaticImageData } from "next/image";

type HeaderNavItem = {
  href: string;
  label: string;
};

type HeaderActionItem = HeaderNavItem & {
  src: StaticImageData;
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
    src: giftIcon,
    label: "Darčeky",
  },
  {
    href: "/c/vypredaj-zlavy-a-akcie",
    src: flameIcon,
    label: "Akcie",
  },
];
