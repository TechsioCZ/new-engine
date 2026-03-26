import type { HomeCategory } from "@/types/product"

export type HeroContent = {
  title: string
  subtitle: string
  backgroundImage: string
  primaryAction: {
    label: string
    href: string
  }
  secondaryAction: {
    label: string
    href: string
  }
}

export type FeaturedSection = {
  title: string
  subtitle: string
  linkText?: string
  linkHref: string
}

export type BannerContent = {
  title: string
  subtitle: string
  backgroundImage: string
  linkText: string
  linkHref: string
}

export type HomeContent = {
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
  hero: {
    title: "Nová kolekce",
    subtitle: "Objevte nejnovější módní trendy",
    backgroundImage: "/assets/hero/home.webp",
    primaryAction: {
      label: "Nakupovat",
      href: "/products",
    },
    secondaryAction: {
      label: "Zobrazit kolekci",
      href: "/products",
    },
  },
  trending: {
    title: "Aktuální trendy",
    subtitle: "Podívejte se na nejpopulárnější položky",
    linkText: "Zobrazit všechny produkty",
    linkHref: "/products",
  },
  categories: {
    title: "Nakupovat podle kategorie",
    subtitle: "Najděte, co hledáte",
  },
  saleBanner: {
    title: "Sezónní výprodej",
    subtitle: "Až 50% sleva na vybrané položky",
    backgroundImage:
      "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1920&h=600&fit=crop",
    linkText: "Nakupovat ve výprodeji",
    linkHref: "/products?onSale=true",
  },
  newArrivals: {
    title: "Nové přírůstky",
    subtitle: "Čerstvé styly právě dorazily",
    linkHref: "/products",
  },
}

const categoryHandles = {
  panske: ["kratke-rukavy", "na-zip", "street", "svetry"],
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
  cyklo: [
    "ostatni-category-400",
    "ponozky-category-394",
    "dlouhe-category-391",
    "dlouhe",
  ],
  moto: ["bundy-category-81", "kalhoty-category-82", "mx-offroad", "otevrene"],
  snowboard: [
    "kulichy-category-124",
    "rukavice-category-123",
    "bundy-category-121",
  ],
}

type CategoryKey = keyof typeof categoryHandles

type HomeCategoryConfig = Omit<HomeCategory, "leaves"> & {
  handles: string[]
}

const categoryConfig: Array<{
  key: CategoryKey
  name: string
  image: string
  description: string
}> = [
  {
    key: "panske",
    name: "Pánské",
    image: "cat-men.webp",
    description: "Od formálního po sportovní - vše pro pány",
  },
  {
    key: "damske",
    name: "Dámské",
    image: "cat-women.webp",
    description: "Elegance a trendy pro každou příležitost",
  },
  {
    key: "detske",
    name: "Dětské",
    image: "cat-kids.webp",
    description: "Pohodlné a odolné pro každodenní radosti",
  },
  {
    key: "cyklo",
    name: "Cyklo",
    image: "cat-cyclo.webp",
    description: "Vybavení pro vášnivé cyklisty",
  },
  {
    key: "moto",
    name: "Moto",
    image: "cat-moto.webp",
    description: "Bezpečnost a styl pro motorkáře",
  },
  {
    key: "snowboard",
    name: "Snowboard",
    image: "cat-ski.webp",
    description: "Pro ty, co milují adrenalin na sněhu",
  },
]

export const homeCategoryConfigs: HomeCategoryConfig[] = categoryConfig.map(
  (category) => ({
    name: category.name,
    imageUrl: `/assets/cat-images/${category.image}`,
    handles: categoryHandles[category.key],
    description: category.description,
  })
)
