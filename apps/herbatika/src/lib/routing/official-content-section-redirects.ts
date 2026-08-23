import { ROUTE_SEGMENT_REGISTRY } from "@/lib/url/segments"
import type { Market } from "@/lib/url/types"

/**
 * Official Herbatica storefronts publish two content sections whose articles
 * have already been imported as Payload blog articles under this engine,
 * with IDENTICAL slugs, serving 200 at each market's blog detail route
 * (`/<blogPrefix>/<slug>`, where `<blogPrefix>` is the market's registry
 * `typePrefixes.advice` value, currently `blog` for every market):
 *
 *  - herbatica.sk `/magazin/<slug>`         (75 articles)
 *  - herbatica.sk `/slovnik-pojmov/<slug>`  (134 glossary terms: 120 with an
 *    identical local slug, 14 that redirect to a `<slug>-pojem` local slug)
 *  - herbatica.cz `/magazin/<slug>`         (64 articles)
 *
 * Authorized by project-owner decision (2026-08-23): "model magazin +
 * slovnik-pojmov sections". This is a scoped extension of the issue-#545
 * "no public legacy routes / clean greenfield cutover" rule, mirroring the
 * carve-out already granted for `official-static-redirects.ts` — the
 * content already exists locally under an operator-editable Payload record
 * with the exact same slug, so redirecting the official section path to the
 * local blog path serves real, verified content rather than resurrecting a
 * dead legacy route.
 *
 * This table and resolver are intentionally separate from both
 * `legacy-official-redirects.ts` (grammar-invalid legacy category slugs)
 * and `official-static-redirects.ts` (root-level static/legal pages whose
 * local slug differs from the official slug). Here the local slug is always
 * identical to the official slug, and the redirect only changes the path
 * prefix (`magazin` / `slovnik-pojmov` -> the market's blog prefix).
 *
 * CRITICAL: this is an explicit slug allow-list, not a wildcard redirect of
 * the whole section prefix. 14 official `slovnik-pojmov` slugs originally
 * collided with pre-existing, DIFFERENT local articles that already owned
 * those same slugs under `/blog/<slug>`: brusnica-obycajna, cakankova-kava,
 * elektrolyty, ginkgo-biloba, kapucinka-vacsia, koenzym-q10, kolagen,
 * kreatin, kyselina-listova, praslicka-rolna, psyllium, taurin, vitamin-a,
 * zelezo. Owner decision (2026-08-23, "Create slovník with -pojem suffix")
 * authorized importing these 14 terms as NEW Payload articles under a
 * suffixed local slug (`<slug>-pojem`) instead of skipping them, so the
 * official term still resolves to real, verified glossary content rather
 * than 404ing or overwriting the unrelated pre-existing article. These 14
 * are NOT in `SK_SLOVNIK_POJMOV_SLUGS` (their local slug is not identical to
 * the official slug); they live in `SK_SLOVNIK_POJMOV_SUFFIXED_SLUGS`
 * instead, an official-slug -> local-slug exception map consulted before the
 * identity set. A 15th candidate, karotenoidy, needed no import: its
 * official term already exactly matches a pre-existing local article (same
 * title, same slug), so it is a normal identity entry in
 * `SK_SLOVNIK_POJMOV_SLUGS`. Any slug in neither structure MUST fall through
 * to normal route resolution (which currently 404s), never redirect.
 *
 * Slug lists were generated from a verified 258-entry import map
 * (`{market, officialPath, localPath}`) where every `localPath` was
 * programmatically confirmed to equal `/blog/<same-slug-as-officialPath>`
 * (or, for the 14 suffixed exceptions, `/blog/<slug>-pojem`) before this
 * table was written. Operators extend this table only after the same
 * verification (official 200, local Payload article 200, matching slug) for
 * newly imported articles/terms.
 */

const SK_MAGAZIN_SLUGS: ReadonlySet<string> = new Set([
  "7-domacich-receptov-ktore-zatocia-s-chripkou",
  "ako-dlho-trva-chripka-u-dospelych",
  "ako-jest-granatove-jablko",
  "ako-nepribrat-cez-vianoce",
  "ako-otehotniet-pravda-ktoru-vam-nikto-nepovedal",
  "ako-rychlo-schudnut",
  "ako-schudnut-po-porode-bez-trapenia",
  "ako-schudnut-z-brucha-po-50-tke",
  "ako-zastavit-zvracanie",
  "ako-znizit-cholesterol-za-26-dni-tieto-3-zmeny-urobia-najvacsi-rozdiel",
  "babske-recepty-na-studene-nohy",
  "babske-recepty-na-zdravy-pankreas",
  "bmi-kalkulacka",
  "bolest-halvy-v-tehotenstve",
  "budik-o-hodinu-spat-preco-sa-to-deje",
  "bylinky-ktore-by-vyriesili-pondelky-stres-aj-lenivost-svet-by-bol-hned-krajsi",
  "bylinky-na-pankreas",
  "chudnutie",
  "co-na-obed-bez-masa",
  "co-pomaha-na-caste-mocenie",
  "co-si-zbalit-na-dovolenku",
  "co-upiect-na-nedelu-3-sladke-napady",
  "detox-tela",
  "dietne-jedla-pri-roznych-ochoreniach",
  "graviola",
  "guava-tropicka-superplodina-neuverite-co-dokaze-s-vasim-telom",
  "hladina-cukru-v-krvi",
  "idealna-vaha-podla-veku-a-vysky",
  "ivan-caj-napoj-severu-ktory-vas-upokoji-ocisti-a-posilni",
  "jesenny-soplik-utoci-slovaci-objavili-caj-ktory-ho-zastavi",
  "kruhy-pod-ocami",
  "ktore-potraviny-sposobuju-palenie-zahy",
  "kurkuma-ucinky",
  "longevity",
  "lunarny-kalendar",
  "mala-stipka-velky-efekt-co-dokaze-kajenske-korenie-s-telom",
  "mate-mozgovu-hmlu-toto-je-dovod-preco-sa-neviete-sustredit",
  "najlepsie-vianocne-darceky-pre-muzov",
  "nejeme-ich-dost-strukoviny-a-ich-prekvapive-ucinky-na-zdravie",
  "odvodnenie-organizmu",
  "podpora-erekcie-bez-hanby",
  "pouzivate-lubovnikovy-olej-zle-tato-chyba-znizuje-ucinok-na-minimum",
  "preco-by-malo-byt-sladke-drievko-sucastou-domacej-bylinkovej-lekarne",
  "priznaky-tehotenstva-prvy-tyzden",
  "prvy-sex-co-ocakavat",
  "quercetin",
  "quinoa",
  "recepty-na-leto-4-svieze-jedla",
  "recepty-na-znizenie-kyseliny-mocovej",
  "rem-spanok",
  "shilajit-pod-lupou-povod-ucinky-a-spravne-uzivanie",
  "slovaci-objavili-stary-recept-vraj-vylieci-chripku-do-24-hodin",
  "slovensky-stand-up-s-horuckou-15-genialnych-hlasok-ktore-napisal-sam-zivot",
  "smiech-lieci-vtipy-ktore-vas-rozosmeju-aj-s-teplotou-38-5",
  "sokujuca-pravda-toto-piju-babicky-aby-nikdy-neochoreli",
  "spime-o-hodinu-dlhsie-ale-co-to-spravi-s-nasim-telom",
  "superpotravina-menom-cvikla",
  "tocenie-hlavy",
  "toto-vam-o-zenskom-libide-nepovedali",
  "trapi-vas-stres-toto-by-ste-mali-vediet-skor-nez-vas-zastavi",
  "trapia-vas-popraskane-paty",
  "trpnutie-noh",
  "uzivate-probiotika-mozno-netusite-co-vsetko-robia-vo-vasom-tele",
  "vedci-odhalili-preco-na-jesen-starneme-rychlejsie-ako-to-zvratit",
  "vianocne-darceky-pre-zeny",
  "vitaminy-na-vlasy",
  "zabudnite-na-lieky-z-lekarne-poznate-koren-ktory-vas-postavi-na-nohy-za-par-dni",
  "zabudnuta-sila-dateliny-prirodna-odpoved-na-zensku-rovnovahu",
  "zastavte-vypadavanie-vlasov-prirodzene",
  "zazracny-napoj-slovaci-nan-nedaju-dopustit",
  "zazrak-na-pockanie-rakytnik-kazdy-den",
  "zdravie-z-kopanic",
  "zelezo-v-potravinach",
  "zlata-zila",
  "zlcnikova-dieta-ktora-chuti-zbavte-sa-bolesti-bez-chemie",
])

const CZ_MAGAZIN_SLUGS: ReadonlySet<string> = new Set([
  "babickine-recepty-na-zdravou-slinivku",
  "babske-recepty-na-studene-nohy",
  "bmi-kalkulacka",
  "bolest-hlavy-v-tehotenstvi",
  "brneni-nohou",
  "bylinky-ktere-by-vyresili-pondelky-stres-i-lenost-svet-by-byl-hned-hezci",
  "bylinky-na-pankreas",
  "co-k-obedu-bez-masa",
  "co-pomaha-na-caste-moceni",
  "co-si-sbalit-na-dovolenou",
  "co-upect-v-nedeli-3-sladke-recepty",
  "detox-tela",
  "dietni-jidla-pri-ruznych-onemocnenich",
  "graviola",
  "guava-tropicka-superplodina-neuveris-co-dokaze-s-tvym-telem",
  "hladina-cukru-v-krvi",
  "hubnuti",
  "idealni-vaha-podle-veku-a-vysky",
  "ivan-caj-napoj-severu-ktery-vas-uklidni-procisti-a-posili",
  "jak-dlouho-trva-chripka-u-dospelych",
  "jak-jist-granatove-jablko",
  "jak-nepribrat-o-vanocich",
  "jak-otehotnet-pravda-kterou-vam-nikdo-nerekl",
  "jak-rychle-zhubnout",
  "jak-snizit-cholesterol-za-26-dni-tyto-3-zmeny-udelaji-nejvetsi-rozdil",
  "jak-zastavit-zvraceni",
  "jak-zhubnout-bricho-po-padesatce",
  "jak-zhubnout-po-porodu-bez-trapeni",
  "kruhy-pod-ocima",
  "ktere-potraviny-zpusobuji-paleni-zahy",
  "kurkuma-ucinky",
  "longevity",
  "lunarni-kalendar",
  "mala-spetka-velky-efekt-co-dokaze-kajensky-pepr-s-telem",
  "mate-mozkovou-mlhu-toto-je-duvod-proc-se-neumite-soustredit",
  "nejime-jich-dost-lusteniny-a-jejich-prekvapive-ucinky-na-zdravi",
  "nejlepsi-vanocni-darky-pro-muze",
  "odhalte-tajemstvi-jak-nejrychleji-zhubnout",
  "odvodneni-organismu",
  "podpora-erekce-bez-studu",
  "pouzivate-trezalkovy-olej-spatne-tato-chyba-snizuje-ucinek-na-minimum",
  "priznaky-tehotenstvi-v-prvnim-tydnu",
  "proc-by-melo-byt-sladke-drivko-soucasti-domaci-bylinne-lekarny",
  "prvni-sex-co-ocekavat",
  "quercetin",
  "quinoa",
  "recepty-na-leto-4-svezi-jidla",
  "recepty-na-snizeni-kyseliny-mocove",
  "rem-spanek",
  "shilajit-pod-lupou-puvod-ucinky-a-spravne-uzivani",
  "superpotravina-jmenem-cervena-repa",
  "toceni-hlavy",
  "tohle-vam-o-zenskem-libidu-nerekli",
  "trapi-vas-popraskane-paty",
  "trapi-vas-stres-toto-byste-meli-vedet-drive-nez-vas-zastavi",
  "uzivate-probiotika-mozna-netusite-co-vsechno-delaji-ve-vasem-tele",
  "vanocni-darky-pro-zeny",
  "vitaminy-na-vlasy",
  "zapomenuta-sila-jetele-prirodni-odpoved-na-zenskou-rovnovahu",
  "zastavte-vypadavani-vlasu-prirozene",
  "zdravi-z-kopanic",
  "zelezo-v-potravinach",
  "zlata-zila",
  "zlucnikova-dieta--ktera-chutna-zbavte-se-bolesti-bez-chemie",
])

const SK_SLOVNIK_POJMOV_SLUGS: ReadonlySet<string> = new Set([
  "achilova-slacha",
  "aktivne-uhlie",
  "alkaloidy",
  "anabolizmus",
  "anaerobny-prah",
  "anti-aging-efekt",
  "antibiotika",
  "antioxidanty",
  "anxiolytika",
  "articoka",
  "ashwagandha",
  "autoimunita",
  "bambucke-maslo",
  "bolest-kolena",
  "brokolica",
  "cajovnik",
  "cakanka",
  "chlorella",
  "chlorofyl",
  "chondroitin",
  "chronicke-ochorenia",
  "cierny-cesnak",
  "cytokiny",
  "dechtove-mydlo",
  "egcg",
  "epigenetika",
  "flavonoidy",
  "fotosynteza",
  "fytochemikalie",
  "glukozamin",
  "glutation",
  "glutationperoxidaza",
  "glycerol",
  "glycin",
  "glykozidy",
  "goitrogeny",
  "harmancek-pravy",
  "hashimotova-tyreoiditida",
  "helikobakter-pylori",
  "hiit",
  "histamin",
  "horcik",
  "hypertyreoza",
  "hypotyreoza",
  "infekcia",
  "inzulinova-rezistencia",
  "ivan-caj",
  "jod",
  "kaktusova-voda",
  "karotenoidy",
  "katabolizmus",
  "kondicia",
  "kozie-mlieko",
  "kremik",
  "kurkuma",
  "kvercetin",
  "l-tryptofan",
  "levandula",
  "lipa-malolista",
  "liposomalna-forma",
  "mata-pieporna",
  "matcha",
  "medovka-lekarska",
  "melatonin",
  "meniskus",
  "merino",
  "mikrobiom",
  "mitochondrie",
  "moringa",
  "moroznik",
  "mykoza-noh",
  "nechtik-lekarsky",
  "nsaid",
  "olej-z-ciernej-rasce",
  "osteoartroza",
  "osteoporoza",
  "oxidacny-stres",
  "pantenol",
  "parabeny",
  "patne-ostrohy",
  "polyfenoly",
  "prhlava-dvojdoma",
  "psenicne-klicky",
  "pupalka-dvojrocna",
  "pupava-lekarska",
  "regeneracia-tkaniv",
  "rehabilitacia",
  "reishi",
  "resveratrol",
  "retinol",
  "ruska-kozmetika",
  "ruska-medicina",
  "salvia",
  "saponiny",
  "selen",
  "senescencia",
  "sliznica",
  "spenat",
  "starnutie-buniek",
  "superpotraviny",
  "svalove-krce",
  "synergia",
  "telomery",
  "terpeny",
  "tetanus",
  "trijodtyronin",
  "tyroxin",
  "vajce",
  "vapnik",
  "visnevskeho-balzam",
  "vitamin-b",
  "vitamin-c",
  "vitamin-d",
  "vlaknina",
  "volne-radikaly",
  "vrba",
  "zapal",
  "zazvor",
  "zeleny-caj",
  "zihlava-dvojdoma",
])

/**
 * Official `slovnik-pojmov` slugs whose local blog article is deliberately
 * NOT the same slug: each collided with a pre-existing, different article
 * that already owned the identical slug under `/blog/<slug>`, so the term
 * was imported as a new article under `<slug>-pojem` instead (see CRITICAL
 * note above). Consulted before `SK_SLOVNIK_POJMOV_SLUGS`; every value here
 * was verified to serve 200 at `/blog/<value>` before being added.
 */
const SK_SLOVNIK_POJMOV_SUFFIXED_SLUGS: ReadonlyMap<string, string> = new Map([
  ["brusnica-obycajna", "brusnica-obycajna-pojem"],
  ["cakankova-kava", "cakankova-kava-pojem"],
  ["elektrolyty", "elektrolyty-pojem"],
  ["ginkgo-biloba", "ginkgo-biloba-pojem"],
  ["kapucinka-vacsia", "kapucinka-vacsia-pojem"],
  ["koenzym-q10", "koenzym-q10-pojem"],
  ["kolagen", "kolagen-pojem"],
  ["kreatin", "kreatin-pojem"],
  ["kyselina-listova", "kyselina-listova-pojem"],
  ["praslicka-rolna", "praslicka-rolna-pojem"],
  ["psyllium", "psyllium-pojem"],
  ["taurin", "taurin-pojem"],
  ["vitamin-a", "vitamin-a-pojem"],
  ["zelezo", "zelezo-pojem"],
])

type ContentSectionKey = "magazin" | "slovnik-pojmov"

/**
 * Per market: which official content-section prefixes exist, and the exact
 * imported-slug allow-list for each. Only `sk` and `cz` publish `magazin`;
 * only `sk` publishes `slovnik-pojmov`. `hu` and `ro` have no entries at
 * all, so any `/magazin/*` or `/slovnik-pojmov/*` request on those markets
 * falls through untouched.
 */
export const OFFICIAL_CONTENT_SECTIONS: Readonly<
  Record<
    Market,
    Readonly<Partial<Record<ContentSectionKey, ReadonlySet<string>>>>
  >
> = Object.freeze({
  cz: Object.freeze({
    magazin: CZ_MAGAZIN_SLUGS,
  }),
  hu: Object.freeze({}),
  ro: Object.freeze({}),
  sk: Object.freeze({
    magazin: SK_MAGAZIN_SLUGS,
    "slovnik-pojmov": SK_SLOVNIK_POJMOV_SLUGS,
  }),
})

/**
 * Per market/section exception maps of official slug -> local slug, for
 * slugs whose local blog article is not identically slugged. Consulted
 * before `OFFICIAL_CONTENT_SECTIONS`'s identity sets. Only
 * `sk`/`slovnik-pojmov` has entries today (the 14 `-pojem` collisions).
 */
const OFFICIAL_CONTENT_SECTION_SLUG_EXCEPTIONS: Readonly<
  Partial<
    Record<
      Market,
      Readonly<Partial<Record<ContentSectionKey, ReadonlyMap<string, string>>>>
    >
  >
> = Object.freeze({
  sk: Object.freeze({
    "slovnik-pojmov": SK_SLOVNIK_POJMOV_SUFFIXED_SLUGS,
  }),
})

/**
 * Resolve the permanent redirect target for an official content-section URL
 * (`herbatica.<tld>/magazin/<slug>` or `herbatica.sk/slovnik-pojmov/<slug>`)
 * to its local blog equivalent.
 *
 * Matches two shapes:
 *  - `[sectionPrefix, slug]` (2 segments): the lowercased slug must be a
 *    known imported slug for that market's section -> redirects to the
 *    local blog detail path (`/<blogPrefix>/<slug>`).
 *  - `[sectionPrefix]` (1 segment): the section prefix itself must be known
 *    for the market -> redirects to the local blog index (`/<blogPrefix>`).
 *
 * Any other path shape, an unknown section prefix for the market, or a slug
 * not in the allow-list returns `null` so the request falls through to
 * normal route resolution (currently a 404 for unmatched slugs).
 */
export const resolveOfficialContentSectionRedirect = (
  market: Market,
  segments: readonly string[]
): string | null => {
  if (segments.length !== 1 && segments.length !== 2) {
    return null
  }
  const sectionPrefix = (segments[0] ?? "").toLowerCase()
  if (sectionPrefix !== "magazin" && sectionPrefix !== "slovnik-pojmov") {
    return null
  }
  const slugs = OFFICIAL_CONTENT_SECTIONS[market][sectionPrefix]
  if (!slugs) {
    return null
  }
  const blogPrefix = ROUTE_SEGMENT_REGISTRY[market].typePrefixes.advice
  if (segments.length === 1) {
    return `/${blogPrefix}`
  }
  const slug = (segments[1] ?? "").toLowerCase()
  const exceptionSlug =
    OFFICIAL_CONTENT_SECTION_SLUG_EXCEPTIONS[market]?.[sectionPrefix]?.get(slug)
  if (exceptionSlug) {
    return `/${blogPrefix}/${exceptionSlug}`
  }
  return slugs.has(slug) ? `/${blogPrefix}/${slug}` : null
}
