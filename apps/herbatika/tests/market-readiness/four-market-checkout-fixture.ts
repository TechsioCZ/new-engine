import type { MarketCode } from "@/lib/market/market-runtime"

export type FourMarketCheckoutFixture = Readonly<{
  countryCode: "CZ" | "HU" | "RO" | "SK"
  currencyCode: "CZK" | "EUR" | "HUF" | "RON"
  host: string
  locale: "cs-CZ" | "hu-HU" | "ro-RO" | "sk-SK"
  market: MarketCode
  privacyPath: string
  publishableKey: string
  publishableKeyId: string
  regionId: string
  salesChannelId: string
  termsPath: string
}>

export const FOUR_MARKET_CHECKOUT_FIXTURES = [
  {
    countryCode: "SK",
    currencyCode: "EUR",
    host: "shop-sk.example.test",
    locale: "sk-SK",
    market: "sk",
    privacyPath: "/ochrana-osobnych-udajov",
    publishableKey: "pk_sk_checkout_acceptance",
    publishableKeyId: "pkid_sk_checkout_acceptance",
    regionId: "reg_sk_checkout_acceptance",
    salesChannelId: "sc_sk_checkout_acceptance",
    termsPath: "/obchodne-podmienky",
  },
  {
    countryCode: "CZ",
    currencyCode: "CZK",
    host: "shop-cz.example.test",
    locale: "cs-CZ",
    market: "cz",
    privacyPath: "/ochrana-osobnich-udaju",
    publishableKey: "pk_cz_checkout_acceptance",
    publishableKeyId: "pkid_cz_checkout_acceptance",
    regionId: "reg_cz_checkout_acceptance",
    salesChannelId: "sc_cz_checkout_acceptance",
    termsPath: "/obchodni-podminky",
  },
  {
    countryCode: "HU",
    currencyCode: "HUF",
    host: "shop-hu.example.test",
    locale: "hu-HU",
    market: "hu",
    privacyPath: "/adatvedelmi-tajekoztato",
    publishableKey: "pk_hu_checkout_acceptance",
    publishableKeyId: "pkid_hu_checkout_acceptance",
    regionId: "reg_hu_checkout_acceptance",
    salesChannelId: "sc_hu_checkout_acceptance",
    termsPath: "/altalanos-szerzodesi-feltetelek",
  },
  {
    countryCode: "RO",
    currencyCode: "RON",
    host: "shop-ro.example.test",
    locale: "ro-RO",
    market: "ro",
    privacyPath: "/politica-de-confidentialitate",
    publishableKey: "pk_ro_checkout_acceptance",
    publishableKeyId: "pkid_ro_checkout_acceptance",
    regionId: "reg_ro_checkout_acceptance",
    salesChannelId: "sc_ro_checkout_acceptance",
    termsPath: "/termeni-si-conditii",
  },
] as const satisfies readonly FourMarketCheckoutFixture[]

export const FOUR_MARKET_CHECKOUT_ENVIRONMENT = Object.freeze(
  Object.fromEntries([
    ["ALLOWED_MARKETS", "sk,cz,hu,ro"],
    ...FOUR_MARKET_CHECKOUT_FIXTURES.flatMap((fixture) => {
      const suffix = fixture.market.toUpperCase()
      return [
        [`MARKET_ACCEPTED_HOSTS_${suffix}`, fixture.host],
        [`MARKET_CANONICAL_ORIGIN_${suffix}`, `https://${fixture.host}`],
        [`MARKET_PUBLISHABLE_KEY_${suffix}`, fixture.publishableKey],
        [`MARKET_PUBLISHABLE_KEY_ID_${suffix}`, fixture.publishableKeyId],
        [`MARKET_REGION_${suffix}`, fixture.regionId],
        [`MARKET_SALES_CHANNEL_${suffix}`, fixture.salesChannelId],
      ]
    }),
  ])
)

export const buildRoNoDebitShippingData = () => ({
  ro_demo_checkout: {
    binding_sha256: "a".repeat(64),
    label: "Plată demo (fără debitare)",
    locale: "ro-RO",
    market: "ro",
    payment_mode: "no-debit-demo",
    provider_id: "pp_system_default",
    schema_version: 1,
    source: "herbatica-ro-demo-commerce-v1",
  },
})
