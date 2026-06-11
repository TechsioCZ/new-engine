import firstCarouselSlide from "@/assets/homepage-carousel/first.avif"
import fourthCarouselSlide from "@/assets/homepage-carousel/fourth.avif"
import secondCarouselSlide from "@/assets/homepage-carousel/second.avif"
import thirdCarouselSlide from "@/assets/homepage-carousel/third.avif"
import type { HeroBannerItem } from "./homepage.data.types"

export const HERO_BANNERS: HeroBannerItem[] = [
  {
    id: "rychle-dodanie",
    title: "Rýchle doručenie 24h!",
    subtitle: "Rýchle dodanie a balenie",
    badge: "Rýchle dodanie",
    href: "/c/trapi-ma",
    imageSrc: firstCarouselSlide.src,
  },
  {
    id: "black-friday",
    badge: "Kozmetika",
    href: "/c/vypredaj-zlavy-a-akcie",
    imageSrc: secondCarouselSlide.src,
  },
  {
    id: "nova-prevadzka",
    title: "Otvárame pre vás novú prevádzku",
    badge: "Nová prevádzka",
    href: "/c/novinky",
    imageSrc: thirdCarouselSlide.src,
  },
  {
    id: "rychle-dodanie-2",
    title: "Rýchle doručenie 24h!",
    subtitle: "Rýchle dodanie a balenie",
    badge: "Rýchle dodanie",
    href: "/c/trapi-ma",
    imageSrc: fourthCarouselSlide.src,
  },
  {
    id: "hero-home",
    title: "EKO domácnosť bez chemického zaťaženia",
    subtitle: "Čistejšie prostredie pre vás aj vašu rodinu.",
    badge: "EKO domácnosť",
    href: "/c/eko-domacnost",
    imageSrc:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-action",
    title: "Akčné ponuky až do vypredania",
    subtitle: "Vyberte si zvýhodnené produkty ešte dnes.",
    badge: "Akcia",
    href: "/c/vypredaj-zlavy-a-akcie",
    imageSrc:
      "https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-gift",
    title: "Darčeky pre zdravie a radosť",
    subtitle: "Pripravené balíčky pre vašich blízkych.",
    badge: "Darčeky",
    href: "/c/darceky",
    imageSrc:
      "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-news",
    title: "Novinky zo sveta prírody",
    subtitle: "Pravidelne dopĺňame nové značky a produkty.",
    badge: "Novinky",
    href: "/c/novinky",
    imageSrc:
      "https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=900&q=80",
  },
]
