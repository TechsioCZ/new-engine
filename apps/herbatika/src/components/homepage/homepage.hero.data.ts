import firstCarouselSlide from "@/assets/homepage-carousel/first.avif"
import fourthCarouselSlide from "@/assets/homepage-carousel/fourth.avif"
import secondCarouselSlide from "@/assets/homepage-carousel/second.avif"
import thirdCarouselSlide from "@/assets/homepage-carousel/third.avif"
import type { HerbatikaMarketCode } from "@/lib/storefront/market-context"
import { buildPath, type PublicRouteTarget } from "@/lib/url/public-url"
import type { HeroBannerItem } from "./homepage.data.types"

export const HERO_BANNERS: HeroBannerItem[] = [
  {
    id: "rychle-dodanie",
    title: "Rýchle doručenie 24h!",
    subtitle: "Rýchle dodanie a balenie",
    badge: "Rýchle dodanie",
    imageSrc: firstCarouselSlide.src,
  },
  {
    id: "black-friday",
    badge: "Kozmetika",
    imageSrc: secondCarouselSlide.src,
  },
  {
    id: "nova-prevadzka",
    title: "Otvárame pre vás novú prevádzku",
    badge: "Nová prevádzka",
    imageSrc: thirdCarouselSlide.src,
  },
  {
    id: "rychle-dodanie-2",
    title: "Rýchle doručenie 24h!",
    subtitle: "Rýchle dodanie a balenie",
    badge: "Rýchle dodanie",
    imageSrc: fourthCarouselSlide.src,
  },
  {
    id: "hero-home",
    title: "EKO domácnosť bez chemického zaťaženia",
    subtitle: "Čistejšie prostredie pre vás aj vašu rodinu.",
    badge: "EKO domácnosť",
    imageSrc:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-action",
    title: "Akčné ponuky až do vypredania",
    subtitle: "Vyberte si zvýhodnené produkty ešte dnes.",
    badge: "Akcia",
    imageSrc:
      "https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-gift",
    title: "Darčeky pre zdravie a radosť",
    subtitle: "Pripravené balíčky pre vašich blízkych.",
    badge: "Darčeky",
    imageSrc:
      "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-news",
    title: "Novinky zo sveta prírody",
    subtitle: "Pravidelne dopĺňame nové značky a produkty.",
    badge: "Novinky",
    imageSrc:
      "https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=900&q=80",
  },
]

const LOCALIZED_HERO_VISUALS = [
  {
    imageSrc: firstCarouselSlide.src,
    key: "catalog",
    target: { kind: "product" },
  },
  {
    imageSrc: secondCarouselSlide.src,
    key: "categories",
    target: { kind: "category" },
  },
  {
    imageSrc: thirdCarouselSlide.src,
    key: "brands",
    target: { kind: "brand" },
  },
  {
    imageSrc: fourthCarouselSlide.src,
    key: "collections",
    target: { kind: "collection" },
  },
  {
    imageSrc:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
    key: "home",
    target: { kind: "category" },
  },
  {
    imageSrc:
      "https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=900&q=80",
    key: "campaigns",
    target: { kind: "collection" },
  },
  {
    imageSrc:
      "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=900&q=80",
    key: "gifts",
    target: { kind: "collection" },
  },
  {
    imageSrc:
      "https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=900&q=80",
    key: "inspiration",
    target: { kind: "article" },
  },
] as const satisfies readonly {
  imageSrc: string
  key: string
  target: PublicRouteTarget
}[]

type LocalizedHeroKey = (typeof LOCALIZED_HERO_VISUALS)[number]["key"]
type LocalizedHeroCopy = Readonly<{
  badge: string
  ctaLabel: string
  imageAlt: string
  subtitle: string
  title: string
}>

const LOCALIZED_HERO_COPY = {
  cz: {
    catalog: {
      badge: "Sortiment",
      ctaLabel: "Prohlédnout produkty",
      imageAlt: "Výběr produktů v katalogu Herbatica",
      subtitle: "Projděte si nabídku přehledně na jednom místě.",
      title: "Objevte sortiment Herbatica",
    },
    categories: {
      badge: "Kategorie",
      ctaLabel: "Zobrazit kategorie",
      imageAlt: "Produkty uspořádané do přehledných kategorií",
      subtitle: "Vyberte si podle toho, co právě hledáte.",
      title: "Snadnější výběr podle kategorií",
    },
    brands: {
      badge: "Značky",
      ctaLabel: "Prohlédnout značky",
      imageAlt: "Výběr značek dostupných v katalogu Herbatica",
      subtitle: "Seznamte se se značkami v našem katalogu.",
      title: "Značky na jednom místě",
    },
    collections: {
      badge: "Kolekce",
      ctaLabel: "Zobrazit kolekce",
      imageAlt: "Tematický výběr produktů Herbatica",
      subtitle: "Projděte si tematicky sestavené výběry.",
      title: "Kolekce pro snadnou inspiraci",
    },
    home: {
      badge: "Domácnost",
      ctaLabel: "Prozkoumat nabídku",
      imageAlt: "Světlá kuchyně jako inspirace pro domácnost",
      subtitle: "Praktické tipy pro každodenní výběr.",
      title: "Inspirace pro domácnost",
    },
    campaigns: {
      badge: "Aktuální výběry",
      ctaLabel: "Zobrazit výběry",
      imageAlt: "Dárkové balení a sezónní výběr produktů",
      subtitle: "Podívejte se na právě připravené tematické výběry.",
      title: "Sezónní inspirace",
    },
    gifts: {
      badge: "Dárky",
      ctaLabel: "Najít inspiraci",
      imageAlt: "Dárkové balení připravené pro inspiraci",
      subtitle: "Nápady pro malé i větší příležitosti.",
      title: "Tipy na dárky",
    },
    inspiration: {
      badge: "Tipy",
      ctaLabel: "Číst články",
      imageAlt: "Zelené rostliny jako inspirace pro články Herbatica",
      subtitle: "Přečtěte si články a praktické tipy.",
      title: "Tipy a inspirace",
    },
  },
  hu: {
    catalog: {
      badge: "Kínálat",
      ctaLabel: "Termékek megtekintése",
      imageAlt: "Válogatás a Herbatica termékkatalógusából",
      subtitle: "Böngésszen áttekinthetően, egy helyen.",
      title: "Fedezze fel a Herbatica kínálatát",
    },
    categories: {
      badge: "Kategóriák",
      ctaLabel: "Kategóriák megtekintése",
      imageAlt: "Áttekinthető kategóriákba rendezett termékek",
      subtitle: "Válasszon az alapján, amit éppen keres.",
      title: "Egyszerű választás kategóriák szerint",
    },
    brands: {
      badge: "Márkák",
      ctaLabel: "Márkák megtekintése",
      imageAlt: "A Herbatica katalógusában szereplő márkák",
      subtitle: "Ismerje meg a katalógusban szereplő márkákat.",
      title: "Márkák egy helyen",
    },
    collections: {
      badge: "Gyűjtemények",
      ctaLabel: "Gyűjtemények megtekintése",
      imageAlt: "Tematikus Herbatica termékválogatás",
      subtitle: "Böngésszen a tematikusan összeállított válogatásokban.",
      title: "Gyűjtemények az egyszerű inspirációért",
    },
    home: {
      badge: "Otthon",
      ctaLabel: "Kínálat felfedezése",
      imageAlt: "Világos konyha otthoni inspirációként",
      subtitle: "Praktikus ötletek a mindennapi választáshoz.",
      title: "Inspiráció az otthonhoz",
    },
    campaigns: {
      badge: "Aktuális válogatások",
      ctaLabel: "Válogatások megtekintése",
      imageAlt: "Ajándékcsomag és szezonális termékválogatás",
      subtitle: "Tekintse meg az aktuális tematikus válogatásokat.",
      title: "Szezonális inspiráció",
    },
    gifts: {
      badge: "Ajándékok",
      ctaLabel: "Ötletek megtekintése",
      imageAlt: "Ajándékcsomag ötletekhez",
      subtitle: "Ötletek kisebb és nagyobb alkalmakra.",
      title: "Ajándékötletek",
    },
    inspiration: {
      badge: "Tippek",
      ctaLabel: "Cikkek olvasása",
      imageAlt: "Zöld növények a Herbatica cikkeinek inspirációjaként",
      subtitle: "Olvasson cikkeket és praktikus tippeket.",
      title: "Tippek és inspiráció",
    },
  },
  ro: {
    catalog: {
      badge: "Catalog",
      ctaLabel: "Vezi produsele",
      imageAlt: "Selecție din catalogul de produse Herbatica",
      subtitle: "Explorează oferta organizată într-un singur loc.",
      title: "Descoperă gama Herbatica",
    },
    categories: {
      badge: "Categorii",
      ctaLabel: "Vezi categoriile",
      imageAlt: "Produse organizate în categorii ușor de parcurs",
      subtitle: "Alege în funcție de ceea ce cauți acum.",
      title: "Alegere simplă după categorie",
    },
    brands: {
      badge: "Mărci",
      ctaLabel: "Vezi mărcile",
      imageAlt: "Mărci disponibile în catalogul Herbatica",
      subtitle: "Explorează mărcile prezente în catalog.",
      title: "Mărci într-un singur loc",
    },
    collections: {
      badge: "Colecții",
      ctaLabel: "Vezi colecțiile",
      imageAlt: "Selecție tematică de produse Herbatica",
      subtitle: "Descoperă selecțiile grupate pe teme.",
      title: "Colecții pentru inspirație",
    },
    home: {
      badge: "Pentru casă",
      ctaLabel: "Explorează oferta",
      imageAlt: "Bucătărie luminoasă ca inspirație pentru casă",
      subtitle: "Idei practice pentru alegerile de zi cu zi.",
      title: "Inspirație pentru casă",
    },
    campaigns: {
      badge: "Selecții actuale",
      ctaLabel: "Vezi selecțiile",
      imageAlt: "Ambalaj cadou și selecție sezonieră de produse",
      subtitle: "Descoperă selecțiile tematice disponibile acum.",
      title: "Inspirație de sezon",
    },
    gifts: {
      badge: "Cadouri",
      ctaLabel: "Descoperă ideile",
      imageAlt: "Ambalaj cadou pregătit pentru inspirație",
      subtitle: "Idei pentru ocazii mici și mari.",
      title: "Idei de cadouri",
    },
    inspiration: {
      badge: "Sfaturi",
      ctaLabel: "Citește articolele",
      imageAlt: "Plante verzi ca inspirație pentru articolele Herbatica",
      subtitle: "Descoperă articole și idei practice.",
      title: "Sfaturi și inspirație",
    },
  },
} as const satisfies Record<
  Exclude<HerbatikaMarketCode, "sk">,
  Record<LocalizedHeroKey, LocalizedHeroCopy>
>

const createLocalizedHeroBanners = (
  market: Exclude<HerbatikaMarketCode, "sk">,
  copy: Record<LocalizedHeroKey, LocalizedHeroCopy>
): HeroBannerItem[] =>
  LOCALIZED_HERO_VISUALS.map((visual) => ({
    ...copy[visual.key],
    ctaTarget: {
      href: buildPath(visual.target, market),
      kind: "static" as const,
    },
    id: `${market}-${visual.key}`,
    imageSrc: visual.imageSrc,
  }))

export const CZ_HERO_BANNERS = createLocalizedHeroBanners(
  "cz",
  LOCALIZED_HERO_COPY.cz
)
export const HU_HERO_BANNERS = createLocalizedHeroBanners(
  "hu",
  LOCALIZED_HERO_COPY.hu
)
export const RO_HERO_BANNERS = createLocalizedHeroBanners(
  "ro",
  LOCALIZED_HERO_COPY.ro
)

export const HERO_BANNERS_BY_MARKET: Record<
  HerbatikaMarketCode,
  HeroBannerItem[]
> = {
  cz: CZ_HERO_BANNERS,
  hu: HU_HERO_BANNERS,
  ro: RO_HERO_BANNERS,
  sk: HERO_BANNERS,
}

const CODE_OWNED_HOMEPAGE_HERO_SOURCES: Partial<
  Record<HerbatikaMarketCode, HeroBannerItem[]>
> = {
  sk: HERO_BANNERS,
}

export const resolveHomepageHeroBanners = (
  heroBanners: HeroBannerItem[] | undefined,
  market: HerbatikaMarketCode
): HeroBannerItem[] => {
  if (heroBanners?.length) {
    return heroBanners
  }

  return HERO_BANNERS_BY_MARKET[market] ?? []
}

export type HomepageHeroSourceResult =
  | Readonly<{ kind: "found"; value: HeroBannerItem[] }>
  | Readonly<{ kind: "unavailable" }>

export const resolveHomepageHeroSource = (
  cmsBanners: HeroBannerItem[] | undefined,
  market: HerbatikaMarketCode,
  readReviewedBanners?: () => HeroBannerItem[] | undefined
): HomepageHeroSourceResult => {
  if (cmsBanners?.length) {
    return { kind: "found", value: cmsBanners }
  }

  const codeOwnedSource = CODE_OWNED_HOMEPAGE_HERO_SOURCES[market]
  if (codeOwnedSource?.length) {
    return { kind: "found", value: codeOwnedSource }
  }

  const reviewedBanners = readReviewedBanners?.()
  if (reviewedBanners?.length) {
    return { kind: "found", value: reviewedBanners }
  }

  return { kind: "unavailable" }
}
