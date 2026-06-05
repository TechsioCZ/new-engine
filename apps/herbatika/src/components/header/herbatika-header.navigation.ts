import giftIcon from "@/assets/icons/gift-icon.avif";
import flameIcon from "@/assets/icons/flame-icon.avif";
import type { StorefrontRoute } from "@/lib/route-paths";
import { routes } from "@/lib/routes";
import { StaticImageData } from "next/image";

type HeaderNavItem = {
  href: StorefrontRoute;
  label: string;
};

type HeaderActionItem = HeaderNavItem & {
  src: StaticImageData;
};

export const PRIMARY_NAV_ITEMS: HeaderNavItem[] = [
  { href: routes.category.detail("trapi-ma"), label: "Trápi ma" },
  { href: routes.category.detail("prirodna-kozmetika"), label: "Prírodná kozmetika" },
  { href: routes.category.detail("doplnky-vyzivy"), label: "Doplnky výživy" },
  { href: routes.category.detail("potraviny-a-napoje"), label: "Potraviny a nápoje" },
  { href: routes.category.detail("eko-domacnost"), label: "EKO domácnosť" },
  { href: routes.category.detail("ucinne-zlozky-od-a-po-z"), label: "Účinné zložky od A po Z" },
  { href: routes.category.detail("novinky"), label: "Novinky" },
];

export const HEADER_ACTION_ITEMS: HeaderActionItem[] = [
  {
    href: routes.category.detail("darceky"),
    src: giftIcon,
    label: "Darčeky",
  },
  {
    href: routes.category.detail("vypredaj-zlavy-a-akcie"),
    src: flameIcon,
    label: "Akcie",
  },
];
