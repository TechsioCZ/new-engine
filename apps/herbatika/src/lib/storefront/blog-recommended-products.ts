interface BlogRecommendedProductsConfig {
  categoryHandles: string[]
  limit?: number
}

const HERBAL_EXTRACTS_CATEGORY_HANDLE = "doplnky-vyzivy-bylinne-extrakty"

const BLOG_RECOMMENDED_PRODUCTS_BY_SLUG: Partial<
  Record<string, BlogRecommendedProductsConfig>
> = {
  "adaptogeny-kedy-ich-zaradit-do-svojho-rezimu": {
    categoryHandles: [
      "doplnky-vyzivy-adaptogeny",
      HERBAL_EXTRACTS_CATEGORY_HANDLE,
    ],
    limit: 10,
  },
  "ashwagandha-adaptogen-pre-rovnovahu-tela-a-mysle": {
    categoryHandles: [
      "doplnky-vyzivy-adaptogeny",
      HERBAL_EXTRACTS_CATEGORY_HANDLE,
    ],
    limit: 10,
  },
  "detox-pecene-bez-extremov": {
    categoryHandles: [
      "trapi-ma-travenie-a-metabolizmus-pecen-a-zlcnik",
      HERBAL_EXTRACTS_CATEGORY_HANDLE,
    ],
    limit: 10,
  },
  "elektrolyty-klucove-mineraly-pre-spravne-fungovanie-tela": {
    categoryHandles: [
      "doplnky-vyzivy-vitaminy-a-mineraly",
      "doplnky-vyzivy-lipozomalne-vitaminy",
    ],
    limit: 10,
  },
  "hormonalna-rovnovaha-a-kazdodenny-rezim": {
    categoryHandles: [
      "trapi-ma-hormonalna-rovnovaha-zenske-zdravie-2",
      "trapi-ma-hormonalna-rovnovaha-stitna-zlaza",
    ],
    limit: 10,
  },
  "kolagen-pre-klby-a-vaziva": {
    categoryHandles: [
      "trapi-ma-klby-a-pohybovy-aparat-klby",
      "trapi-ma-klby-a-pohybovy-aparat-chrupavky",
    ],
    limit: 10,
  },
  "lymfaticky-system-a-regeneracia": {
    categoryHandles: [
      "trapi-ma-srdce-a-cievy-lymfaticky-system-2",
      "trapi-ma-srdce-a-cievy-krcove-zily-2",
    ],
    limit: 10,
  },
  "mineraly-pre-aktivny-zivot-a-sport": {
    categoryHandles: [
      "doplnky-vyzivy-vitaminy-a-mineraly",
      "doplnky-vyzivy-lipozomalne-vitaminy",
    ],
    limit: 10,
  },
  "prirodna-kozmetika-a-citliva-pokozka": {
    categoryHandles: [
      "prirodna-kozmetika-pletova-kozmetika-specialna-starostlivost-o-plet",
      "prirodna-kozmetika-pletova-kozmetika-pletove-kremy",
    ],
    limit: 10,
  },
  "probiotika-a-travenie-kazdy-den": {
    categoryHandles: [
      "doplnky-vyzivy-probiotika-a-prebiotika",
      "trapi-ma-travenie-a-metabolizmus-creva-a-crevna-mikroflora",
    ],
    limit: 10,
  },
  "srdce-a-cievy-ako-podporit-obeh-prirodzene": {
    categoryHandles: [
      "trapi-ma-srdce-a-cievy-cholesterol",
      "trapi-ma-srdce-a-cievy-vysoky-krvny-tlak",
    ],
    limit: 10,
  },
  "travenie-a-metabolizmus-ako-zacat-od-zakladu": {
    categoryHandles: [
      "trapi-ma-travenie-a-metabolizmus-travenie-a-zaludok",
      "trapi-ma-travenie-a-metabolizmus-creva-a-crevna-mikroflora",
    ],
    limit: 10,
  },
}
export const getBlogRecommendedProductsConfig = (
  slug: string,
): { categoryHandles: string[]; limit?: number } | null =>
  BLOG_RECOMMENDED_PRODUCTS_BY_SLUG[slug] ?? null
