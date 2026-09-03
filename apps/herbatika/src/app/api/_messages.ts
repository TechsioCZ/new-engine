import type { HerbatikaMarketCode } from "@/lib/storefront/market-context"

export type StorefrontApiMessages = Readonly<{
  blogListingUnavailable: string
  checkoutAccessFailed: string
  gatewayConfigurationFailed: string
  gatewayInvalidPath: string
  gatewayJsonOnly: string
  gatewayMethodNotAllowed: string
  gatewayRedirectRejected: string
  gatewayRequestBodyTooLarge: string
  gatewayRequestFailed: string
  gatewayRequestTimedOut: string
  gatewayResourceUnavailable: string
  gatewayResponseTooLarge: string
  gatewayScopeNotAllowed: string
  gatewayStorefrontPathUnavailable: string
  gatewayValidJsonRequired: string
  invalidConsentRequest: string
  orderPaymentDetailsUnavailable: string
  paymentReturnNotFound: string
  sameOriginRequired: string
}>

const SK_API_MESSAGES: StorefrontApiMessages = {
  blogListingUnavailable: "Zoznam článkov je dočasne nedostupný.",
  checkoutAccessFailed: "Požiadavku v pokladni sa nepodarilo spracovať.",
  gatewayConfigurationFailed: "Konfigurácia brány obchodu zlyhala.",
  gatewayInvalidPath: "Neplatná cesta API obchodu.",
  gatewayJsonOnly: "Prijímajú sa iba požiadavky vo formáte JSON.",
  gatewayMethodNotAllowed:
    "Táto metóda nie je pre danú cestu API obchodu povolená.",
  gatewayRedirectRejected: "Presmerovanie API obchodu bolo zamietnuté.",
  gatewayRequestBodyTooLarge: "Telo požiadavky je príliš veľké.",
  gatewayRequestFailed: "Požiadavka API obchodu zlyhala.",
  gatewayRequestTimedOut: "Časový limit požiadavky API obchodu vypršal.",
  gatewayResourceUnavailable: "Požadovaný zdroj obchodu nie je dostupný.",
  gatewayResponseTooLarge: "Odpoveď API obchodu je príliš veľká.",
  gatewayScopeNotAllowed: "Trhový rozsah požiadavky nie je povolený.",
  gatewayStorefrontPathUnavailable: "Cesta API obchodu nie je dostupná.",
  gatewayValidJsonRequired: "Telo požiadavky musí obsahovať platný JSON.",
  invalidConsentRequest: "Neplatná požiadavka na súhlas.",
  orderPaymentDetailsUnavailable: "Platobné údaje objednávky nie sú dostupné.",
  paymentReturnNotFound: "Výsledok platby sa nenašiel.",
  sameOriginRequired: "Požiadavka musí pochádzať z rovnakého webu.",
}

const CZ_API_MESSAGES: StorefrontApiMessages = {
  blogListingUnavailable: "Seznam článků je dočasně nedostupný.",
  checkoutAccessFailed: "Požadavek v pokladně se nepodařilo zpracovat.",
  gatewayConfigurationFailed: "Konfigurace brány obchodu selhala.",
  gatewayInvalidPath: "Neplatná cesta API obchodu.",
  gatewayJsonOnly: "Jsou přijímány pouze požadavky ve formátu JSON.",
  gatewayMethodNotAllowed:
    "Tato metoda není pro danou cestu API obchodu povolena.",
  gatewayRedirectRejected: "Přesměrování API obchodu bylo zamítnuto.",
  gatewayRequestBodyTooLarge: "Tělo požadavku je příliš velké.",
  gatewayRequestFailed: "Požadavek API obchodu selhal.",
  gatewayRequestTimedOut: "Vypršel časový limit požadavku API obchodu.",
  gatewayResourceUnavailable: "Požadovaný zdroj obchodu není dostupný.",
  gatewayResponseTooLarge: "Odpověď API obchodu je příliš velká.",
  gatewayScopeNotAllowed: "Tržní rozsah požadavku není povolen.",
  gatewayStorefrontPathUnavailable: "Cesta API obchodu není dostupná.",
  gatewayValidJsonRequired: "Tělo požadavku musí obsahovat platný JSON.",
  invalidConsentRequest: "Neplatný požadavek na souhlas.",
  orderPaymentDetailsUnavailable: "Platební údaje objednávky nejsou dostupné.",
  paymentReturnNotFound: "Výsledek platby nebyl nalezen.",
  sameOriginRequired: "Požadavek musí pocházet ze stejného webu.",
}

const HU_API_MESSAGES: StorefrontApiMessages = {
  blogListingUnavailable:
    "A blogbejegyzések listája átmenetileg nem érhető el.",
  checkoutAccessFailed: "A pénztári kérést nem sikerült feldolgozni.",
  gatewayConfigurationFailed:
    "Az áruház API-átjárójának beállítása sikertelen.",
  gatewayInvalidPath: "Érvénytelen áruházi API-útvonal.",
  gatewayJsonOnly: "Csak JSON formátumú kérések fogadhatók el.",
  gatewayMethodNotAllowed:
    "Ez a metódus nem engedélyezett ezen az áruházi API-útvonalon.",
  gatewayRedirectRejected: "Az áruházi API átirányítása elutasítva.",
  gatewayRequestBodyTooLarge: "A kérés törzse túl nagy.",
  gatewayRequestFailed: "Az áruházi API-kérés sikertelen.",
  gatewayRequestTimedOut: "Az áruházi API-kérés túllépte az időkorlátot.",
  gatewayResourceUnavailable: "A kért áruházi erőforrás nem érhető el.",
  gatewayResponseTooLarge: "Az áruházi API válasza túl nagy.",
  gatewayScopeNotAllowed: "A kérés piaci hatóköre nem engedélyezett.",
  gatewayStorefrontPathUnavailable: "Az áruházi API-útvonal nem érhető el.",
  gatewayValidJsonRequired:
    "A kérés törzsének érvényes JSON-t kell tartalmaznia.",
  invalidConsentRequest: "Érvénytelen hozzájárulási kérés.",
  orderPaymentDetailsUnavailable: "A rendelés fizetési adatai nem érhetők el.",
  paymentReturnNotFound: "A fizetés eredménye nem található.",
  sameOriginRequired: "A kérésnek ugyanarról a webhelyről kell érkeznie.",
}

const RO_API_MESSAGES: StorefrontApiMessages = {
  blogListingUnavailable: "Lista articolelor este temporar indisponibilă.",
  checkoutAccessFailed:
    "Cererea de finalizare a comenzii nu a putut fi procesată.",
  gatewayConfigurationFailed: "Configurarea gateway-ului magazinului a eșuat.",
  gatewayInvalidPath: "Cale API a magazinului invalidă.",
  gatewayJsonOnly: "Sunt acceptate doar cereri în format JSON.",
  gatewayMethodNotAllowed:
    "Această metodă nu este permisă pentru calea API a magazinului.",
  gatewayRedirectRejected: "Redirecționarea API a magazinului a fost respinsă.",
  gatewayRequestBodyTooLarge: "Corpul cererii este prea mare.",
  gatewayRequestFailed: "Cererea către API-ul magazinului a eșuat.",
  gatewayRequestTimedOut:
    "Cererea către API-ul magazinului a depășit timpul permis.",
  gatewayResourceUnavailable:
    "Resursa solicitată a magazinului nu este disponibilă.",
  gatewayResponseTooLarge: "Răspunsul API al magazinului este prea mare.",
  gatewayScopeNotAllowed: "Domeniul de piață al cererii nu este permis.",
  gatewayStorefrontPathUnavailable:
    "Calea API a magazinului nu este disponibilă.",
  gatewayValidJsonRequired: "Corpul cererii trebuie să conțină JSON valid.",
  invalidConsentRequest: "Cerere de consimțământ invalidă.",
  orderPaymentDetailsUnavailable:
    "Detaliile de plată ale comenzii nu sunt disponibile.",
  paymentReturnNotFound: "Rezultatul plății nu a fost găsit.",
  sameOriginRequired: "Cererea trebuie să provină de pe același site.",
}

const API_MESSAGES_BY_MARKET = {
  cz: CZ_API_MESSAGES,
  hu: HU_API_MESSAGES,
  ro: RO_API_MESSAGES,
  sk: SK_API_MESSAGES,
} as const satisfies Record<HerbatikaMarketCode, StorefrontApiMessages>

export const resolveStorefrontApiMessages = (
  market: HerbatikaMarketCode
): StorefrontApiMessages => {
  if (!Object.hasOwn(API_MESSAGES_BY_MARKET, market)) {
    throw new Error("Unsupported storefront API market")
  }

  return API_MESSAGES_BY_MARKET[market]
}
