const range = (prefix, count) =>
  Array.from(
    { length: count },
    (_, index) => `${prefix}${String(index + 1).padStart(2, "0")}`
  )

export const REQUIRED_ROWS = Object.freeze([
  ...range("U", 42),
  ...range("I", 44),
  ...range("E", 30),
])

const group = (rows, assertions) =>
  Object.fromEntries(rows.split(" ").map((row) => [row, assertions]))

export const ROW_ASSERTIONS = Object.freeze({
  ...group("U01 U02 U03 U31 U33 U34 U41", [
    "source.proxy-and-market-boundary",
    "wire.host-method-and-spoofing",
  ]),
  ...group("U04 U05 U06 U09 U10 U12 U13 U14 U28 U32", [
    "source.segment-and-public-url-contract",
  ]),
  ...group("U07 U08 U24 U25 U27", ["source.slug-and-registry-invariants"]),
  ...group("U11 U42", [
    "source.parsed-path-safety",
    "wire.raw-request-boundary",
  ]),
  ...group("U15 U16 U17 U18 U19 U20 U21 U36 U37 U38 U39", [
    "source.query-contract",
    "wire.query-normalization",
  ]),
  ...group("U22 U23 U29", ["source.seo-contract", "wire.html-and-system-seo"]),
  ...group("U26 U40", [
    "source.discriminated-read-contract",
    "wire.dependency-outages",
  ]),
  ...group("U30", ["source.cache-and-invalidation-contract"]),
  ...group("U35", [
    "source.proxy-and-market-boundary",
    "wire.host-method-and-spoofing",
  ]),

  ...group("I01 I05 I06 I08", [
    "source.resolver-integration",
    "wire.redirect-and-method-contract",
  ]),
  ...group("I02 I03", [
    "source.catalog-projection-integration",
    "wire.html-and-system-seo",
  ]),
  ...group("I04", [
    "source.catalog-projection-integration",
    "source.cache-and-invalidation-contract",
  ]),
  ...group("I07", [
    "source.resolver-integration",
    "wire.pages-status-and-metadata",
  ]),
  ...group("I09 I33 I41", [
    "source.catalog-projection-integration",
    "wire.market-content-isolation",
  ]),
  ...group("I10 I11 I42", [
    "source.discriminated-read-contract",
    "wire.dependency-outages",
  ]),
  ...group("I12 I13 I37 I39", [
    "source.proxy-and-market-boundary",
    "wire.host-method-and-spoofing",
  ]),
  ...group("I14 I15 I16 I43", [
    "source.seo-contract",
    "wire.html-and-system-seo",
  ]),
  ...group("I17 I18 I19 I20 I21 I22 I23 I24 I25 I40", [
    "source.query-and-seo-integration",
    "wire.query-normalization",
  ]),
  ...group("I26 I27", [
    "source.private-flow-security",
    "wire.secret-non-leakage",
  ]),
  ...group("I28 I38", [
    "source.proxy-and-market-boundary",
    "wire.host-method-and-spoofing",
  ]),
  ...group("I29", [
    "source.segment-and-public-url-contract",
    "wire.raw-request-boundary",
  ]),
  ...group("I30 I31 I32", [
    "source.system-seo-integration",
    "wire.html-and-system-seo",
    "wire.sitemap-crawl",
  ]),
  ...group("I34", [
    "source.cache-and-invalidation-contract",
    "wire.lifecycle-invalidation",
  ]),
  ...group("I35", ["source.segment-and-public-url-contract"]),
  ...group("I36", [
    "source.segment-and-public-url-contract",
    "wire.four-host-parity",
  ]),
  ...group("I44", [
    "source.empty-legacy-inventory",
    "wire.empty-legacy-manifest",
  ]),

  ...group("E01 E02", [
    "wire.pages-status-and-metadata",
    "wire.html-and-system-seo",
  ]),
  ...group("E03 E04 E05 E06", ["wire.pages-status-and-metadata"]),
  ...group("E07", [
    "wire.pages-status-and-metadata",
    "wire.redirect-and-method-contract",
  ]),
  ...group("E08 E09", [
    "wire.redirect-and-method-contract",
    "wire.query-normalization",
  ]),
  ...group("E10 E11", ["wire.query-normalization"]),
  ...group("E12", [
    "wire.html-and-system-seo",
    "wire.market-content-isolation",
  ]),
  ...group("E13", ["wire.market-content-isolation"]),
  ...group("E14", ["wire.secret-non-leakage"]),
  ...group("E15", [
    "wire.raw-request-boundary",
    "wire.host-method-and-spoofing",
  ]),
  ...group("E16 E17", ["wire.raw-request-boundary"]),
  ...group("E18 E29", ["wire.html-and-system-seo", "wire.four-host-parity"]),
  ...group("E19", ["wire.sitemap-crawl"]),
  ...group("E20", ["wire.dependency-outages"]),
  ...group("E21", ["wire.lifecycle-invalidation"]),
  ...group("E22", ["source.release-config", "wire.pages-status-and-metadata"]),
  ...group("E23 E24", ["wire.internal-link-crawl"]),
  ...group("E25 E27", ["wire.pages-status-and-metadata"]),
  ...group("E26", ["wire.market-content-isolation"]),
  ...group("E28", [
    "wire.document-navigation",
    "wire.browser-document-navigation",
  ]),
  ...group("E30", [
    "wire.lifecycle-invalidation",
    "wire.redirect-and-method-contract",
    "wire.internal-link-crawl",
  ]),
})
