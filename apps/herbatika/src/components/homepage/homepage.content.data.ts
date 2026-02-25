import type {
  BlogTeaserItem,
  PurposeCategoryItem,
  ProductSectionDefinition,
} from "./homepage.data.types";

export const PRODUCT_SECTIONS: ProductSectionDefinition[] = [
  {
    id: "najpredavanejsie-produkty",
    title: "Najpredávanejšie produkty",
    subtitle: "Produkty, po ktorých zákazníci siahajú najčastejšie.",
  },
  {
    id: "novinky",
    title: "Novinky",
    subtitle: "Čerstvo naskladnené produkty v našej ponuke.",
  },
  {
    id: "atraktivna-v-cene",
    title: "Atraktívna v cene",
    subtitle: "Výber produktov s výhodnou cenou.",
  },
];

export const BLOG_POSTS: BlogTeaserItem[] = [
  {
    id: "blog-1",
    title: "Ako podporiť imunitu počas náročných mesiacov",
    excerpt:
      "Praktické tipy na každodennú rutinu, ktorá pomáha udržať obranyschopnosť v kondícii.",
    href: "/blog/elektrolyty-klucove-mineraly-pre-spravne-fungovanie-tela",
    imageSrc:
      "https://images.unsplash.com/photo-1470549638415-0a0755be0619?auto=format&fit=crop&w=900&q=80",
    topic: "fitness",
    publishedAt: "2025-12-06",
    readingTime: "9 min",
  },
  {
    id: "blog-2",
    title: "Adaptogény: kedy ich zaradiť do svojho režimu",
    excerpt:
      "Prehľad účinných látok a ich praktické využitie pri strese, únave aj výkone.",
    href: "/blog/ashwagandha-adaptogen-pre-rovnovahu-tela-a-mysle",
    imageSrc:
      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=900&q=80",
    topic: "fitness",
    publishedAt: "2025-12-06",
    readingTime: "9 min",
  },
  {
    id: "blog-3",
    title: "Prírodná kozmetika a citlivá pokožka",
    excerpt:
      "Na čo sa pozerať pri výbere šetrnej kozmetiky a ktoré látky sa oplatí sledovať.",
    href: "/blog/prirodna-kozmetika-a-citliva-pokozka",
    imageSrc:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80",
    topic: "fitness",
    publishedAt: "2025-12-06",
    readingTime: "9 min",
  },
];

export const PURPOSE_CATEGORIES: PurposeCategoryItem[] = [
  {
    id: "purpose-kozne-problemy",
    label: "Kožné problémy",
    href: "/c/trapi-ma-kozne-problemy",
    icon: "icon-[mdi--hand-back-right-outline]",
  },
  {
    id: "purpose-mozog-a-nervovy-system",
    label: "Mozog a nervový systém",
    href: "/c/trapi-ma-mozog-a-nervovy-system",
    icon: "icon-[mdi--brain]",
  },
  {
    id: "purpose-imunita",
    label: "Imunita",
    href: "/c/trapi-ma-imunita-a-obranyschopnost",
    icon: "icon-[mdi--shield-check-outline]",
  },
  {
    id: "purpose-klby-a-pohyb",
    label: "Kĺby a pohyb",
    href: "/c/trapi-ma-klby-a-pohybovy-aparat",
    icon: "icon-[mdi--bone]",
  },
  {
    id: "purpose-travenie-a-metabolizmus",
    label: "Trávenie a metabolizmus",
    href: "/c/trapi-ma-travenie-a-metabolizmus",
    icon: "icon-[mdi--stomach]",
  },
  {
    id: "purpose-srdce-a-cievy",
    label: "Srdce a cievy",
    href: "/c/trapi-ma-srdce-a-cievy",
    icon: "icon-[mdi--heart-pulse]",
  },
  {
    id: "purpose-hormonalna-rovnovaha",
    label: "Hormonálna rovnováha",
    href: "/c/trapi-ma-hormonalna-rovnovaha",
    icon: "icon-[mdi--gender-male-female]",
  },
];

export const RECENT_PRODUCT_SKELETON_KEYS = [
  "recent-product-skeleton-1",
  "recent-product-skeleton-2",
  "recent-product-skeleton-3",
  "recent-product-skeleton-4",
] as const;
