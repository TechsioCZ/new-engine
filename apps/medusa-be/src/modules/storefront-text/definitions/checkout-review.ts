import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_CHECKOUT_REVIEW_TEXT_DEFINITIONS = [
  {
    description: "Krátký popisek zákaznické poznámky v rekapitulaci objednávky.",
    key: "checkout.review_customer_note",
    namespace: "checkout",
    values: {
      cz: "Poznámka",
      hu: "Megjegyzés",
      ro: "Notă",
      sk: "Poznámka",
    },
  },
  {
    description: "Souhlas se zasíláním marketingových sdělení v rekapitulaci objednávky.",
    key: "checkout.review_marketing_consent",
    namespace: "checkout",
    values: {
      cz: "Souhlasím se zasíláním marketingových sdělení",
      hu: "Hozzájárulok marketinginformációk küldéséhez",
      ro: "Sunt de acord să primesc comunicări de marketing",
      sk: "Súhlasím so zasielaním marketingových informácií",
    },
  },
  {
    description: "Souhlas se zasláním dotazníku spokojenosti Heureka.",
    key: "checkout.review_heureka_consent",
    namespace: "checkout",
    values: {
      cz: "Souhlasím se zasláním dotazníku spokojenosti Heureka",
      hu: "Hozzájárulok a Heureka elégedettségi kérdőívének elküldéséhez",
      ro: "Sunt de acord să primesc chestionarul de satisfacție Heureka",
      sk: "Súhlasím so zaslaním dotazníka spokojnosti Heureka",
    },
  },
  {
    description: "Potvrzení obchodních podmínek a zásad ochrany osobních údajů s odkazy.",
    key: "checkout.review_legal_confirmation",
    namespace: "checkout",
    values: {
      cz: "Potvrzuji, že jsem se seznámil s <terms>obchodními podmínkami</terms>, porozuměl jsem jejich obsahu a v plném rozsahu s nimi souhlasím. Seznámil jsem se se <privacy>zásadami ochrany osobních údajů</privacy>.",
      hu: "Megerősítem, že megismertem és megértettem az <terms>általános szerződési feltételeket</terms>, és teljes mértékben elfogadom azokat. Megismertem az <privacy>adatvédelmi szabályzatot</privacy>.",
      ro: "Confirm că am citit și am înțeles <terms>termenii și condițiile</terms> și că îi accept în totalitate. Am consultat <privacy>politica de confidențialitate</privacy>.",
      sk: "Potvrdzujem, že som sa oboznámil s <terms>obchodnými podmienkami</terms>, porozumel som ich obsahu a v celom rozsahu s nimi súhlasím. Oboznámil som sa so <privacy>zásadami ochrany osobných údajov</privacy>.",
    },
  },
  {
    description: "Upozornění na neuložené povinné údaje v rekapitulaci objednávky.",
    key: "checkout.review_missing_required_details",
    namespace: "checkout",
    values: {
      cz: "Některé povinné údaje ještě nejsou uložené.",
      hu: "Néhány kötelező adat még nincs elmentve.",
      ro: "Unele date obligatorii nu sunt încă salvate.",
      sk: "Niektoré povinné údaje ešte nie sú uložené.",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]
