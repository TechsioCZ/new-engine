import type { StorefrontTextDefinition } from "../configuration"

type StorefrontContentTextDefinition = Omit<
  StorefrontTextDefinition,
  "namespace"
> & {
  namespace: "content"
}

export const STOREFRONT_CONTENT_TEXT_DEFINITIONS = [
  {
    description: "Obecný odkaz pro zobrazení všech položek v obsahové sekci.",
    key: "content.actions.view_all",
    namespace: "content",
  },
  {
    description: "Přístupný název odkazu hero banneru.",
    key: "content.home.hero.link_aria",
    namespace: "content",
  },
  {
    description: "Výchozí nadpis karuselu nákupu podle účelu.",
    key: "content.home.purpose.title",
    namespace: "content",
  },
  {
    description: "Nadpis blogové sekce na domovské stránce.",
    key: "content.home.blog.title",
    namespace: "content",
  },
  {
    description: "Nadpis sekce nejprodávanějších produktů na domovské stránce.",
    key: "content.home.product_sections.bestsellers",
    namespace: "content",
  },
  {
    description: "Nadpis sekce nových produktů na domovské stránce.",
    key: "content.home.product_sections.new_products",
    namespace: "content",
  },
  {
    description: "Nadpis sekce zlevněných produktů na domovské stránce.",
    key: "content.home.product_sections.sale",
    namespace: "content",
  },
  {
    description: "Claim rychlého doručení v benefitní liště domovské stránky.",
    key: "content.home.benefits.fast_delivery",
    namespace: "content",
  },
  {
    description: "Claim garance spokojenosti v benefitní liště domovské stránky.",
    key: "content.home.benefits.satisfaction_guarantee",
    namespace: "content",
  },
  {
    description: "Claim vlastních produktů v benefitní liště domovské stránky.",
    key: "content.home.benefits.own_products",
    namespace: "content",
  },
  {
    description: "Claim důvěry zákazníků v benefitní liště domovské stránky.",
    key: "content.home.benefits.trusted_customers",
    namespace: "content",
  },
  {
    description: "Název blogu v drobečkové navigaci.",
    key: "content.pages.blog",
    namespace: "content",
  },
  {
    description: "Název stránky O nás v drobečkové navigaci.",
    key: "content.pages.about",
    namespace: "content",
  },
  {
    description: "Název FAQ stránky v drobečkové navigaci.",
    key: "content.pages.faq",
    namespace: "content",
  },
  {
    description: "Odkaz z blogové karty na detail článku.",
    key: "content.blog.card.open_article",
    namespace: "content",
  },
  {
    description: "Odkaz pro načtení další stránky blogových článků.",
    key: "content.blog.pagination.load_more",
    namespace: "content",
  },
  {
    description: "Souhrn aktuální a celkové stránky blogu.",
    key: "content.blog.pagination.summary",
    namespace: "content",
  },
  {
    description: "Nadpis sekce dalších blogových článků.",
    key: "content.blog.detail.related_articles",
    namespace: "content",
  },
  {
    description: "Popisek autora blogového článku.",
    key: "content.blog.detail.author",
    namespace: "content",
  },
  {
    description: "Popisek data publikování blogového článku.",
    key: "content.blog.detail.published",
    namespace: "content",
  },
  {
    description: "Popisek doby čtení blogového článku.",
    key: "content.blog.detail.reading_time",
    namespace: "content",
  },
  {
    description: "Nadpis kategorií v postranním panelu blogového článku.",
    key: "content.blog.sidebar.categories",
    namespace: "content",
  },
  {
    description: "Celkový počet položek na FAQ stránce.",
    key: "content.faq.item_count",
    namespace: "content",
  },
  {
    description: "Přístupný popisek hodnocení na stránce O nás.",
    key: "content.about.rating_aria",
    namespace: "content",
  },
] as const satisfies readonly StorefrontContentTextDefinition[]
