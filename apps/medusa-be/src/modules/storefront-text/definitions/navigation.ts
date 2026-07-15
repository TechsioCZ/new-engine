import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_NAVIGATION_TEXT_DEFINITIONS = [
  {
    description: "Přístupný název drobečkové navigace.",
    key: "navigation.breadcrumbs.root_aria",
    namespace: "navigation",
    values: {
      cz: "Cesta na stránce",
      hu: "Navigációs útvonal",
      ro: "Traseu de navigare",
      sk: "Cesta na stránke",
    },
  },
  {
    description: "Odkaz na domovskou stránku v drobečkové navigaci.",
    key: "navigation.breadcrumbs.home",
    namespace: "navigation",
    values: {
      cz: "Domů",
      hu: "Főoldal",
      ro: "Acasă",
      sk: "Domov",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]
