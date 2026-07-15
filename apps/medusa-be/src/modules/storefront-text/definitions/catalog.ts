import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_CATALOG_TEXT_DEFINITIONS = [
  {
    description: "Popisek řazení produktů podle doporučení.",
    key: "catalog.sort.recommended",
    namespace: "catalog",
    values: {
      cz: "Doporučujeme",
      hu: "Ajánlott",
      ro: "Recomandate",
      sk: "Odporúčame",
    },
  },
  {
    description: "Popisek řazení produktů od nejlevnějších.",
    key: "catalog.sort.price_asc",
    namespace: "catalog",
    values: {
      cz: "Nejlevnější",
      hu: "Legolcsóbb",
      ro: "Cele mai ieftine",
      sk: "Najlacnejšie",
    },
  },
  {
    description: "Popisek řazení produktů od nejdražších.",
    key: "catalog.sort.price_desc",
    namespace: "catalog",
    values: {
      cz: "Nejdražší",
      hu: "Legdrágább",
      ro: "Cele mai scumpe",
      sk: "Najdrahšie",
    },
  },
  {
    description: "Popisek řazení produktů podle prodejnosti.",
    key: "catalog.sort.best_selling",
    namespace: "catalog",
    values: {
      cz: "Nejprodávanější",
      hu: "Legkelendőbb",
      ro: "Cele mai vândute",
      sk: "Najpredávanejšie",
    },
  },
  {
    description: "Popisek řazení produktů od nejnovějších.",
    key: "catalog.sort.newest",
    namespace: "catalog",
    values: {
      cz: "Nejnovější",
      hu: "Legújabb",
      ro: "Cele mai noi",
      sk: "Najnovšie",
    },
  },
  {
    description: "Popisek celkového počtu produktů ve výpisu.",
    key: "catalog.results.items_total",
    namespace: "catalog",
    values: {
      cz: "položek celkem",
      hu: "összesen",
      ro: "articole în total",
      sk: "položiek celkom",
    },
  },
  {
    description: "Prázdný stav kategorie pro zvolený filtr.",
    key: "catalog.results.empty_category",
    namespace: "catalog",
    values: {
      cz: "V této kategorii zatím nejsou dostupné produkty pro zvolený filtr.",
      hu: "Ebben a kategóriában jelenleg nincsenek elérhető termékek a kiválasztott szűrőhöz.",
      ro: "În această categorie nu sunt disponibile momentan produse pentru filtrul selectat.",
      sk: "V tejto kategórii zatiaľ nie sú dostupné produkty pre zvolený filter.",
    },
  },
  {
    description: "Prázdný stav značky pro zvolený filtr.",
    key: "catalog.results.empty_brand",
    namespace: "catalog",
    values: {
      cz: "Tato značka zatím nemá dostupné produkty pro zvolený filtr.",
      hu: "Ehhez a márkához jelenleg nincsenek elérhető termékek a kiválasztott szűrőhöz.",
      ro: "Pentru această marcă nu sunt disponibile momentan produse pentru filtrul selectat.",
      sk: "Táto značka zatiaľ nemá dostupné produkty pre zvolený filter.",
    },
  },
  {
    description: "Chybová hláška pro nenalezenou kategorii.",
    key: "catalog.results.category_not_found",
    namespace: "catalog",
    values: {
      cz: "Kategorii se nepodařilo najít. Zkontrolujte URL nebo vyberte jinou kategorii.",
      hu: "A kategória nem található. Ellenőrizze az URL-t, vagy válasszon másik kategóriát.",
      ro: "Categoria nu a putut fi găsită. Verificați adresa URL sau selectați o altă categorie.",
      sk: "Kategóriu sa nepodarilo nájsť. Skontrolujte URL alebo vyberte inú kategóriu.",
    },
  },
  {
    description: "Chybová hláška při načítání produktů.",
    key: "catalog.errors.products_load_failed",
    namespace: "catalog",
    values: {
      cz: "Načtení produktů selhalo.",
      hu: "A termékek betöltése sikertelen.",
      ro: "Încărcarea produselor a eșuat.",
      sk: "Načítanie produktov zlyhalo.",
    },
  },
  {
    description: "Chybová hláška při načítání kategorií.",
    key: "catalog.errors.categories_load_failed",
    namespace: "catalog",
    values: {
      cz: "Načtení kategorií selhalo.",
      hu: "A kategóriák betöltése sikertelen.",
      ro: "Încărcarea categoriilor a eșuat.",
      sk: "Načítanie kategórií zlyhalo.",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]
