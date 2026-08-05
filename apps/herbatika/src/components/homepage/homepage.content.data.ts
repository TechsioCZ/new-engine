import type {
  BlogTeaserItem,
  ProductSectionDefinition,
} from "./homepage.data.types"

export const PRODUCT_SECTIONS = [
  {
    id: "najoblubenejsie-produkty",
    titleKey: "home.product_sections.bestsellers",
    viewAllHref: "/c/ine-najpredavanejsie",
  },
  {
    id: "novinky",
    titleKey: "home.product_sections.new_products",
    viewAllHref: "/c/novinky",
  },
  {
    id: "aktuálne-v.zlave",
    titleKey: "home.product_sections.sale",
    viewAllHref: "/c/vypredaj-zlavy-a-akcie",
  },
] as const satisfies readonly ProductSectionDefinition[]

export const BLOG_POSTS: BlogTeaserItem[] = [
  {
    excerpt:
      "Praktické tipy na každodennú rutinu, ktorá pomáha udržať obranyschopnosť v kondícii.",
    href: "/blog/elektrolyty-klucove-mineraly-pre-spravne-fungovanie-tela",
    id: "blog-1",
    imageSrc:
      "https://images.unsplash.com/photo-1470549638415-0a0755be0619?auto=format&fit=crop&w=900&q=80",
    publishedAt: "2025-12-06",
    readingTime: "9 min",
    title: "Ako podporiť imunitu počas náročných mesiacov",
    topic: "fitness",
  },
  {
    excerpt:
      "Prehľad účinných látok a ich praktické využitie pri strese, únave aj výkone.",
    href: "/blog/ashwagandha-adaptogen-pre-rovnovahu-tela-a-mysle",
    id: "blog-2",
    imageSrc:
      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=900&q=80",
    publishedAt: "2025-12-06",
    readingTime: "9 min",
    title: "Adaptogény: kedy ich zaradiť do svojho režimu",
    topic: "fitness",
  },
  {
    excerpt:
      "Na čo sa pozerať pri výbere šetrnej kozmetiky a ktoré látky sa oplatí sledovať.",
    href: "/blog/prirodna-kozmetika-a-citliva-pokozka",
    id: "blog-3",
    imageSrc:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80",
    publishedAt: "2025-12-06",
    readingTime: "9 min",
    title: "Prírodná kozmetika a citlivá pokožka",
    topic: "fitness",
  },
]
