import type {
  ExecArgs,
  IProductModuleService,
  ITranslationModuleService,
  Logger,
  ProductDTO,
  Query,
  UpdateTranslationDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
  updateTranslationsWorkflow,
} from "@medusajs/medusa/core-flows"
import { PRODUCT_PUBLICATION_METADATA_KEY } from "../modules/url-registry-outbox/product-publication-assignment"
import type { HerbaticaMarket } from "./herbatica-supplemental-import/manifest"

/**
 * Reconciliation against the four official Herbatica sitemaps (2026-08-23)
 * flagged three "missing" product pages. All three turned out to already
 * exist in this catalog under their SK seed identities, so this script never
 * creates products; it converges slugs, prices, and translations instead:
 *
 * - shopitem-14613 (Ovecha grey socks, code 3733): the flagged CZ page is the
 *   official multi-size listing; our CZ canonical pointed at the official
 *   single-size 23-24 sibling page. The CZ canonical slug is realigned; the
 *   registry keeps the old slug as an append-only alias.
 * - shopitem-12800 (Altai mumio, codes 2215/30 + 3174): the flagged HU page is
 *   the official 30 g listing that matches this product's variants; our HU
 *   canonical pointed at the official "50g"-slugged sibling page. Same
 *   canonical realignment.
 * - shopitem-19082 (Biopharma gift pack, code 5588, EAN 8586021133184): the
 *   flagged HU page is genuinely unpublished here, but the product's HU route
 *   in url_registry is terminally retired. The product lifecycle answers
 *   "live-source-has-terminal-route" (HTTP 409, permanent) for any republish,
 *   so this script refuses to assign HU publication and reports it instead.
 *
 * Prices are real values scraped from the official storefront pages listed in
 * each target's sourceUrls. Dry-run by default; set the apply env var to 1.
 */

const APPLY_ENV_VAR = "HERBATICA_MISSING_PRODUCTS_APPLY"
const CURRENCY_CODES = ["czk", "eur", "huf", "ron"] as const

type CurrencyCode = (typeof CURRENCY_CODES)[number]

type VariantSpec = Readonly<{
  ean: null | string
  prices: Readonly<Record<CurrencyCode, number>>
  sku: string
}>

type TranslationSpec = Readonly<{
  description: string
  localeCode: string
  subtitle: string
  title: string
}>

type SlugChange = Readonly<{
  fromSlug: string
  market: HerbaticaMarket
  officialUrl: string
  toSlug: string
}>

type BlockedMarket = Readonly<{
  market: HerbaticaMarket
  officialSlug: string
  officialUrl: string
  reason: string
}>

type TargetSpec = Readonly<{
  blockedMarkets: readonly BlockedMarket[]
  handle: string
  key: string
  slugChanges: readonly SlugChange[]
  sourceUrls: Readonly<Partial<Record<HerbaticaMarket, string>>>
  translations: readonly TranslationSpec[]
  variants: readonly VariantSpec[]
}>

const GIFT_HU_BLOCK_REASON =
  "url_registry route hu/product for this product is terminally retired; a publish assignment would dead-letter as live-source-has-terminal-route (409). Operator intervention is required before HU republication."

const TARGETS: readonly TargetSpec[] = [
  {
    blockedMarkets: [],
    handle: "shopitem-14613",
    key: "ovecha-socks-grey-3733",
    slugChanges: [
      {
        fromSlug:
          "ponozky-s-jemnym-lemem--s-mikroplysem-v-pate-a-spicce-sede-ovecha-23-24",
        market: "cz",
        officialUrl:
          "https://www.herbatica.cz/zdravotni-ponozky/ponozky-s-jemnym-zovretim-lemu--s-mikroplysom-v-pate-a-spicke-sede/",
        toSlug:
          "ponozky-s-jemnym-zovretim-lemu--s-mikroplysom-v-pate-a-spicke-sede",
      },
    ],
    sourceUrls: {
      cz: "https://www.herbatica.cz/zdravotni-ponozky/ponozky-s-jemnym-zovretim-lemu--s-mikroplysom-v-pate-a-spicke-sede/",
      hu: "https://www.herbatica.hu/egeszsegugyi-zoknik/zokni-puha-szegellyel-saroknal-es-orrnal-mikro-plussel-szurke/",
      ro: "https://www.herbatica.ro/sosete-medicinale/sosete-cu-manseta-lejera--cu-microplus-la-calcai-si-varf-gri-ovecha-23-24/",
      sk: "https://www.herbatica.sk/zdravotne-ponozky/ponozky-s-jemnym-zovretim-lemu-s-mikroplysom-sede/",
    },
    translations: [
      {
        description:
          "Detailní popis produktu Ponožky pro zdraví nového typu mají vysokou roztažnost, až 26 cm a velmi jemný svár speciálně upraveného lemu. Horní lem tedy nezabraňuje průtoku krve a je velmi jemný. Ponožka perfektně sedí na noze, netáhne a přitom nesklouzává . Špice je uzavřena novým plochým řetízkovým švem na straně chodidla, který je umístěn v jamce pod prsty a jen minimálně přijde do kontaktu s pokožkou. Pata a špice je vyplněna měkkou mikroplyšovou výstelkou , která výrazně snižuje riziko vzniku otlaků a zajišťuje měkký došlap při chůzi . Výstelka špice je prodloužena přes celé prsty, hřeje a tím poskytuje komfort osobám trpícím pocitem studených nohou a především diabetikům. Výrobek je vyroben s antibakteriální úpravou ( ALOE VERA + ANTIBACTERIAL), vyhovující požadavkům ČSN EN ISO 20645. Na tuto úpravu je vydáno osvědčení TZÚ Brno číslo 09-176 ze dne 7. 12. 2009. Antibakteriální úpravou nazvanou MAT. Složka aloe vera přináší hojivý a uklidňující účinek , složka ANTIBACTERIAL zajišťuje antibakteriální a protiplísňové účinky . Efekt je zachován i po opakovaném praní (po 15-ti vypráních cca 50% aktivních látek). Ponožky jsou: - vhodné pro osoby se zhoršeným oběhovým systémem dolních končetin - špice ponožky je uzavřena velmi jemným plochým švem, ze spodní strany ponožky - špice a pata je vyplněna mikroplyšovou a termoizolační výstelkou, ta poskytuje při nošení hřejivý pocit osobám s pocitem studených nohou. Výrazně snižuje riziko tvrby otlaků. - ponožky disponují biocidním produktem pro antimikrobiální a fungicidní ochranu (báze pyrithionu zinočnatého) - úprava je doplněna o Aloe Vera pro měkký omak a příznivé působení na pokožku chodidla - šetrným praním se prodlouží působení látek fixovaných v produktu Materiálové složení : 98% bavlna, 2% elastan Velikost (cm) : 23-24 25-26 27-28 29-30 31-32 Velikostní tabulka: Dámské: Metrická čísla (cm) 22 1/2 23 23 1/2 24 24 1/2 25 25 1/2 26 26 1/2 27 27 1/2 28 Anglická čísla (inch) 2 3 3 1/2 4 4 1/2 5 5 1/2 6 6 1/2 7 7 1/2 8 Francouzská čísla (steh) 34 35 36 37 38 39 40 41 42",
        localeCode: "cs-CZ",
        subtitle:
          "Ponožky s jemným sevřením lemu - s mikroplyšem v patě a špičce - šedé - Ovecha. Ponožky s vysokým obsahem bavlny. Jsou vhodné zejména pro osoby se zhoršeným oběhovým systémem dolních končetin. Mají velmi jemný svár speciálně upraveného lemu s vysokou roztažností.",
        title:
          "Ponožky s jemným sevřením lemu - s mikroplyšem v patě a špičce - šedé - Ovecha",
      },
    ],
    variants: [
      {
        ean: null,
        prices: { czk: 179, eur: 6.99, huf: 2840, ron: 40 },
        sku: "SHOPITEM-14613-VARIANT-16230",
      },
      {
        ean: null,
        prices: { czk: 179, eur: 6.99, huf: 2840, ron: 40 },
        sku: "SHOPITEM-14613-VARIANT-16236",
      },
      {
        ean: null,
        prices: { czk: 179, eur: 6.99, huf: 2840, ron: 40 },
        sku: "SHOPITEM-14613-VARIANT-16242",
      },
    ],
  },
  {
    blockedMarkets: [],
    handle: "shopitem-12800",
    key: "altai-mumio-2215",
    slugChanges: [
      {
        fromSlug:
          "mumio-tisztitott-altaji-termeszetes--folyekony-formaban--50g",
        market: "hu",
        officialUrl:
          "https://www.herbatica.hu/vitaminok-es-asvanyi-anyagok/tisztitott-altaji-mumio-termeszetes--folyekony--formaban-30-g/",
        toSlug: "tisztitott-altaji-mumio-termeszetes--folyekony--formaban-30-g",
      },
    ],
    sourceUrls: {
      cz: "https://www.herbatica.cz/vitaminy-a-mineraly/mumio-ocistene-altajske-v-prirozene--tekute-forme--50g/",
      hu: "https://www.herbatica.hu/vitaminok-es-asvanyi-anyagok/tisztitott-altaji-mumio-termeszetes--folyekony--formaban-30-g/",
      ro: "https://www.herbatica.ro/vitamine-si-minerale/mumio-altai-purificat--in-forma-naturala--lichida-30-g/",
      sk: "https://www.herbatica.sk/vitaminy-a-mineraly/mumio-ocistene-altajske-v-prirodzenej--tekutej-forme--50g/",
    },
    translations: [
      {
        description:
          "Termék részletes leírása Természetes bioaktív komplex az Altajból – tisztított mumio folyékony formában Az altaji mumio természetes folyékony formában egy különleges, természetes eredetű termék az Altaj hegyvidéki területeiről. Ez a szerves és szervetlen vegyületekből álló komplex évszázadok alatt alakul ki a növények, rovarok és állatok természetes életfolyamatai révén, talajelemekkel és ásványi anyagokkal keveredve. A folyamat során gyantaszerű anyag jön létre, amely biológiailag aktív összetevőkben, vitaminokban és ásványi anyagokban gazdag. A természetben a mumio magashegyi barlangokban és sziklahasadékokban található meg, ahol hosszú idő alatt természetes bioaktív összetevőkkel telítődik. Tisztítás után magas ásványianyag-, aminosav- és nyomelemtartalmú, tiszta forma nyerhető belőle. Mi az altaji mumio, és mitől különleges? A mumiót a hagyományos gyógyászati rendszerekben évezredek óta használják, Tibettől Indiáig. A tisztított altaji mumio több mint 80 biológiailag aktív anyagot tartalmaz, amelyek egymást kiegészítve támogatják a szervezet működését. Hagyományosan regenerációt támogató, komfortérzetet segítő és vitalizáló tulajdonságai miatt értékelik. A folyékony forma jó felszívódást és egyszerű adagolást tesz lehetővé. A termék 100%-ban természetes, adalékanyagok, tartósítószerek és színezékek nélkül. A tisztított altaji mumio fő tulajdonságai Támogatja a szövetek regenerációját fokozott igénybevétel, sérülések vagy égési sérülések után. Segíthet a bőr komfortérzetének támogatásában különböző bőrproblémák esetén. Hozzájárulhat az emésztőrendszer harmonikus működéséhez . Támogathatja a húgyúti és nemi szervek megfelelő működését , beleértve a prosztatát is. Támogatja a máj, a vese és az epehólyag működését. Hozzájárulhat az ízületek és izmok komfortérzetének fenntartásához. Támogatja az erek és a szív- és érrendszer egészségét . Segítheti a szervezetet a stressz, a fáradtság és az immunrendszer gyengülése idején. Egyedi eredet és összetétel Összetevők: 100% mumio – tisztított altaji. Nem tartalmaz tartósítószereket, színezékeket vagy hozzáadott összetevőket. Közvetlenül az Altaj hegyvidéki területeinek természetes forrásaiból nyerik. A mumio aminosavakban, foszfolipidekben, huminsavakban, esszenciális ásványi anyagokban (kalcium, magnézium, vas, cink, mangán, réz, szelén) és nyomelemekben gazdag, amelyek hozzájárulnak a szövetek regenerációjához és a szervezet belső egyensúlyának fenntartásához. Használat és adagolás Belső használat: Naponta 0,5–1 mérőkanállal (kb. 250 mg) fogyasszon étkezés közben. Hagyja feloldódni a szájban, vagy igya meg meleg vízzel. Az ajánlott kúraidő 3–4 hét, évente legfeljebb 4 alkalommal ismételhető. Ha a termék állaga szilárdabb, vízfürdőben vagy rövid ideig napon melegítve lágyítható, a hatóanyagok megőrzése mellett. Külső használat A mumio külsőleg is használható oldatok, lemosók vagy pakolások formájában. Lemosáshoz: Oldjon fel 1 mérőkanál mumiót 200 ml meleg, felforralt vízben. Használja naponta 3 alkalommal (60 ml). Alkalmazható bőrirritáció esetén, a torok komfortérzetének támogatására, duzzanatnál, hajhullás esetén vagy arctonikként. Pakolásokhoz és borogatásokhoz: Oldjon fel 1 teáskanál mumiót 50 ml vízben, majd vigye fel a bőrre vagy az érintett területre. Hagyja hatni 5–15 percig, ezután öblítse le vízzel. Ismételje hetente 3 alkalommal, 1 hónapon át. Évente 4 kúra alkalmazása ajánlott , különösen tavasszal és ősszel, amikor a szervezet nagyobb terhelésnek van kitéve vagy regenerációra van szüksége. Ellenjavallatok A termék összetevőivel szembeni egyéni érzékenység esetén nem ajánlott. Terhesség és szoptatás alatt nem ajánlott. Krónikus betegségek esetén használat előtt kérje ki orvosa véleményét. Kiszerelés és tárolás Tartalom: 30 g / 100 g Származási ország: Oroszország Forma: sötét, gyantaszerű massza védőtégelyben. Száraz, hűvös, árnyékos helyen, gyermekektől elzárva tárolandó. Felbontás után a biológiai aktivitás megőrzése érdekében hűvös helyen ajánlott tartani. Történelmi és tudományos érdekességek A mumiót régebben „hegyi balzsamként” vagy „a hegyek könnyeiként” is emlegették. Hagyományosan a tibeti és altaji gyógyászati rendszerekben használták a szervezet regenerációjának támogatására sérülések és betegségek után. A modern kutatások szerint huminsavakat tartalmaz, amelyek antioxidáns hatásúak és támogatják a sejtek anyagcseréjét. Szakértői cikk A bőr regenerációjáról és természetes védelméről bővebben is olvashat a következő témájú cikkben: Mi a pszoriázis és a pikkelysömör – tünetek és kezelési lehetőségek, amelyet PhDr. Mgr. Eva Medvecká, PhD., DiS. készített. Összegzés A tisztított altaji mumio értékes, természetes biokomplex, sokoldalú felhasználási lehetőségekkel. Támogatja a szervezet regenerációját belsőleg és külsőleg, hozzájárul a vitalitáshoz, az ellenálló képességhez és a testi egyensúly fenntartásához. Folyékony formája gyors felszívódást és a természetes aktív összetevők megőrzését biztosítja. A Herbatica a rendszeres, természetes egészség- és bőrápolás részeként ajánlja.",
        localeCode: "hu-HU",
        subtitle:
          "Tisztított altaji mumio folyékony formában, 30 g. Természetes összetételű, egyszerűen adagolható termék a mindennapi használathoz.",
        title:
          "Tisztított altaji mumio természetes „folyékony” formában - 30 g",
      },
    ],
    variants: [
      {
        ean: "4640012260472",
        prices: { czk: 559, eur: 22.49, huf: 9110, ron: 120 },
        sku: "SHOPITEM-12800-VARIANT-14150",
      },
      {
        ean: "4640012260496",
        prices: { czk: 1439, eur: 57.99, huf: 23_490, ron: 300 },
        sku: "SHOPITEM-12800-VARIANT-14153",
      },
    ],
  },
  {
    blockedMarkets: [
      {
        market: "hu",
        officialSlug:
          "egeszseg-belulrol-ajandekcsomagaz-egeszseg-belulrol-taplalo-szett-a-biopharmatol-kollagen-es-krillolaj-kombinaciojaval-tamogatja-a-szepseget-es-az-altalanos-egeszseget---a-bor--a-haj-es-a-kormok-erositesetol-a-sziv--az-agy-es-az-immunrendszer-optimalis-mu",
        officialUrl:
          "https://www.herbatica.hu/taplalekkiegeszitok/egeszseg-belulrol-ajandekcsomagaz-egeszseg-belulrol-taplalo-szett-a-biopharmatol-kollagen-es-krillolaj-kombinaciojaval-tamogatja-a-szepseget-es-az-altalanos-egeszseget---a-bor--a-haj-es-a-kormok-erositesetol-a-sziv--az-agy-es-az-immunrendszer-optimalis-mu/",
        reason: GIFT_HU_BLOCK_REASON,
      },
    ],
    handle: "shopitem-19082",
    key: "biopharma-gift-5588",
    slugChanges: [],
    sourceUrls: {
      cz: "https://www.herbatica.cz/doplnky-vyzivy/darkove-baleni-zdravi-zevnitr-biopharma/",
      hu: "https://www.herbatica.hu/taplalekkiegeszitok/egeszseg-belulrol-ajandekcsomagaz-egeszseg-belulrol-taplalo-szett-a-biopharmatol-kollagen-es-krillolaj-kombinaciojaval-tamogatja-a-szepseget-es-az-altalanos-egeszseget---a-bor--a-haj-es-a-kormok-erositesetol-a-sziv--az-agy-es-az-immunrendszer-optimalis-mu/",
      ro: "https://www.herbatica.ro/vitamine-lipozomale/pachet-cadou-sanatate-din-interior-biopharma/",
      sk: "https://www.herbatica.sk/doplnky-vyzivy/darcekove-balenie-zdravie-zvnutra-biopharma/",
    },
    translations: [
      {
        description:
          "Termék részletes leírása Ez a Biopharma tápláló szett két prémium terméket egyesít a szépség és az általános jó közérzet támogatására. A C-vitaminnal és biotinnal kiegészített hidrolizált tengeri kollagén hozzájárul a bőr feszességéhez, valamint a haj és a köröm normál állapotának fenntartásához. A krillolaj omega-3 zsírsavakban gazdag, amelyek támogatják a szív és az agy megfelelő működését, valamint az immunrendszert. Ideális mindennapi csomag azoknak, akik belülről szeretnék támogatni szervezetüket, és a vitalitás érzését keresik. Az egyes termékekről, a tárolásról, az összetevőkről és a használatról további információ az adott termék részletes leírásában található. Hidrolizált tengeri kollagén C-vitaminnal és biotinnal - Norsk Kollagen - Biopharma - 25x5 g Krillolaj - Biopharma - 60 kapszula",
        localeCode: "hu-HU",
        subtitle:
          "Biopharma ZDRAVIE ZVNÚTRA ajándékcsomag kollagénnel és krillolajjal. Praktikus szett a bőr, a haj, a köröm és az általános vitalitás támogatására.",
        title: "EGÉSZSÉG BELÜLRŐL ajándékcsomag - Biopharma",
      },
    ],
    variants: [
      {
        ean: "8586021133184",
        prices: { czk: 1739, eur: 69.9, huf: 28_310, ron: 360 },
        sku: "SHOPITEM-19082-19082",
      },
    ],
  },
]

const RECONCILIATION_METADATA_KEY = "official_reconciliation_2026_08"

type RuntimeVariant = Readonly<{
  ean: null | string
  id: string
  sku: null | string
}>

type RuntimeProduct = ProductDTO & Readonly<{ variants?: RuntimeVariant[] }>

type RuntimePrice = Readonly<{
  amount: number
  currencyCode: string
  id: string
}>

type Change = Readonly<{ after: string; before: string; field: string }>

type PublicationMarkets = Record<
  string,
  { publicationStatus?: string; publicSlug?: string; salesChannelId?: string }
>

/**
 * jsonb round-trips do not preserve key order, so structural comparison must
 * be order-independent or every re-run reports a phantom change.
 */
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonical)
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => (left < right ? -1 : 1))
        .map(([key, entry]) => [key, canonical(entry)])
    )
  }
  return value
}

const sameStructure = (left: unknown, right: unknown) =>
  JSON.stringify(canonical(left)) === JSON.stringify(canonical(right))

const asText = (value: unknown) =>
  value === null || value === undefined ? "" : String(value)

const truncate = (value: string, length = 72) =>
  value.length <= length ? value : `${value.slice(0, length)}…`

const sameAmount = (left: number, right: number) =>
  Math.abs(left - right) < 0.000_001

const findProduct = async (
  service: IProductModuleService,
  spec: TargetSpec
): Promise<RuntimeProduct> => {
  const products = (await service.listProducts(
    { handle: spec.handle },
    {
      relations: ["variants"],
      select: [
        "id",
        "handle",
        "metadata",
        "status",
        "title",
        "variants.id",
        "variants.sku",
        "variants.ean",
      ],
      take: 2,
    }
  )) as RuntimeProduct[]
  const product = products[0]
  if (products.length !== 1 || !product) {
    throw new Error(
      `Expected exactly one product with handle ${spec.handle}; reconciliation premise failed, refusing to create anything`
    )
  }
  const variantsBySku = new Map(
    (product.variants ?? []).map((variant) => [variant.sku, variant])
  )
  for (const variantSpec of spec.variants) {
    const variant = variantsBySku.get(variantSpec.sku)
    if (!variant) {
      throw new Error(`${spec.handle} is missing variant ${variantSpec.sku}`)
    }
    if (variantSpec.ean !== null && variant.ean !== variantSpec.ean) {
      throw new Error(
        `${variantSpec.sku} EAN mismatch: expected ${variantSpec.ean}, found ${asText(variant.ean)}`
      )
    }
  }
  const owners = await service.listProductVariants(
    { sku: spec.variants.map((variant) => variant.sku) },
    { select: ["id", "product_id", "sku"], take: spec.variants.length * 2 + 1 }
  )
  for (const owner of owners) {
    if (owner.product_id !== product.id) {
      throw new Error(
        `SKU ${asText(owner.sku)} is owned by ${asText(owner.product_id)}, not ${product.id}`
      )
    }
  }
  return product
}

const readPublicationMarkets = (
  product: RuntimeProduct
): PublicationMarkets => {
  const metadata = (product.metadata ?? {}) as Record<string, unknown>
  const publication = metadata[PRODUCT_PUBLICATION_METADATA_KEY]
  const markets =
    publication && typeof publication === "object"
      ? (publication as { markets?: unknown }).markets
      : null
  if (!markets || typeof markets !== "object") {
    throw new Error(`${product.handle} has no publication metadata`)
  }
  return markets as PublicationMarkets
}

const publicationChanges = (
  spec: TargetSpec,
  product: RuntimeProduct
): Change[] => {
  const markets = readPublicationMarkets(product)
  const changes: Change[] = []
  for (const slugChange of spec.slugChanges) {
    const assignment = markets[slugChange.market]
    if (assignment?.publicationStatus !== "published") {
      throw new Error(
        `${spec.handle} is not published on ${slugChange.market}; refusing to realign its slug`
      )
    }
    if (assignment.publicSlug === slugChange.toSlug) {
      continue
    }
    if (assignment.publicSlug !== slugChange.fromSlug) {
      throw new Error(
        `${spec.handle} ${slugChange.market} slug drifted to ${asText(assignment.publicSlug)}; expected ${slugChange.fromSlug}. Resolve manually.`
      )
    }
    changes.push({
      after: slugChange.toSlug,
      before: slugChange.fromSlug,
      field: `publication.${slugChange.market}.publicSlug`,
    })
  }
  for (const blocked of spec.blockedMarkets) {
    if (markets[blocked.market] !== undefined) {
      throw new Error(
        `${spec.handle} unexpectedly carries a ${blocked.market} publication assignment; expected none because: ${blocked.reason}`
      )
    }
  }
  return changes
}

const listVariantPrices = async (
  query: Query,
  variantId: string
): Promise<RuntimePrice[]> => {
  const { data } = await query.graph({
    entity: "variant",
    fields: [
      "id",
      "prices.id",
      "prices.amount",
      "prices.currency_code",
      "prices.rules_count",
    ],
    filters: { id: variantId },
  })
  const variant = data[0] as
    | undefined
    | {
        prices?: {
          amount: number
          currency_code: string
          id: string
          rules_count?: number
        }[]
      }
  return (variant?.prices ?? [])
    .filter((price) => !price.rules_count)
    .map((price) => ({
      amount: Number(price.amount),
      currencyCode: price.currency_code,
      id: price.id,
    }))
}

const priceChanges = (
  spec: VariantSpec,
  prices: readonly RuntimePrice[]
): Change[] => {
  const byCurrency = new Map(prices.map((price) => [price.currencyCode, price]))
  return CURRENCY_CODES.flatMap((currencyCode) => {
    const current = byCurrency.get(currencyCode)
    const desired = spec.prices[currencyCode]
    if (current && sameAmount(current.amount, desired)) {
      return []
    }
    return [
      {
        after: String(desired),
        before: current ? String(current.amount) : "missing",
        field: `price.${spec.sku}.${currencyCode}`,
      },
    ]
  })
}

const listProductTranslation = async (
  service: ITranslationModuleService,
  productId: string,
  localeCode: string
) => {
  const translations = await service.listTranslations(
    { locale_code: localeCode, reference_id: [productId] },
    {
      select: ["id", "locale_code", "reference", "translations", "deleted_at"],
      take: 5,
    }
  )
  const rows = translations.filter(
    (translation) =>
      !translation.deleted_at && translation.reference === "product"
  )
  if (rows.length > 1) {
    throw new Error(`Duplicate ${localeCode} product translation`)
  }
  return rows[0] ?? null
}

const translationChanges = async (
  service: ITranslationModuleService,
  spec: TargetSpec,
  productId: string
): Promise<Change[]> => {
  const changes: Change[] = []
  for (const translationSpec of spec.translations) {
    const prior = await listProductTranslation(
      service,
      productId,
      translationSpec.localeCode
    )
    if (!prior) {
      throw new Error(
        `${spec.handle} is missing its ${translationSpec.localeCode} translation; refusing to continue`
      )
    }
    const current = (prior.translations ?? {}) as Record<string, unknown>
    for (const field of ["title", "subtitle", "description"] as const) {
      if (asText(current[field]) !== translationSpec[field]) {
        changes.push({
          after: truncate(translationSpec[field]),
          before: truncate(asText(current[field])),
          field: `translation.${translationSpec.localeCode}.${field}`,
        })
      }
    }
  }
  return changes
}

const buildReconciliationNote = (spec: TargetSpec) => ({
  blocked_markets: Object.fromEntries(
    spec.blockedMarkets.map((blocked) => [
      blocked.market,
      {
        official_slug: blocked.officialSlug,
        official_url: blocked.officialUrl,
        reason: blocked.reason,
      },
    ])
  ),
  price_source: "official-storefront-pages",
  realigned_slugs: Object.fromEntries(
    spec.slugChanges.map((slugChange) => [
      slugChange.market,
      { official_url: slugChange.officialUrl, public_slug: slugChange.toSlug },
    ])
  ),
  scraped_at: "2026-08-23",
  source_urls: spec.sourceUrls,
})

const metadataChanges = (
  spec: TargetSpec,
  product: RuntimeProduct
): Change[] => {
  const metadata = (product.metadata ?? {}) as Record<string, unknown>
  const current = metadata[RECONCILIATION_METADATA_KEY]
  if (
    current !== undefined &&
    sameStructure(current, buildReconciliationNote(spec))
  ) {
    return []
  }
  return [
    {
      after: "written",
      before: current === undefined ? "absent" : "stale",
      field: `metadata.${RECONCILIATION_METADATA_KEY}`,
    },
  ]
}

const buildTargetPlan = async (
  input: Readonly<{
    product: RuntimeProduct
    query: Query
    spec: TargetSpec
    translationService: ITranslationModuleService
  }>
) => {
  const { product, query, spec, translationService } = input
  const variantsBySku = new Map(
    (product.variants ?? []).map((variant) => [variant.sku, variant])
  )
  const pendingPrices: Change[] = []
  for (const variantSpec of spec.variants) {
    const variant = variantsBySku.get(variantSpec.sku)
    if (!variant) {
      throw new Error(`${spec.handle} lost variant ${variantSpec.sku}`)
    }
    pendingPrices.push(
      ...priceChanges(variantSpec, await listVariantPrices(query, variant.id))
    )
  }
  const changes = [
    ...publicationChanges(spec, product),
    ...metadataChanges(spec, product),
  ]
  const pendingTranslations = await translationChanges(
    translationService,
    spec,
    product.id
  )
  return {
    blockedMarkets: spec.blockedMarkets,
    changes,
    handle: spec.handle,
    key: spec.key,
    pendingPrices,
    pendingTranslations,
    productId: product.id,
    totalChanges:
      changes.length + pendingPrices.length + pendingTranslations.length,
  }
}

type TargetPlan = Awaited<ReturnType<typeof buildTargetPlan>>

const applyTargetTranslations = async (
  container: ExecArgs["container"],
  service: ITranslationModuleService,
  spec: TargetSpec,
  productId: string
) => {
  const updates: UpdateTranslationDTO[] = []
  for (const translationSpec of spec.translations) {
    const prior = await listProductTranslation(
      service,
      productId,
      translationSpec.localeCode
    )
    if (!prior) {
      throw new Error(
        `${spec.handle} is missing its ${translationSpec.localeCode} translation`
      )
    }
    const current = (prior.translations ?? {}) as Record<string, unknown>
    const desired = {
      ...current,
      description: translationSpec.description,
      subtitle: translationSpec.subtitle,
      title: translationSpec.title,
    }
    if (JSON.stringify(desired) !== JSON.stringify(current)) {
      updates.push({ id: prior.id, translations: desired })
    }
  }
  if (updates.length > 0) {
    await updateTranslationsWorkflow(container).run({
      input: { translations: updates },
    })
  }
}

const applyTargetPrices = async (
  container: ExecArgs["container"],
  query: Query,
  spec: TargetSpec,
  product: RuntimeProduct
) => {
  const variantsBySku = new Map(
    (product.variants ?? []).map((variant) => [variant.sku, variant])
  )
  const productVariants: {
    id: string
    prices: { amount: number; currency_code: string; id?: string }[]
  }[] = []
  for (const variantSpec of spec.variants) {
    const variant = variantsBySku.get(variantSpec.sku)
    if (!variant) {
      throw new Error(`${spec.handle} lost variant ${variantSpec.sku}`)
    }
    const current = await listVariantPrices(query, variant.id)
    if (priceChanges(variantSpec, current).length === 0) {
      continue
    }
    const byCurrency = new Map(
      current.map((price) => [price.currencyCode, price])
    )
    productVariants.push({
      id: variant.id,
      prices: CURRENCY_CODES.map((currencyCode) => {
        const existing = byCurrency.get(currencyCode)
        return {
          ...(existing ? { id: existing.id } : {}),
          amount: variantSpec.prices[currencyCode],
          currency_code: currencyCode,
        }
      }),
    })
  }
  if (productVariants.length > 0) {
    await updateProductVariantsWorkflow(container).run({
      input: { product_variants: productVariants },
    })
  }
}

const applyTargetProductUpdate = async (
  container: ExecArgs["container"],
  spec: TargetSpec,
  product: RuntimeProduct
) => {
  const metadata = (product.metadata ?? {}) as Record<string, unknown>
  const publication = metadata[PRODUCT_PUBLICATION_METADATA_KEY] as {
    markets: PublicationMarkets
    schemaVersion: number
  }
  const markets: PublicationMarkets = { ...publication.markets }
  for (const slugChange of spec.slugChanges) {
    const assignment = markets[slugChange.market]
    if (!assignment) {
      throw new Error(`${spec.handle} lost its ${slugChange.market} assignment`)
    }
    markets[slugChange.market] = {
      ...assignment,
      publicSlug: slugChange.toSlug,
    }
  }
  await updateProductsWorkflow(container).run({
    input: {
      products: [
        {
          id: product.id,
          metadata: {
            ...metadata,
            [PRODUCT_PUBLICATION_METADATA_KEY]: {
              ...publication,
              markets,
            },
            [RECONCILIATION_METADATA_KEY]: buildReconciliationNote(spec),
          },
        },
      ],
    },
  })
}

export default async function herbaticaMissingProductsImport({
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const productService = container.resolve<IProductModuleService>(
    Modules.PRODUCT
  )
  const translationService = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const apply = process.env[APPLY_ENV_VAR] === "1"

  const plans: {
    plan: TargetPlan
    product: RuntimeProduct
    spec: TargetSpec
  }[] = []
  for (const spec of TARGETS) {
    const product = await findProduct(productService, spec)
    plans.push({
      product,
      plan: await buildTargetPlan({
        product,
        query,
        spec,
        translationService,
      }),
      spec,
    })
  }
  const summary = plans.map(({ plan }) => plan)
  logger.info(
    `Missing-products reconciliation plan: ${JSON.stringify({ apply, targets: summary }, null, 2)}`
  )
  for (const { plan } of plans) {
    for (const blocked of plan.blockedMarkets) {
      logger.warn(
        `${plan.handle}: ${blocked.market} publication BLOCKED. Official page ${blocked.officialUrl} stays unmirrored. ${blocked.reason}`
      )
    }
  }

  const totalChanges = summary.reduce((sum, plan) => sum + plan.totalChanges, 0)
  if (!apply) {
    logger.info(
      `Dry-run complete; ${totalChanges} pending change(s) across ${plans.length} product(s). Set ${APPLY_ENV_VAR}=1 to apply.`
    )
    return { apply, targets: summary }
  }
  if (totalChanges === 0) {
    logger.info("Missing-products reconciliation is already converged")
    return { applied: false, targets: summary }
  }

  for (const { plan, product, spec } of plans) {
    if (plan.totalChanges === 0) {
      continue
    }
    await applyTargetTranslations(
      container,
      translationService,
      spec,
      product.id
    )
    await applyTargetPrices(container, query, spec, product)
    await applyTargetProductUpdate(container, spec, product)
  }

  const residuals: TargetPlan[] = []
  for (const spec of TARGETS) {
    const product = await findProduct(productService, spec)
    residuals.push(
      await buildTargetPlan({ product, query, spec, translationService })
    )
  }
  const residualTotal = residuals.reduce(
    (sum, plan) => sum + plan.totalChanges,
    0
  )
  if (residualTotal !== 0) {
    throw new Error(
      `Verification failed: ${JSON.stringify(
        residuals.filter((plan) => plan.totalChanges > 0)
      )}`
    )
  }
  logger.info(
    `Missing-products reconciliation applied and verified: ${JSON.stringify(
      residuals.map((plan) => ({
        handle: plan.handle,
        productId: plan.productId,
      }))
    )}`
  )
  return { applied: true, targets: summary }
}
