import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_NAVIGATION_TEXT_DEFINITIONS = [
  {
    description: "Přístupný název hlavní navigace.",
    key: "navigation.primary_aria",
    namespace: "navigation",
    values: {
      cz: "Hlavní navigace",
      hu: "Fő navigáció",
      ro: "Navigare principală",
      sk: "Hlavná navigácia",
    },
  },
  {
    description: "Stav načítání podkategorií v navigačním podmenu.",
    key: "navigation.submenu.loading",
    namespace: "navigation",
    values: {
      cz: "Načítám podkategorie...",
      hu: "Alkategóriák betöltése...",
      ro: "Se încarcă subcategoriile...",
      sk: "Načítavam podkategórie...",
    },
  },
  {
    description: "Label odkazu pro spuštění zákaznického chatu.",
    key: "navigation.start_chat",
    namespace: "navigation",
    values: {
      cz: "Spustit chat",
      hu: "Csevegés indítása",
      ro: "Începe conversația",
      sk: "Spustiť chat",
    },
  },
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
