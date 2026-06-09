import type {
  BlogTeaserItem,
  ProductSectionDefinition,
} from "./homepage.data.types";

export const PRODUCT_SECTIONS: ProductSectionDefinition[] = [
  {
    id: "najoblubenejsie-produkty",
    title: "Najobľúbenejšie produkty",
    viewAllHref: "/c/ine-najpredavanejsie",
  },
  {
    id: "novinky",
    title: "Novinky",
    viewAllHref: "/c/novinky",
  },
  {
    id: "aktuálne-v.zlave",
    title: "Aktuálne v zľave",
    viewAllHref: "/c/vypredaj-zlavy-a-akcie",
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
