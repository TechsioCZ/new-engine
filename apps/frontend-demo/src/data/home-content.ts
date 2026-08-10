import type { Route } from "next"

import type { HomeCategory } from "@/types/product"
import { getCategoryIdsByHandles } from "@/utils/category-helpers"

interface HeroContent {
  title: string
  subtitle: string
  backgroundImage: string
  primaryAction: {
    label: string
    href: Route
  }
  secondaryAction: {
    label: string
    href: Route
  }
}

interface FeaturedSection {
  title: string
  subtitle: string
  linkText?: string
  linkHref: Route
}

interface BannerContent {
  title: string
  subtitle: string
  backgroundImage: string
  linkText: string
  linkHref: Route
}

export interface HomeContent {
  hero: HeroContent
  trending: FeaturedSection
  categories: {
    title: string
    subtitle: string
  }
  saleBanner: BannerContent
  newArrivals: FeaturedSection
}

export const homeContent: HomeContent = {
  categories: {
    subtitle: "Najděte, co hledáte",
    title: "Nakupovat podle kategorie",
  },
  hero: {
    backgroundImage: "/assets/hero/home.webp",
    primaryAction: {
      href: "/products",
      label: "Nakupovat",
    },
    secondaryAction: {
      href: "/products",
      label: "Zobrazit kolekci",
    },
    subtitle: "Objevte nejnovější módní trendy",
    title: "Nová kolekce",
  },
  newArrivals: {
    linkHref: "/products",
    subtitle: "Čerstvé styly právě dorazily",
    title: "Nové přírůstky",
  },
  saleBanner: {
    backgroundImage:
      "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1920&h=600&fit=crop",
    linkHref: "/products?onSale=true",
    linkText: "Nakupovat ve výprodeji",
    subtitle: "Až 50% sleva na vybrané položky",
    title: "Sezónní výprodej",
  },
  trending: {
    linkHref: "/products",
    linkText: "Zobrazit všechny produkty",
    subtitle: "Podívejte se na nejpopulárnější položky",
    title: "Aktuální trendy",
  },
}

const categoryHandles = {
  cyklo: [
    "ostatni-category-400",
    "ponozky-category-394",
    "dlouhe-category-391",
    "dlouhe",
  ],
  damske: [
    "pres-hlavu-category-140",
    "svetry-category-144",
    "street-category-147",
    "kratasy-category-149",
    "saty-a-sukne",
  ],
  detske: [
    "kratke-rukavy-category-268",
    "street-category-274",
    "boty-category-282",
  ],
  moto: ["bundy-category-81", "kalhoty-category-82", "mx-offroad", "otevrene"],
  panske: ["kratke-rukavy", "na-zip", "street", "svetry"],
  snowboard: [
    "kulichy-category-124",
    "rukavice-category-123",
    "bundy-category-121",
  ],
}

type CategoryKey = keyof typeof categoryHandles
const categoryConfig: {
  key: CategoryKey
  name: string
  image: string
  description: string
}[] = [
  {
    description: "Od formálního po sportovní - vše pro pány",
    image: "cat-men.webp",
    key: "panske",
    name: "Pánské",
  },
  {
    description: "Elegance a trendy pro každou příležitost",
    image: "cat-women.webp",
    key: "damske",
    name: "Dámské",
  },
  {
    description: "Pohodlné a odolné pro každodenní radosti",
    image: "cat-kids.webp",
    key: "detske",
    name: "Dětské",
  },
  {
    description: "Vybavení pro vášnivé cyklisty",
    image: "cat-cyclo.webp",
    key: "cyklo",
    name: "Cyklo",
  },
  {
    description: "Bezpečnost a styl pro motorkáře",
    image: "cat-moto.webp",
    key: "moto",
    name: "Moto",
  },
  {
    description: "Pro ty, co milují adrenalin na sněhu",
    image: "cat-ski.webp",
    key: "snowboard",
    name: "Snowboard",
  },
]

export const homeCategories: HomeCategory[] = categoryConfig.map((cat) => ({
  description: cat.description,
  imageUrl: `/assets/cat-images/${cat.image}`,
  leaves: getCategoryIdsByHandles(categoryHandles[cat.key]),
  name: cat.name,
}))
