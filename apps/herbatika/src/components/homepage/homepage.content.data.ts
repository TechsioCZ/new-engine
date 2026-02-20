import type {
  BlogTeaserItem,
  ProductSectionDefinition,
  ReviewItem,
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

export const REVIEWS: ReviewItem[] = [
  {
    id: "review-1",
    author: "Veronika M.",
    title: "Rýchle doručenie a kvalitné produkty",
    message:
      "Objednávka prišla rýchlo, produkty boli dobre zabalené a kvalita je výborná.",
    rating: 5,
  },
  {
    id: "review-2",
    author: "Peter H.",
    title: "Skvelý výber doplnkov",
    message:
      "Našiel som presne to, čo som potreboval. Oceňujem detailné popisy produktov.",
    rating: 4.5,
  },
  {
    id: "review-3",
    author: "Jana K.",
    title: "Príjemná zákaznícka podpora",
    message:
      "Pomohli mi s výberom a poradili vhodnú kombináciu produktov. Odporúčam.",
    rating: 5,
  },
];

export const BLOG_POSTS: BlogTeaserItem[] = [
  {
    id: "blog-1",
    title: "Ako podporiť imunitu počas náročných mesiacov",
    excerpt:
      "Praktické tipy na každodennú rutinu, ktorá pomáha udržať obranyschopnosť v kondícii.",
    href: "/blog",
    imageSrc:
      "https://images.unsplash.com/photo-1470549638415-0a0755be0619?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "blog-2",
    title: "Adaptogény: kedy ich zaradiť do svojho režimu",
    excerpt:
      "Prehľad účinných látok a ich praktické využitie pri strese, únave aj výkone.",
    href: "/blog",
    imageSrc:
      "https://images.unsplash.com/photo-1542444459-db63c773c245?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "blog-3",
    title: "Prírodná kozmetika a citlivá pokožka",
    excerpt:
      "Na čo sa pozerať pri výbere šetrnej kozmetiky a ktoré látky sa oplatí sledovať.",
    href: "/blog",
    imageSrc:
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=900&q=80",
  },
];

export const RECENT_PRODUCT_SKELETON_KEYS = [
  "recent-product-skeleton-1",
  "recent-product-skeleton-2",
  "recent-product-skeleton-3",
  "recent-product-skeleton-4",
] as const;
