import type { BenefitItem, HeroBannerItem } from "./homepage.data.types";

export const HERO_BANNERS: HeroBannerItem[] = [
  {
    id: "hero-immune",
    title: "Silná imunita počas celého roka",
    subtitle: "Bylinné extrakty, vitamíny a minerály pre každý deň.",
    badge: "Imunita",
    href: "/c/trapi-ma",
    imageSrc:
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-cosmetics",
    title: "Prírodná kozmetika bez kompromisov",
    subtitle: "Objavte jemnú starostlivosť o pleť a telo.",
    badge: "Kozmetika",
    href: "/c/prirodna-kozmetika",
    imageSrc:
      "https://images.unsplash.com/photo-1571875257727-256c39da42af?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-tea",
    title: "Bylinky a čaje pre pokojný deň",
    subtitle: "Vyberte si z overených kombinácií od Herbatica.",
    badge: "Bylinky",
    href: "/c/potraviny-a-napoje",
    imageSrc:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "hero-supplements",
    title: "Doplnky výživy pre vitalitu",
    subtitle: "Kapsuly, tinktúry aj funkčné zmesi na mieru.",
    badge: "Doplnky",
    href: "/c/doplnky-vyzivy",
    imageSrc:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80",
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
];

export const BENEFITS: BenefitItem[] = [
  {
    id: "benefit-verified",
    title: "Overené produkty",
    description: "Dlhodobo testované značky.",
    icon: "icon-[mdi--shield-check-outline]",
  },
  {
    id: "benefit-delivery",
    title: "Rýchle doručenie",
    description: "Odosielame každý pracovný deň.",
    icon: "icon-[mdi--truck-fast-outline]",
  },
  {
    id: "benefit-support",
    title: "Odborné poradenstvo",
    description: "Pomôžeme s výberom.",
    icon: "icon-[mdi--headset]",
  },
  {
    id: "benefit-loyalty",
    title: "Vernostné výhody",
    description: "Zľavy pre pravidelných zákazníkov.",
    icon: "icon-[mdi--star-circle-outline]",
  },
  {
    id: "benefit-natural",
    title: "Prírodné zloženie",
    description: "Fokus na čisté ingrediencie.",
    icon: "icon-[mdi--leaf-circle-outline]",
  },
  {
    id: "benefit-secure",
    title: "Bezpečný nákup",
    description: "Overené platobné metódy.",
    icon: "icon-[mdi--credit-card-check-outline]",
  },
  {
    id: "benefit-eu",
    title: "SK, CZ, HU, RO",
    description: "Dodávame do viacerých krajín.",
    icon: "icon-[mdi--map-marker-radius-outline]",
  },
  {
    id: "benefit-eco",
    title: "EKO balenie",
    description: "Šetrne k prírode.",
    icon: "icon-[mdi--recycle-variant]",
  },
];
