import { createHash } from "node:crypto"
import {
  createTranslationsWorkflow,
  updateTranslationsWorkflow,
} from "@medusajs/core-flows"
import type {
  CreateTranslationDTO,
  ExecArgs,
  IProductModuleService,
  ISalesChannelModuleService,
  IStockLocationService,
  ITranslationModuleService,
  Logger,
  ProductDTO,
  ProductVariantDTO,
  Query,
  UpdateTranslationDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"
import { PRODUCT_CONTENT_MODULE } from "../modules/product-content"
import type ProductContentModuleService from "../modules/product-content/service"
import { PRODUCT_PUBLICATION_METADATA_KEY } from "../modules/url-registry-outbox/product-publication-assignment"
import importHerbaticaSupplementalProductsWorkflow from "../workflows/seed/workflows/import-herbatica-supplemental-products"
import {
  HERBATICA_TAX_RATE_CONFIG,
  HERBATICA_TAX_RATE_COUNTRIES,
} from "./herbatica-seed-config"
import {
  HERBATICA_MARKET_CONFIG,
  type HerbaticaMarket,
} from "./herbatica-supplemental-import/manifest"

const APPLY_ENV_VAR = "HERBATICA_PTEROSTILBEN150_APPLY"
const PUBLISH_ENV_VAR = "HERBATICA_PTEROSTILBEN150_PUBLISH"
const STOCK_LOCATION_NAME = "European Warehouse"
const DEFAULT_SALES_CHANNEL_NAME = "Default Sales Channel"
const DEMO_STOCK_QUANTITY = 25
const BRAND_TITLE = "Bioherba"
const MARKETS = Object.keys(HERBATICA_MARKET_CONFIG) as HerbaticaMarket[]
const CURRENCY_CODES = ["czk", "eur", "huf", "ron"] as const

/**
 * The 50 mg sibling already owns GTIN 3800223415288 and
 * medusa.product_variant.ean is uniquely indexed on live rows. The merchant
 * prints the same GTIN on both product pages, so this variant intentionally
 * carries no EAN rather than stealing the sibling's identity.
 */
const GTIN_ON_PAGE = "3800223415288"
const GTIN_OWNER_PRODUCT_ID = "prod_01KTAZ3JCQ6QJVQKJ58J20JDJ8"

type LocalizedSource = Readonly<{
  description: string
  publicSlug: string
  shortDescription: string
  sourceUrl: string
  title: string
}>

type Pterostilben150Source = Readonly<{
  categoryHandle: string
  code: string
  handle: string
  images: readonly string[]
  localized: Readonly<Record<HerbaticaMarket, LocalizedSource>>
  prices: Readonly<Record<(typeof CURRENCY_CODES)[number], number>>
  sku: string
  sourceCategoryPaths: Readonly<Record<HerbaticaMarket, string>>
  sourceShopitemId: string
}>

/** Scraped 2026-08-23 from the four official Herbatica storefronts. */
const PTEROSTILBEN_150: Pterostilben150Source = {
  categoryHandle: "doplnky-vyzivy",
  code: "7657",
  handle: "shopitem-34463",
  images: [
    "https://cdn.myshoptet.com/usr/www.herbatica.sk/user/shop/big/34463_pterostilben-150-mg---100-kapsul---bioherba.jpg",
  ],
  localized: {
    sk: {
      description:
        "Podrobný popis Pterostilbén 150 mg – kapsuly s obsahom polyfenolu a zinku Pterostilbén 150 mg kapsuly od Bioherba kombinujú prírodný polyfenol pterostilbén so zinkom vo forme citrátu zinku. Produkt je navrhnutý pre jednoduché doplnenie stravy v praktickej kapsulovej forme. Pterostilbén je látka prirodzene sa vyskytujúca napríklad v čučoriedkach a je štrukturálne príbuzná resveratrolu . V tejto formulácii je doplnený o zinok – esenciálny minerál s dôležitými funkciami v organizme. Účinky a výhody produktu 150 mg pterostilbénu v kapsule Zinok prispieva k ochrane buniek pred oxidačným stresom Podporuje normálny metabolizmus kyselín a zásad Prispieva k správnej funkcii organizmu na bunkovej úrovni Jednoduché dávkovanie – 1 kapsula denne Dlhodobé balenie – 100 kapsúl Hlavné zložky Pterostilbén: prírodný polyfenol príbuzný resveratrolu, bežne sa vyskytuje napríklad v čučoriedkach. Zinok (citrát zinku): prispieva k ochrane buniek pred oxidačným stresom* prispieva k normálnemu metabolizmu kyselín a zásad* Použitie Dávkovanie: užívajte 1 kapsulu denne a zapite približne 200 ml vody. Tip pre použitie Užívajte pravidelne pre optimálne výsledky. Vhodné zaradiť do každodennej rutiny. Odporúča sa užívať s jedlom. Skladovanie Uchovávajte na suchom a chladnom mieste, mimo priameho slnečného žiarenia. Bezpečnostné upozornenia Neprekračujte odporúčanú dennú dávku. Produkt nie je náhradou pestrej a vyváženej stravy. Nevhodné pre deti, tehotné a dojčiace ženy. Uchovávajte mimo dosahu detí. Nepoužívajte, ak je obal poškodený. Výhody produktu Obsahuje pterostilbén – prírodný polyfenol Doplnený o zinok Jednoduché dávkovanie Praktická kapsulová forma Vyrobené v EÚ podľa prísnych štandardov Obsah balenia: 100 kapsúl Krajina pôvodu: EÚ Dodatočné parametre Kategória : Doplnky výživy EAN : 3800223415288 Zloženie : Pterostilbén; želatína (kapsula); plnivo: mikrokryštalická celulóza; citrát zinku.",
      publicSlug: "pterostilben-150-mg-100-kapsul-bioherba",
      shortDescription:
        "Pterostilbén 150 mg kapsuly so zinkom. Podpora ochrany buniek pred oxidačným stresom a metabolizmu. Praktické balenie 100 kapsúl Bioherba.",
      sourceUrl:
        "https://www.herbatica.sk/doplnky-vyzivy/pterostilben-150-mg-100-kapsul-bioherba/",
      title: "Pterostilbén 150 mg – 100 kapsúl – Bioherba",
    },
    cz: {
      description:
        "Detailní popis produktu Pterostilben 150 mg – kapsle s obsahem polyfenolu a zinku Pterostilben 150 mg kapsle od Bioherba kombinují přírodní polyfenol pterostilben se zinkem ve formě citrátu zinku. Produkt je určen pro snadné doplnění stravy v praktické kapslové formě. Pterostilben je látka přirozeně se vyskytující například v borůvkách a je strukturálně příbuzná resveratrolu. V této receptuře je doplněn o zinek – esenciální minerál s důležitými funkcemi v organismu. Účinky a výhody produktu 150 mg pterostilbenu v kapsli Zinek přispívá k ochraně buněk před oxidativním stresem Podporuje normální metabolismus kyselin a zásad Přispívá k normální funkci organismu na buněčné úrovni Jednoduché dávkování – 1 kapsle denně Balení na delší dobu – 100 kapslí Hlavní složky Pterostilben: přírodní polyfenol příbuzný resveratrolu, běžně se vyskytuje například v borůvkách. Zinek (citrát zinku): přispívá k ochraně buněk před oxidativním stresem* přispívá k normálnímu metabolismu kyselin a zásad* Použití Dávkování: užívejte 1 kapsli denně a zapijte přibližně 200 ml vody. Tip pro použití Užívejte pravidelně pro optimální výsledky. Vhodné zařadit do každodenní rutiny. Doporučuje se užívat s jídlem. Skladování Uchovávejte na suchém a chladném místě, mimo přímé sluneční záření. Bezpečnostní upozornění Nepřekračujte doporučenou denní dávku. Produkt není náhradou pestré a vyvážené stravy. Nevhodné pro děti, těhotné a kojící ženy. Uchovávejte mimo dosah dětí. Nepoužívejte, pokud je obal poškozený. Výhody produktu Obsahuje pterostilben – přírodní polyfenol Doplněný o zinek Jednoduché dávkování Praktická forma kapslí Vyrobeno v EU podle přísných standardů Obsah balení: 100 kapslí Země původu: EU Doplňkové parametry Kategorie : Doplňky výživy EAN : 3800223415288 ? Složení : Pterostilben; želatina (kapsle); plnidlo: mikrokrystalická celulóza; citrát zinečnatý.",
      publicSlug: "pterostilben-150-mg-100-kapsli-bioherba",
      shortDescription:
        "Pterostilben 150 mg v kapslích s zinkem pro snadné doplnění stravy. Praktické balení 100 kapslí, vhodné pro každodenní užívání.",
      sourceUrl:
        "https://www.herbatica.cz/doplnky-vyzivy/pterostilben-150-mg-100-kapsli-bioherba/",
      title: "Pterostilben 150 mg – 100 kapslí – Bioherba",
    },
    hu: {
      description:
        "Termék részletes leírása Pterostilbén 150 mg – polifenolt és cinket tartalmazó kapszula A Bioherba Pterostilbén 150 mg kapszulája a természetes pterostilbén polifenolt cinkkel kombinálja, cink-citrát formájában. A termék praktikus kapszulás kiszerelésben készült, az étrend egyszerű kiegészítésére. A pterostilbén természetesen előforduló anyag, megtalálható például az áfonyában, és szerkezetileg rokon a rezveratrollal. Ebben a formulában cinkkel egészül ki, amely esszenciális ásványi anyag, és fontos szerepet tölt be a szervezet működésében. A termék hatásai és előnyei 150 mg pterostilbén kapszulánként A cink hozzájárul a sejtek oxidatív stresszel szembeni védelméhez Támogatja a normál sav-bázis anyagcserét Hozzájárul a szervezet megfelelő sejtszintű működéséhez Egyszerű adagolás – napi 1 kapszula Hosszú távra elegendő kiszerelés – 100 kapszula Fő összetevők Pterostilbén: a rezveratrollal rokon természetes polifenol, amely általánosan előfordul például az áfonyában. Cink (cink-citrát): hozzájárul a sejtek oxidatív stresszel szembeni védelméhez* hozzájárul a normál sav-bázis anyagcseréhez* Használat Adagolás: napi 1 kapszulát vegyen be, körülbelül 200 ml vízzel. Használati tipp Az optimális eredmény érdekében használja rendszeresen. Könnyen beilleszthető a mindennapi rutinba. Étkezés közbeni bevétele ajánlott. Tárolás Száraz, hűvös helyen, közvetlen napfénytől védve tárolandó. Biztonsági figyelmeztetések Ne lépje túl az ajánlott napi adagot. A termék nem helyettesíti a változatos és kiegyensúlyozott étrendet. Gyermekek, várandós és szoptató nők számára nem alkalmas. Gyermekektől elzárva tartandó. Ne használja, ha a csomagolás sérült. A termék előnyei Pterostilbént, természetes polifenolt tartalmaz Cinkkel kiegészítve Egyszerű adagolás Praktikus kapszulás forma Az EU-ban, szigorú szabványok szerint készült Kiszerelés: 100 kapszula Származási ország: EU Kiegészítő paraméterek Kategória : Táplálékkiegészítők EAN vonalkód : 3800223415288 ? Összetétel : Pterostilbén; zselatin (kapszula); tömegnövelő szer: mikrokristályos cellulóz; cink-citrát.",
      publicSlug: "pterostilben-150-mg-100-kapszula-bioherba",
      shortDescription:
        "Pterostilbén 150 mg kapszula cinkkel, 100 db-os kiszerelésben. Praktikus étrend-kiegészítő kapszula a mindennapi használathoz.",
      sourceUrl:
        "https://www.herbatica.hu/taplalekkiegeszitok/pterostilben-150-mg-100-kapszula-bioherba/",
      title: "Pterostilbén 150 mg – 100 kapszula – Bioherba",
    },
    ro: {
      description:
        "Descriere detaliată a produsului Pterostilben 150 mg – capsule cu polifenol și zinc Capsulele Pterostilben 150 mg de la Bioherba combină polifenolul natural pterostilben cu zinc sub formă de citrat de zinc. Produsul este conceput pentru completarea simplă a alimentației, într-o formă practică de capsule. Pterostilbenul este o substanță care se găsește în mod natural, de exemplu, în afine și este înrudit structural cu resveratrolul. În această formulă este completat cu zinc – un mineral esențial cu funcții importante în organism. Efecte și beneficii ale produsului 150 mg pterostilben per capsulă Zincul contribuie la protejarea celulelor împotriva stresului oxidativ Susține metabolismul normal acido-bazic Contribuie la funcționarea corectă a organismului la nivel celular Dozare simplă – 1 capsulă pe zi Ambalaj pentru utilizare îndelungată – 100 capsule Ingrediente principale Pterostilben: polifenol natural înrudit cu resveratrolul, prezent în mod obișnuit, de exemplu, în afine. Zinc (citrat de zinc): contribuie la protejarea celulelor împotriva stresului oxidativ* contribuie la metabolismul normal acido-bazic* Mod de utilizare Dozare: administrați 1 capsulă pe zi, cu aproximativ 200 ml de apă. Sfat de utilizare Administrați regulat pentru rezultate optime. Potrivit pentru includerea în rutina zilnică. Se recomandă administrarea împreună cu alimente. Depozitare A se păstra într-un loc uscat și răcoros, ferit de lumina directă a soarelui. Atenționări de siguranță Nu depășiți doza zilnică recomandată. Produsul nu înlocuiește o alimentație variată și echilibrată. Nu este potrivit pentru copii, femei însărcinate sau care alăptează. A nu se lăsa la îndemâna copiilor. Nu utilizați dacă ambalajul este deteriorat. Avantajele produsului Conține pterostilben – polifenol natural Completat cu zinc Dozare simplă Formă practică de capsule Fabricat în UE conform unor standarde stricte Conținutul ambalajului: 100 capsule Țara de origine: UE Parametri suplimentari Categorie : Vitamine lipozomale EAN : 3800223415288 ? Ingrediente : Pterostilben; gelatină (capsulă); agent de încărcare: celuloză microcristalină; citrat de zinc.",
      publicSlug: "pterostilben-150-mg-100-capsule-bioherba",
      shortDescription:
        "Capsule cu pterostilben 150 mg și zinc, într-o formulă practică de 100 capsule. Susține protecția celulară și rutina zilnică.",
      sourceUrl:
        "https://www.herbatica.ro/vitamine-lipozomale/pterostilben-150-mg-100-capsule-bioherba/",
      title: "Pterostilben 150 mg – 100 capsule – Bioherba",
    },
  },
  prices: { czk: 619, eur: 25.9, huf: 10_090, ron: 130 },
  sku: "SHOPITEM-34463-34463",
  sourceCategoryPaths: {
    sk: "doplnky-vyzivy",
    cz: "doplnky-vyzivy",
    hu: "taplalekkiegeszitok",
    ro: "vitamine-lipozomale",
  },
  sourceShopitemId: "34463",
}

type RuntimeProduct = ProductDTO &
  Readonly<{
    sales_channels?: readonly Readonly<{ id: string }>[]
  }>

type RuntimePrice = Readonly<{
  amount: number
  currencyCode: string
  id: string
}>

type Change = Readonly<{ after: string; before: string; field: string }>

type ChannelIds = Readonly<Record<HerbaticaMarket | "default", string>>

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex")

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

const resolveSalesChannels = async (
  service: ISalesChannelModuleService
): Promise<ChannelIds> => {
  const names = [
    DEFAULT_SALES_CHANNEL_NAME,
    ...MARKETS.map(
      (market) => HERBATICA_MARKET_CONFIG[market].salesChannelName
    ),
  ]
  const channels = await service.listSalesChannels({ name: names })
  const byName = (name: string) => {
    const matches = channels.filter((channel) => channel.name === name)
    const match = matches[0]
    if (matches.length !== 1 || !match) {
      throw new Error(`Expected exactly one sales channel named ${name}`)
    }
    return match.id
  }
  return {
    default: byName(DEFAULT_SALES_CHANNEL_NAME),
    ...(Object.fromEntries(
      MARKETS.map((market) => [
        market,
        byName(HERBATICA_MARKET_CONFIG[market].salesChannelName),
      ])
    ) as Record<HerbaticaMarket, string>),
  }
}

const assertLocales = async (service: ITranslationModuleService) => {
  for (const market of MARKETS) {
    const localeCode = HERBATICA_MARKET_CONFIG[market].localeCode
    const locales = await service.listLocales(
      { code: localeCode },
      { select: ["code"], take: 2 }
    )
    if (locales.length !== 1) {
      throw new Error(`Expected exact Translation locale ${localeCode}`)
    }
  }
}

const resolveCategoryId = async (service: IProductModuleService) => {
  const categories = await service.listProductCategories(
    { handle: PTEROSTILBEN_150.categoryHandle },
    { select: ["id", "handle"], take: 2 }
  )
  const category = categories[0]
  if (categories.length !== 1 || !category) {
    throw new Error(
      `Expected exactly one product category ${PTEROSTILBEN_150.categoryHandle}`
    )
  }
  return category.id
}

const findExistingProduct = async (
  service: IProductModuleService,
  query: Query
): Promise<null | RuntimeProduct> => {
  const byHandle = (await service.listProducts(
    { handle: PTEROSTILBEN_150.handle },
    {
      relations: ["variants"],
      select: [
        "id",
        "external_id",
        "handle",
        "metadata",
        "status",
        "subtitle",
        "title",
        "description",
        "variants.id",
        "variants.sku",
        "variants.ean",
      ],
      take: 2,
    }
  )) as RuntimeProduct[]
  if (byHandle.length > 1) {
    throw new Error(`Multiple products share handle ${PTEROSTILBEN_150.handle}`)
  }
  const variants = await service.listProductVariants(
    { sku: PTEROSTILBEN_150.sku },
    { select: ["id", "product_id", "sku"], take: 5 }
  )
  const product = byHandle[0] ?? null
  const ownerIds = new Set(
    variants.flatMap((variant) =>
      variant.product_id ? [variant.product_id] : []
    )
  )
  if (!product) {
    if (ownerIds.size > 0) {
      throw new Error(
        `SKU ${PTEROSTILBEN_150.sku} is owned by ${[...ownerIds].join(", ")} but handle ${PTEROSTILBEN_150.handle} is free; resolve manually`
      )
    }
    return null
  }
  for (const ownerId of ownerIds) {
    if (ownerId !== product.id) {
      throw new Error(
        `SKU ${PTEROSTILBEN_150.sku} is owned by ${ownerId}, not ${product.id}`
      )
    }
  }
  const { data: graphed } = await query.graph({
    entity: "product",
    fields: ["id", "sales_channels.id", "categories.id"],
    filters: { id: product.id },
  })
  const links = graphed[0] as
    | undefined
    | {
        categories?: ({ id: string } | null)[]
        sales_channels?: ({ id: string } | null)[]
      }
  return {
    ...product,
    categories: (links?.categories ?? []).flatMap((category) =>
      category?.id ? [{ id: category.id }] : []
    ),
    sales_channels: (links?.sales_channels ?? []).flatMap((channel) =>
      channel?.id ? [{ id: channel.id }] : []
    ),
  } as unknown as RuntimeProduct
}

const buildPublicationMetadata = (salesChannelIds: ChannelIds) => ({
  markets: Object.fromEntries(
    MARKETS.map((market) => [
      market,
      {
        publicationStatus: "published",
        publicSlug: PTEROSTILBEN_150.localized[market].publicSlug,
        salesChannelId: salesChannelIds[market],
      },
    ])
  ),
  schemaVersion: 1,
})

const baseMetadata = () => ({
  demo_generated: true,
  gtin_conflict_note:
    "Merchant prints one GTIN on both the 50 mg and 150 mg Bioherba pterostilbene pages; medusa.product_variant.ean is uniquely indexed so this variant stays EAN-less to avoid stripping the sibling.",
  gtin_on_page: GTIN_ON_PAGE,
  gtin_shared_with: GTIN_OWNER_PRODUCT_ID,
  short_description: PTEROSTILBEN_150.localized.sk.shortDescription,
  source: "herbatica-authorized-live-catalog",
  source_code: PTEROSTILBEN_150.code,
  source_market_category_paths: PTEROSTILBEN_150.sourceCategoryPaths,
  source_shopitem_id: PTEROSTILBEN_150.sourceShopitemId,
  source_urls: Object.fromEntries(
    MARKETS.map((market) => [
      market,
      PTEROSTILBEN_150.localized[market].sourceUrl,
    ])
  ),
  top_offer: {
    code: PTEROSTILBEN_150.code,
    current_price: PTEROSTILBEN_150.prices.eur,
    ean: null,
    price_vat: PTEROSTILBEN_150.prices.eur,
  },
})

const buildProductMetadata = (
  current: Readonly<Record<string, unknown>>,
  salesChannelIds: ChannelIds,
  publish: boolean
) => ({
  ...current,
  ...baseMetadata(),
  ...(publish
    ? {
        [PRODUCT_PUBLICATION_METADATA_KEY]:
          buildPublicationMetadata(salesChannelIds),
      }
    : {}),
})

const buildCreateProductInput = () => {
  const sk = PTEROSTILBEN_150.localized.sk
  const images = PTEROSTILBEN_150.images.map((url) => ({ url }))
  return [
    {
      brand: { title: BRAND_TITLE },
      categories: [{ handle: PTEROSTILBEN_150.categoryHandle }],
      description: sk.description,
      external_id: PTEROSTILBEN_150.sourceShopitemId,
      handle: PTEROSTILBEN_150.handle,
      images,
      metadata: baseMetadata(),
      options: [{ title: "Default option", values: ["Default option value"] }],
      salesChannelNames: [
        DEFAULT_SALES_CHANNEL_NAME,
        ...MARKETS.map(
          (market) => HERBATICA_MARKET_CONFIG[market].salesChannelName
        ),
      ],
      shippingProfileName: "Default Shipping Profile",
      status: ProductStatus.PUBLISHED,
      thumbnail: PTEROSTILBEN_150.images[0],
      title: sk.title,
      variants: [
        {
          ean: null,
          images,
          metadata: {
            code: PTEROSTILBEN_150.code,
            gtin_on_page: GTIN_ON_PAGE,
            gtin_shared_with: GTIN_OWNER_PRODUCT_ID,
            source_shopitem_id: PTEROSTILBEN_150.sourceShopitemId,
          },
          options: { "Default option": "Default option value" },
          prices: CURRENCY_CODES.map((currencyCode) => ({
            amount: PTEROSTILBEN_150.prices[currencyCode],
            currency_code: currencyCode,
          })),
          quantities: {
            locations: [
              {
                quantity: DEMO_STOCK_QUANTITY,
                stockLocationName: STOCK_LOCATION_NAME,
              },
            ],
          },
          sku: PTEROSTILBEN_150.sku,
          thumbnail: PTEROSTILBEN_150.images[0],
          title: "Default option value",
        },
      ],
      weight: 1,
    },
  ]
}

const createProduct = async (container: ExecArgs["container"]) => {
  const stockLocationService = container.resolve<IStockLocationService>(
    Modules.STOCK_LOCATION
  )
  const locations = await stockLocationService.listStockLocations({
    name: STOCK_LOCATION_NAME,
  })
  const location = locations[0]
  if (locations.length !== 1 || !location) {
    throw new Error(
      `Expected exactly one stock location named ${STOCK_LOCATION_NAME}`
    )
  }
  await importHerbaticaSupplementalProductsWorkflow(container).run({
    input: {
      productCategories: [],
      products: buildCreateProductInput(),
      stockLocations: [location],
      taxRates: {
        config: HERBATICA_TAX_RATE_CONFIG,
        countries: HERBATICA_TAX_RATE_COUNTRIES,
      },
    },
  })
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

const productChanges = (
  product: RuntimeProduct,
  salesChannelIds: ChannelIds,
  publish: boolean
): Change[] => {
  const sk = PTEROSTILBEN_150.localized.sk
  const changes: Change[] = []
  const push = (field: string, before: unknown, after: string) => {
    if (asText(before) !== after) {
      changes.push({
        after: truncate(after),
        before: truncate(asText(before)),
        field,
      })
    }
  }
  push("title", product.title, sk.title)
  push("subtitle", product.subtitle, sk.shortDescription)
  push("description", product.description, sk.description)
  push("status", product.status, ProductStatus.PUBLISHED)
  const currentMetadata = (product.metadata ?? {}) as Record<string, unknown>
  if (
    !sameStructure({ ...currentMetadata, ...baseMetadata() }, currentMetadata)
  ) {
    changes.push({ after: "rebuilt", before: "stale", field: "metadata" })
  }
  const currentPublication =
    currentMetadata[PRODUCT_PUBLICATION_METADATA_KEY] ?? null
  if (publish) {
    if (
      !sameStructure(
        currentPublication,
        buildPublicationMetadata(salesChannelIds)
      )
    ) {
      changes.push({
        after: "published x4",
        before: currentPublication ? "stale" : "absent",
        field: "publication",
      })
    }
  } else if (currentPublication !== null) {
    changes.push({
      after: "absent (publication blocked)",
      before: "present",
      field: "publication",
    })
  }
  return changes
}

const channelChanges = (
  product: RuntimeProduct,
  salesChannelIds: ChannelIds
) => {
  const linked = new Set((product.sales_channels ?? []).map(({ id }) => id))
  return Object.entries(salesChannelIds).flatMap(([key, id]) =>
    linked.has(id) ? [] : [key]
  )
}

const priceChanges = (prices: readonly RuntimePrice[]): Change[] => {
  const byCurrency = new Map(prices.map((price) => [price.currencyCode, price]))
  return CURRENCY_CODES.flatMap((currencyCode) => {
    const current = byCurrency.get(currencyCode)
    const desired = PTEROSTILBEN_150.prices[currencyCode]
    if (current && Math.abs(current.amount - desired) < 0.000_001) {
      return []
    }
    return [
      {
        after: String(desired),
        before: current ? String(current.amount) : "missing",
        field: `price.${currencyCode}`,
      },
    ]
  })
}

const listTranslations = async (
  service: ITranslationModuleService,
  referenceIds: readonly string[],
  localeCode: string,
  reference: "product" | "product_content"
) => {
  const translations = await service.listTranslations(
    { locale_code: localeCode, reference_id: [...referenceIds] },
    {
      select: [
        "id",
        "locale_code",
        "reference",
        "reference_id",
        "translations",
        "deleted_at",
      ],
      take: referenceIds.length * 2 + 1,
    }
  )
  return translations.filter(
    (translation) =>
      !translation.deleted_at && translation.reference === reference
  )
}

const desiredProductTranslation = (market: HerbaticaMarket) => {
  const localized = PTEROSTILBEN_150.localized[market]
  return {
    description: localized.description,
    subtitle: localized.shortDescription,
    title: localized.title,
  }
}

const translationChanges = async (
  service: ITranslationModuleService,
  productId: string
): Promise<Change[]> => {
  const changes: Change[] = []
  for (const market of MARKETS) {
    const localeCode = HERBATICA_MARKET_CONFIG[market].localeCode
    const existing = await listTranslations(
      service,
      [productId],
      localeCode,
      "product"
    )
    if (existing.length > 1) {
      throw new Error(`Duplicate ${localeCode} product translation`)
    }
    const desired = desiredProductTranslation(market)
    const prior = existing[0]?.translations as
      | undefined
      | Record<string, unknown>
    if (!prior) {
      changes.push({
        after: truncate(desired.title),
        before: "missing",
        field: `translation.${localeCode}`,
      })
      continue
    }
    for (const key of ["title", "subtitle", "description"] as const) {
      if (asText(prior[key]) !== desired[key]) {
        changes.push({
          after: truncate(desired[key]),
          before: truncate(asText(prior[key])),
          field: `translation.${localeCode}.${key}`,
        })
      }
    }
  }
  return changes
}

const applyTranslations = async (
  container: ExecArgs["container"],
  service: ITranslationModuleService,
  productId: string,
  productContentId: string
) => {
  const creates: CreateTranslationDTO[] = []
  const updates: UpdateTranslationDTO[] = []
  for (const market of MARKETS) {
    const localeCode = HERBATICA_MARKET_CONFIG[market].localeCode
    const desired = desiredProductTranslation(market)
    const existing = await listTranslations(
      service,
      [productId],
      localeCode,
      "product"
    )
    const prior = existing[0]
    if (prior) {
      if (!sameStructure(prior.translations, desired)) {
        updates.push({ id: prior.id, translations: desired })
      }
    } else {
      creates.push({
        locale_code: localeCode,
        reference: "product",
        reference_id: productId,
        translations: desired,
      })
    }
    const existingContent = await listTranslations(
      service,
      [productContentId],
      localeCode,
      "product_content"
    )
    if (existingContent.length === 0) {
      creates.push({
        locale_code: localeCode,
        reference: "product_content",
        reference_id: productContentId,
        translations: {},
      })
    }
  }
  if (creates.length > 0) {
    await createTranslationsWorkflow(container).run({
      input: { translations: creates },
    })
  }
  if (updates.length > 0) {
    await updateTranslationsWorkflow(container).run({
      input: { translations: updates },
    })
  }
}

const resolveProductContentId = async (
  container: ExecArgs["container"],
  productId: string
) => {
  const service = container.resolve<ProductContentModuleService>(
    PRODUCT_CONTENT_MODULE
  )
  const contents = await service.listProductContents(
    { product_id: productId },
    { select: ["id", "product_id"], take: 2 }
  )
  const content = contents[0]
  if (contents.length !== 1 || !content) {
    throw new Error(`Expected exactly one product content for ${productId}`)
  }
  return content.id
}

const applyPlan = async (
  input: Readonly<{
    categoryId: string
    container: ExecArgs["container"]
    product: RuntimeProduct
    publish: boolean
    query: Query
    salesChannelIds: ChannelIds
  }>
) => {
  const { categoryId, container, product, publish, query, salesChannelIds } =
    input
  const sk = PTEROSTILBEN_150.localized.sk
  const categoryIds = new Set(
    ((product as { categories?: { id: string }[] }).categories ?? []).map(
      ({ id }) => id
    )
  )
  categoryIds.add(categoryId)
  await updateProductsWorkflow(container).run({
    input: {
      products: [
        {
          category_ids: [...categoryIds],
          description: sk.description,
          id: product.id,
          metadata: buildProductMetadata(
            (product.metadata ?? {}) as Record<string, unknown>,
            salesChannelIds,
            publish
          ),
          sales_channels: Object.values(salesChannelIds).map((id) => ({ id })),
          status: ProductStatus.PUBLISHED,
          subtitle: sk.shortDescription,
          title: sk.title,
        },
      ],
    },
  })
  const variant = (product.variants ?? [])[0] as undefined | ProductVariantDTO
  if (!variant) {
    throw new Error("Pterostilbén 150 mg variant is missing")
  }
  const prices = await listVariantPrices(query, variant.id)
  const byCurrency = new Map(prices.map((price) => [price.currencyCode, price]))
  await updateProductVariantsWorkflow(container).run({
    input: {
      product_variants: [
        {
          id: variant.id,
          prices: CURRENCY_CODES.map((currencyCode) => {
            const current = byCurrency.get(currencyCode)
            return {
              ...(current ? { id: current.id } : {}),
              amount: PTEROSTILBEN_150.prices[currencyCode],
              currency_code: currencyCode,
            }
          }),
        },
      ],
    },
  })
  const productContentId = await resolveProductContentId(container, product.id)
  await applyTranslations(
    container,
    container.resolve<ITranslationModuleService>(Modules.TRANSLATION),
    product.id,
    productContentId
  )
}

const buildPlan = async (
  input: Readonly<{
    categoryId: string
    product: null | RuntimeProduct
    publish: boolean
    query: Query
    salesChannelIds: ChannelIds
    translationService: ITranslationModuleService
  }>
) => {
  const { categoryId, product, publish, query, salesChannelIds } = input
  const variant = (product?.variants ?? [])[0] as undefined | ProductVariantDTO
  const changes = product
    ? productChanges(product, salesChannelIds, publish)
    : []
  const missingChannels = product
    ? channelChanges(product, salesChannelIds)
    : []
  const pendingPrices = variant
    ? priceChanges(await listVariantPrices(query, variant.id))
    : []
  const pendingTranslations = product
    ? await translationChanges(input.translationService, product.id)
    : []
  const create = product === null
  return {
    categoryId,
    changes,
    create,
    ean: null,
    gtinSharedWith: GTIN_OWNER_PRODUCT_ID,
    missingChannels,
    pendingPrices,
    pendingTranslations,
    prices: PTEROSTILBEN_150.prices,
    productId: product?.id ?? null,
    publish,
    salesChannelIds,
    slugs: Object.fromEntries(
      MARKETS.map((market) => [
        market,
        PTEROSTILBEN_150.localized[market].publicSlug,
      ])
    ),
    sourceHash: sha256(JSON.stringify(PTEROSTILBEN_150)),
    totalChanges:
      changes.length +
      missingChannels.length +
      pendingPrices.length +
      pendingTranslations.length +
      (create ? 1 : 0),
    variantId: variant?.id ?? null,
  }
}

export default async function herbaticaPterostilben150Import({
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const productService = container.resolve<IProductModuleService>(
    Modules.PRODUCT
  )
  const salesChannelService = container.resolve<ISalesChannelModuleService>(
    Modules.SALES_CHANNEL
  )
  const translationService = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const apply = process.env[APPLY_ENV_VAR] === "1"
  const publish = process.env[PUBLISH_ENV_VAR] === "1"

  if (!publish) {
    logger.warn(
      `Publication is disabled. Every official 150 mg slug is already reserved in url_entity_slug as a permanent alias of the 50 mg route (${GTIN_OWNER_PRODUCT_ID}); the registry is append-only and would answer SLUG_CONFLICT. Set ${PUBLISH_ENV_VAR}=1 only after an operator frees those four slugs.`
    )
  }

  await assertLocales(translationService)
  const [salesChannelIds, categoryId] = await Promise.all([
    resolveSalesChannels(salesChannelService),
    resolveCategoryId(productService),
  ])

  let product = await findExistingProduct(productService, query)
  const plan = await buildPlan({
    categoryId,
    product,
    publish,
    query,
    salesChannelIds,
    translationService,
  })
  logger.info(
    `Pterostilbén 150 mg plan: ${JSON.stringify({ ...plan, apply }, null, 2)}`
  )

  if (!apply) {
    logger.info(
      `Dry-run complete; ${plan.totalChanges} pending change(s). Set ${APPLY_ENV_VAR}=1 to apply.`
    )
    return plan
  }
  if (plan.totalChanges === 0) {
    logger.info("Pterostilbén 150 mg import is already converged")
    return { ...plan, applied: false }
  }

  if (plan.create) {
    await createProduct(container)
    product = await findExistingProduct(productService, query)
  }
  if (!product) {
    throw new Error("Pterostilbén 150 mg product is unresolved")
  }
  await applyPlan({
    categoryId,
    container,
    product,
    publish,
    query,
    salesChannelIds,
  })

  const after = await findExistingProduct(productService, query)
  if (!after) {
    throw new Error("Pterostilbén 150 mg product is missing after apply")
  }
  const residual = await buildPlan({
    categoryId,
    product: after,
    publish,
    query,
    salesChannelIds,
    translationService,
  })
  if (residual.totalChanges !== 0) {
    throw new Error(
      `Verification failed: ${JSON.stringify({
        changes: residual.changes,
        missingChannels: residual.missingChannels,
        pendingPrices: residual.pendingPrices,
        pendingTranslations: residual.pendingTranslations,
      })}`
    )
  }
  logger.info(
    `Pterostilbén 150 mg applied and verified: productId=${after.id} published=${publish}`
  )
  return { ...plan, applied: true, productId: after.id }
}
