import firstCarouselSlide from "@/assets/homepage-carousel/first.avif"
import fourthCarouselSlide from "@/assets/homepage-carousel/fourth.avif"
import secondCarouselSlide from "@/assets/homepage-carousel/second.avif"
import thirdCarouselSlide from "@/assets/homepage-carousel/third.avif"
import { buildUrl } from "@/lib/url/builder"
import type { Market } from "@/lib/url/types"
import type { HeroBannerItem } from "./homepage.data.types"

const HERO_BANNER_DATA = [
  {
    id: "rychle-dodanie",
    title: "Rýchle doručenie 24h!",
    subtitle: "Rýchle dodanie a balenie",
    badge: "Rýchle dodanie",
    categorySlug: "trapi-ma",
    imageSrc: firstCarouselSlide.src,
  },
  {
    id: "black-friday",
    badge: "Kozmetika",
    categorySlug: "vypredaj-zlavy-a-akcie",
    imageSrc: secondCarouselSlide.src,
  },
  {
    id: "nova-prevadzka",
    title: "Otvárame pre vás novú prevádzku",
    badge: "Nová prevádzka",
    categorySlug: "novinky",
    imageSrc: thirdCarouselSlide.src,
  },
  {
    id: "rychle-dodanie-2",
    title: "Rýchle doručenie 24h!",
    subtitle: "Rýchle dodanie a balenie",
    badge: "Rýchle dodanie",
    categorySlug: "trapi-ma",
    imageSrc: fourthCarouselSlide.src,
  },
  {
    id: "hero-home",
    title: "EKO domácnosť bez chemického zaťaženia",
    subtitle: "Čistejšie prostredie pre vás aj vašu rodinu.",
    badge: "EKO domácnosť",
    categorySlug: "eko-domacnost",
    imageSrc:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-action",
    title: "Akčné ponuky až do vypredania",
    subtitle: "Vyberte si zvýhodnené produkty ešte dnes.",
    badge: "Akcia",
    categorySlug: "vypredaj-zlavy-a-akcie",
    imageSrc:
      "https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-gift",
    title: "Darčeky pre zdravie a radosť",
    subtitle: "Pripravené balíčky pre vašich blízkych.",
    badge: "Darčeky",
    categorySlug: "darceky",
    imageSrc:
      "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-news",
    title: "Novinky zo sveta prírody",
    subtitle: "Pravidelne dopĺňame nové značky a produkty.",
    badge: "Novinky",
    categorySlug: "novinky",
    imageSrc:
      "https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=900&q=80",
  },
] as const

export const createHeroBanners = (market: Market): HeroBannerItem[] =>
  HERO_BANNER_DATA.map(({ categorySlug, ...banner }) => ({
    ...banner,
    href: buildUrl({ market, kind: "category", slug: categorySlug }),
  }))
