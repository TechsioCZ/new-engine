import type { ProductSectionDefinition } from "./homepage.data.types"

export const PRODUCT_SECTIONS: ProductSectionDefinition[] = [
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
]
