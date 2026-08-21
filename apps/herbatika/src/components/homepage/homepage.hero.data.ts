import firstCarouselSlide from "@/assets/homepage-carousel/first.avif"
import fourthCarouselSlide from "@/assets/homepage-carousel/fourth.avif"
import secondCarouselSlide from "@/assets/homepage-carousel/second.avif"
import thirdCarouselSlide from "@/assets/homepage-carousel/third.avif"
import type { HerbatikaMarketCode } from "@/lib/storefront/market-context"
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

export const RO_HERO_BANNERS: HeroBannerItem[] = [
  {
    id: "livrare-rapida",
    title: "Livrare rapidă în 24 de ore!",
    subtitle: "Expediere rapidă și ambalare atentă.",
    badge: "Livrare rapidă",
    imageAlt: "Extract natural Herbatica pregătit pentru utilizare",
    imageSrc: firstCarouselSlide.src,
  },
  {
    id: "ingrijire-naturala",
    title: "Îngrijire inspirată din natură",
    subtitle: "Cosmetice naturale alese pentru ritualul tău zilnic.",
    badge: "Cosmetică naturală",
    imageAlt: "Produse de îngrijire inspirate din natură",
    imageSrc:
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "selectia-herbatica",
    title: "Descoperă selecția Herbatica",
    subtitle: "Produse naturale pentru starea ta de bine, într-un singur loc.",
    badge: "Recomandările noastre",
    imageAlt: "Selecție de produse naturale Herbatica",
    imageSrc:
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "comanda-pregatita-cu-grija",
    title: "Pachetul tău, pregătit cu grijă",
    subtitle: "Comenzi procesate rapid și ambalate în siguranță.",
    badge: "Livrare în România",
    imageAlt: "Produs natural Herbatica ambalat cu grijă",
    imageSrc: fourthCarouselSlide.src,
  },
  {
    id: "casa-eco",
    title: "O casă mai curată, cu alegeri responsabile",
    subtitle: "Soluții pentru un mediu sănătos pentru tine și familia ta.",
    badge: "Casă eco",
    imageAlt: "Bucătărie luminoasă și prietenoasă cu mediul",
    imageSrc:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "oferte-speciale",
    title: "Oferte speciale, în limita stocului disponibil",
    subtitle: "Alege produsele preferate la prețuri avantajoase.",
    badge: "Oferte",
    imageAlt: "Cadouri și produse pregătite pentru o ofertă specială",
    imageSrc:
      "https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "cadouri-pentru-bucurie",
    title: "Cadouri pentru sănătate și bucurie",
    subtitle: "Seturi pregătite cu grijă pentru cei dragi.",
    badge: "Cadouri",
    imageAlt: "Cadou pregătit cu grijă pentru cei dragi",
    imageSrc:
      "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "noutati-din-natura",
    title: "Noutăți din lumea naturii",
    subtitle: "Descoperă periodic produse și branduri noi.",
    badge: "Noutăți",
    imageAlt: "Plante verzi care inspiră selecția Herbatica",
    imageSrc:
      "https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=900&q=80",
  },
]

export const HERO_BANNERS_BY_MARKET: Partial<
  Record<HerbatikaMarketCode, HeroBannerItem[]>
> = {
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
