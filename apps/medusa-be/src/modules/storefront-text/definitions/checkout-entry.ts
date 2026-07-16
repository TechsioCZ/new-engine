import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_CHECKOUT_ENTRY_TEXT_DEFINITIONS = [
  {
    description: "Text důvěryhodnosti bezpečného nákupu v hlavičce checkoutu.",
    key: "checkout.secure_purchase",
    namespace: "checkout",
    values: {
      cz: "Bezpečný nákup",
      hu: "Biztonságos vásárlás",
      ro: "Cumpărături sigure",
      sk: "Bezpečný nákup",
    },
  },
  {
    description: "Titulek výzvy k přihlášení v checkoutu.",
    key: "checkout.login_prompt_title",
    namespace: "checkout",
    values: {
      cz: "Už máte účet Herbatika?",
      hu: "Már van Herbatika-fiókja?",
      ro: "Aveți deja un cont Herbatika?",
      sk: "Už máte účet Herbatika?",
    },
  },
  {
    description: "Text výzvy k přihlášení v checkoutu s odkazem.",
    key: "checkout.login_prompt_description",
    namespace: "checkout",
    values: {
      cz: "<signIn>Přihlaste se</signIn> pro rychlý nákup a slevu na další nákupy.",
      hu: "<signIn>Jelentkezzen be</signIn> a gyorsabb vásárlásért és a további vásárlásokra járó kedvezményért.",
      ro: "<signIn>Autentificați-vă</signIn> pentru cumpărături rapide și reduceri la achizițiile viitoare.",
      sk: "<signIn>Prihláste sa</signIn> pre rýchly nákup a zľavu na ďalšie nákupy.",
    },
  },
  {
    description: "Titulek prázdného košíku v checkoutu.",
    key: "checkout.empty_cart_title",
    namespace: "checkout",
    values: {
      cz: "Košík je prázdný",
      hu: "A kosár üres",
      ro: "Coșul este gol",
      sk: "Košík je prázdny",
    },
  },
  {
    description: "Doplňující text prázdného košíku v checkoutu.",
    key: "checkout.empty_cart_description",
    namespace: "checkout",
    values: {
      cz: "Vyberte si z novinek nebo pokračujte na domovskou stránku. Objednávku dokončíte hned po přidání produktu.",
      hu: "Válasszon az újdonságok közül, vagy térjen vissza a főoldalra. A rendelést a termék kosárba helyezése után azonnal befejezheti.",
      ro: "Alegeți dintre produsele noi sau reveniți la pagina principală. Puteți finaliza comanda imediat după adăugarea unui produs.",
      sk: "Vyberte si z noviniek alebo pokračujte na domovskú stránku. Objednávku dokončíte hneď po pridaní produktu.",
    },
  },
  {
    description: "Akce pro přechod z prázdného checkoutu na nové produkty.",
    key: "checkout.empty_cart_browse_new_products",
    namespace: "checkout",
    values: {
      cz: "Prohlédnout novinky",
      hu: "Újdonságok megtekintése",
      ro: "Vezi produsele noi",
      sk: "Prezrieť novinky",
    },
  },
  {
    description: "Akce pro návrat z prázdného checkoutu na domovskou stránku.",
    key: "checkout.empty_cart_home",
    namespace: "checkout",
    values: {
      cz: "Přejít na domovskou stránku",
      hu: "Ugrás a főoldalra",
      ro: "Mergi la pagina principală",
      sk: "Ísť na domovskú stránku",
    },
  },
  {
    description: "Nadpis doporučených nových produktů v prázdném checkoutu.",
    key: "checkout.empty_cart_recommendations_title",
    namespace: "checkout",
    values: {
      cz: "Novinky, které si můžete přidat do košíku",
      hu: "Újdonságok, amelyeket a kosárba tehet",
      ro: "Produse noi pe care le puteți adăuga în coș",
      sk: "Novinky, ktoré si môžete pridať do košíka",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]
