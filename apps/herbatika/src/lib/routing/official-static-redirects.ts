import { ROUTE_SEGMENT_REGISTRY } from "@/lib/url/segments"
import type { Market } from "@/lib/url/types"

/**
 * Official Herbatica storefronts (herbatica.sk/.cz/.hu/.ro) publish a set of
 * root-level static/legal pages (loyalty programs, certificates, complaint
 * procedures, privacy notices, store locators, newsletter sign-up, etc.)
 * whose content already exists on this engine as operator-editable Payload
 * "information" pages, reachable under each market's information prefix
 * (for example `sk` -> `/informacie/<slug>`).
 *
 * Authorized by project-owner decision (2026-08-23): every official
 * root-level static/legal URL must resolve on this storefront, and the
 * content must stay Payload-editable rather than hardcoded. This is a
 * deliberate, scoped extension of the issue-#545 "no public legacy routes"
 * rule for exactly this class of URL.
 *
 * This table and resolver are intentionally separate from
 * `legacy-official-redirects.ts`, which remains untouched and stays scoped
 * to the narrower, previously-authorized carve-out: category paths whose
 * slug violates the registry slug grammar (`^[a-z0-9-]+$`, e.g. an
 * underscore). The redirects here are grammar-valid root slugs at a
 * different path depth than their local Payload page, not a grammar
 * violation, so they do not belong in that table.
 *
 * The map is keyed by market, then by the raw official root slug exactly as
 * the official storefront publishes it (lowercase, no leading/trailing
 * slash). The value is the current local information-page slug that owns
 * the equivalent content; the redirect target is rebuilt from the market's
 * own information type prefix, so no market's public grammar is hardcoded
 * here.
 *
 * Entries are verified against the official site and the local Payload page
 * (HTTP 200, topical title/heading match) before being added. Operators
 * extend this table as new official root pages are confirmed to have a
 * matching local Payload page.
 */
export const OFFICIAL_STATIC_PATH_REDIRECTS: Readonly<
  Record<Market, Readonly<Record<string, string>>>
> = Object.freeze({
  cz: Object.freeze({
    // Official https://www.herbatica.cz/certifikaty-produktu/
    "certifikaty-produktu": "certifikaty",
    // Official https://www.herbatica.cz/doprava-platby/
    "doprava-platby": "doprava-a-platby",
    // Official https://www.herbatica.cz/faq/ ("Časté otázky")
    faq: "caste-otazky",
    // Official https://www.herbatica.cz/obaly-v-herbatica/
    "obaly-v-herbatica": "obaly-v-herbatica",
    // Official https://www.herbatica.cz/poou/
    poou: "prohlaseni-o-ochrane-osobnich-udaju",
    // Official https://www.herbatica.cz/prohlaseni-o-ochrane-osobnich-udaju/
    "prohlaseni-o-ochrane-osobnich-udaju":
      "prohlaseni-o-ochrane-osobnich-udaju",
    // Official https://www.herbatica.cz/reklamacni-rad/
    "reklamacni-rad": "reklamacni-rad",
  }),
  hu: Object.freeze({
    // Official https://www.herbatica.hu/a-szemelyes-adatok-vedelmenek-feltetelei/
    // Local page content is titled the same as this official page, and
    // covers the same personal-data-protection subject as
    // `adatvedelmi-nyilatkozat` below.
    "a-szemelyes-adatok-vedelmenek-feltetelei": "adatvedelmi-nyilatkozat",
    // Official https://www.herbatica.hu/adatvedelmi-nyilatkozat/
    "adatvedelmi-nyilatkozat": "adatvedelmi-nyilatkozat",
    // Official https://www.herbatica.hu/csapatunkrol/
    csapatunkrol: "a-csapatunkrol",
    // Official https://www.herbatica.hu/csomagolas-a-herbaticaban/
    "csomagolas-a-herbaticaban": "csomagolas-a-herbaticanal",
    // Official https://www.herbatica.hu/faq/
    faq: "gyakran-ismetelt-kerdesek",
    // Official https://www.herbatica.hu/gyakori-kerdesek--faq/
    "gyakori-kerdesek--faq": "gyakran-ismetelt-kerdesek",
    // Official https://www.herbatica.hu/hirlevel/
    hirlevel: "iratkozzon-fel-hirlevelunkre-es-tartjuk-a-kapcsolatot",
    // Official https://www.herbatica.hu/reklamacios-feltetelek/
    "reklamacios-feltetelek": "reklamacios-szabalyzat",
    // Official https://www.herbatica.hu/szallitas-es-fizetes/
    "szallitas-es-fizetes": "szallitas-es-fizetes",
    // Official https://www.herbatica.hu/tanusitvanyok/
    tanusitvanyok: "tanusitvanyok",
    // Official https://www.herbatica.hu/uzleti-feltetelek/
    "uzleti-feltetelek": "altalanos-szerzodesi-feltetelek",
  }),
  ro: Object.freeze({
    // Official https://www.herbatica.ro/certificatele-produselor-herbatica/
    "certificatele-produselor-herbatica": "certificate",
    // Official https://www.herbatica.ro/declaratie-privind-protectia-datelor-cu-caracter-personal/
    "declaratie-privind-protectia-datelor-cu-caracter-personal":
      "declaratie-privind-protectia-datelor-cu-caracter-personal",
    // Official https://www.herbatica.ro/kontakt/
    kontakt: "contact",
    // Official https://www.herbatica.ro/newsletter/
    newsletter: "aboneaza-te-la-newsletter-si-tinem-legatura",
    // Official https://www.herbatica.ro/reglementari-privind-reclamatiile/
    "reglementari-privind-reclamatiile": "reclamatii-si-returnare",
    // Official https://www.herbatica.ro/transportul-si-plata/
    "transportul-si-plata": "transport-si-plati",
  }),
  sk: Object.freeze({
    // Official https://www.herbatica.sk/certifikaty/
    certifikaty: "certifikaty",
    // Official https://www.herbatica.sk/doprava_platby/
    doprava_platby: "doprava-a-platby",
    // Official https://www.herbatica.sk/faq/
    faq: "faq",
    // Official https://www.herbatica.sk/newsletter/
    newsletter: "newsletter",
    // Official https://www.herbatica.sk/obaly-v-herbatica/
    "obaly-v-herbatica": "obaly-v-herbatica",
    // Official https://www.herbatica.sk/poou/ ("Poučenie o ochrane osobných údajov")
    poou: "ochrana-osobnych-udajov",
    // Official https://www.herbatica.sk/predajne/
    predajne: "predajne",
    // Official https://www.herbatica.sk/reklamacny-poriadok/
    "reklamacny-poriadok": "reklamacia-a-vratenie",
    // Official https://www.herbatica.sk/vernost/
    vernost: "vernost",
  }),
})

/**
 * Resolve the permanent redirect target for an official root-level
 * static/legal path.
 *
 * Only matches a single-segment root path (`/<slug>`) whose lowercased slug
 * is a known official static/legal slug for the market. Any other path
 * shape — no segments, two or more segments, or an unknown slug — returns
 * `null` so the request falls through to normal route resolution.
 */
export const resolveOfficialStaticRedirect = (
  market: Market,
  segments: readonly string[]
): string | null => {
  if (segments.length !== 1) {
    return null
  }
  const informationPrefix =
    ROUTE_SEGMENT_REGISTRY[market].typePrefixes.information
  const target =
    OFFICIAL_STATIC_PATH_REDIRECTS[market][(segments[0] ?? "").toLowerCase()]
  return target ? `/${informationPrefix}/${target}` : null
}
