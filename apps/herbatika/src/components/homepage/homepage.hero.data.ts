import firstCarouselSlide from "@/assets/homepage-carousel/first.avif"
import fourthCarouselSlide from "@/assets/homepage-carousel/fourth.avif"
import secondCarouselSlide from "@/assets/homepage-carousel/second.avif"
import thirdCarouselSlide from "@/assets/homepage-carousel/third.avif"

import type { HeroBannerItem } from "./homepage.data.types"

export const HERO_BANNERS: HeroBannerItem[] = [
  {
    badge: "Rýchle dodanie",
    href: "/c/trapi-ma",
    id: "rychle-dodanie",
    imageSrc: firstCarouselSlide.src,
    subtitle: "Rýchle dodanie a balenie",
    title: "Rýchle doručenie 24h!",
  },
  {
    badge: "Kozmetika",
    href: "/c/vypredaj-zlavy-a-akcie",
    id: "black-friday",
    imageSrc: secondCarouselSlide.src,
  },
  {
    badge: "Nová prevádzka",
    href: "/c/novinky",
    id: "nova-prevadzka",
    imageSrc: thirdCarouselSlide.src,
    title: "Otvárame pre vás novú prevádzku",
  },
  {
    badge: "Rýchle dodanie",
    href: "/c/trapi-ma",
    id: "rychle-dodanie-2",
    imageSrc: fourthCarouselSlide.src,
    subtitle: "Rýchle dodanie a balenie",
    title: "Rýchle doručenie 24h!",
  },
  {
    badge: "EKO domácnosť",
    href: "/c/eko-domacnost",
    id: "hero-home",
    imageSrc:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
    subtitle: "Čistejšie prostredie pre vás aj vašu rodinu.",
    title: "EKO domácnosť bez chemického zaťaženia",
  },
  {
    badge: "Akcia",
    href: "/c/vypredaj-zlavy-a-akcie",
    id: "hero-action",
    imageSrc:
      "https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=900&q=80",
    subtitle: "Vyberte si zvýhodnené produkty ešte dnes.",
    title: "Akčné ponuky až do vypredania",
  },
  {
    badge: "Darčeky",
    href: "/c/darceky",
    id: "hero-gift",
    imageSrc:
      "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=900&q=80",
    subtitle: "Pripravené balíčky pre vašich blízkych.",
    title: "Darčeky pre zdravie a radosť",
  },
  {
    badge: "Novinky",
    href: "/c/novinky",
    id: "hero-news",
    imageSrc:
      "https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=900&q=80",
    subtitle: "Pravidelne dopĺňame nové značky a produkty.",
    title: "Novinky zo sveta prírody",
  },
]
