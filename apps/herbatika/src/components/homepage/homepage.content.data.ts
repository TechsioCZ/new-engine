import { buildUrl } from "@/lib/url/builder"
import type { Market } from "@/lib/url/types"
import type {
  BlogTeaserItem,
  ProductSectionDefinition,
} from "./homepage.data.types"

const PRODUCT_SECTION_DATA = [
  {
    id: "najoblubenejsie-produkty",
    titleKey: "home.product_sections.bestsellers",
    categorySlug: "ine-najpredavanejsie",
  },
  {
    id: "novinky",
    titleKey: "home.product_sections.new_products",
    categorySlug: "novinky",
  },
  {
    id: "aktuálne-v.zlave",
    titleKey: "home.product_sections.sale",
    categorySlug: "vypredaj-zlavy-a-akcie",
  },
] as const

const BLOG_POST_DATA = [
  {
    id: "blog-1",
    title: "Ako podporiť imunitu počas náročných mesiacov",
    excerpt:
      "Praktické tipy na každodennú rutinu, ktorá pomáha udržať obranyschopnosť v kondícii.",
    articleSlug: "elektrolyty-klucove-mineraly-pre-spravne-fungovanie-tela",
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
    articleSlug: "ashwagandha-adaptogen-pre-rovnovahu-tela-a-mysle",
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
    articleSlug: "prirodna-kozmetika-a-citliva-pokozka",
    imageSrc:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80",
    topic: "fitness",
    publishedAt: "2025-12-06",
    readingTime: "9 min",
  },
] as const

export const createProductSections = (
  market: Market
): ProductSectionDefinition[] =>
  PRODUCT_SECTION_DATA.map(({ categorySlug, ...section }) => ({
    ...section,
    viewAllHref: buildUrl({ market, kind: "category", slug: categorySlug }),
  }))

export const createBlogPosts = (market: Market): BlogTeaserItem[] =>
  BLOG_POST_DATA.map(({ articleSlug, ...post }) => ({
    ...post,
    href: buildUrl({ market, kind: "article", slug: articleSlug }),
  }))
