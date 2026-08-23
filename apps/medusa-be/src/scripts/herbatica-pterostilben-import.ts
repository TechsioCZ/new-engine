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
import {
  PRODUCT_PUBLICATION_METADATA_KEY,
  parseProductPublicationSnapshot,
} from "../modules/url-registry-outbox/product-publication-assignment"
import importHerbaticaSupplementalProductsWorkflow from "../workflows/seed/workflows/import-herbatica-supplemental-products"
import {
  HERBATICA_TAX_RATE_CONFIG,
  HERBATICA_TAX_RATE_COUNTRIES,
} from "./herbatica-seed-config"
import {
  HERBATICA_MARKET_CONFIG,
  type HerbaticaMarket,
} from "./herbatica-supplemental-import/manifest"

const APPLY_ENV_VAR = "HERBATICA_PTEROSTILBEN_APPLY"
const STOCK_LOCATION_NAME = "European Warehouse"
const DEFAULT_SALES_CHANNEL_NAME = "Default Sales Channel"
const DEMO_STOCK_QUANTITY = 25
const MARKETS = Object.keys(HERBATICA_MARKET_CONFIG) as HerbaticaMarket[]

type LocalizedSource = Readonly<{
  description: string
  publicSlug: string
  shortDescription: string
  sourceUrl: string
  title: string
}>

type PterostilbenSource = Readonly<{
  categoryHandle: string
  code: string
  ean: string
  handle: string
  images: readonly string[]
  localized: Readonly<Record<HerbaticaMarket, LocalizedSource>>
  prices: Readonly<Record<"czk" | "eur" | "huf" | "ron", number>>
  sku: string
  sourceCategoryPaths: Readonly<Record<HerbaticaMarket, string>>
  sourceShopitemId: string
}>

/**
 * Scraped from the four official Herbatica storefronts and authorized by the
 * operator as the price source of record. Shoptet product id 21978 is the SK
 * identity for code 6269; the live sites publish GTIN 3800223415288 on both the
 * 50 mg and the 150 mg Bioherba pterostilbene, which is a merchant-side data
 * error preserved verbatim here.
 */
const PTEROSTILBEN: PterostilbenSource = {
  categoryHandle: "doplnky-vyzivy",
  code: "6269",
  ean: "3800223415288",
  handle: "shopitem-21978",
  images: [
    "https://cdn.myshoptet.com/usr/www.herbatica.sk/user/shop/orig/21978_pterostilben-50-mg---60-kapsul---bioherba.jpg",
  ],
  localized: {
    sk: {
      description:
        "Podrobný popis Pterostilbén 50 mg – kapsuly s obsahom polyfenolu a zinku. Pterostilbén 50 mg kapsuly od Bioherba kombinujú prírodný polyfenol pterostilbén so zinkom vo forme citrátu zinku. Produkt je navrhnutý pre jednoduché doplnenie stravy v praktickej kapsulovej forme. Pterostilbén je látka prirodzene sa vyskytujúca napríklad v čučoriedkach a je štrukturálne príbuzná resveratrolu. V tejto formulácii je doplnený o zinok – esenciálny minerál s dôležitými funkciami v organizme. Účinky a výhody: 50 mg pterostilbénu v kapsule; zinok prispieva k ochrane buniek pred oxidačným stresom; podporuje normálny metabolizmus kyselín a zásad; prispieva k správnej funkcii organizmu na bunkovej úrovni; jednoduché dávkovanie – 1 kapsula denne; dlhodobé balenie – 60 kapsúl. Hlavné zložky: Pterostilbén (prírodný polyfenol príbuzný resveratrolu, bežne v čučoriedkach); Zinok (citrát zinku) – prispieva k ochrane buniek pred oxidačným stresom a k normálnemu metabolizmu kyselín a zásad. Použitie: 1 kapsula denne, zapiť približne 200 ml vody, odporúča sa užívať s jedlom. Skladovanie: na suchom a chladnom mieste, mimo priameho slnečného žiarenia. Bezpečnostné upozornenia: neprekračujte odporúčanú dennú dávku; nie je náhradou pestrej a vyváženej stravy; nevhodné pre deti, tehotné a dojčiace ženy; uchovávajte mimo dosahu detí; nepoužívajte, ak je obal poškodený.",
      publicSlug: "pterostilben-50-mg-60-kapsul",
      shortDescription:
        "Pterostilbén 50 mg kapsuly obsahujú prírodný polyfenol doplnený o zinok, ktorý chráni bunky pred oxidačným stresom a podporuje metabolické procesy. Praktická kapsulová forma umožňuje jednoduché každodenné užívanie.",
      sourceUrl: "https://www.herbatica.sk/pterostilben-50-mg-60-kapsul/",
      title: "Pterostilbén 50 mg – 60 kapsúl – Bioherba",
    },
    cz: {
      description:
        "Detailní popis produktu Pterostilben 50 mg – kapsle s obsahem polyfenolu a zinku. Pterostilben 50 mg kapsle od Bioherba kombinují přírodní polyfenol pterostilben se zinkem ve formě citrátu zinku. Produkt je určen pro snadné doplnění stravy v praktické kapslové formě. Pterostilben je látka přirozeně se vyskytující například v borůvkách a je strukturálně příbuzná resveratrolu. V této receptuře je doplněn o zinek – esenciální minerál s důležitými funkcemi v organismu. Účinky a výhody: 50 mg pterostilbenu v kapsli; zinek přispívá k ochraně buněk před oxidativním stresem; podporuje normální metabolismus kyselin a zásad; přispívá k normální funkci organismu na buněčné úrovni; jednoduché dávkování – 1 kapsle denně; balení na delší dobu – 60 kapslí. Hlavní složky: Pterostilben (přírodní polyfenol příbuzný resveratrolu, běžně v borůvkách); Zinek (citrát zinku) – přispívá k ochraně buněk před oxidativním stresem a k normálnímu metabolismu kyselin a zásad. Použití: 1 kapsle denně, zapít přibližně 200 ml vody, doporučuje se užívat s jídlem. Skladování: na suchém a chladném místě, mimo přímé sluneční záření. Bezpečnostní upozornění: nepřekračujte doporučenou denní dávku; produkt není náhradou pestré a vyvážené stravy; nevhodné pro děti, těhotné a kojící ženy; uchovávejte mimo dosah dětí; nepoužívejte, pokud je obal poškozený.",
      publicSlug: "pterostilben-50-mg---60-kapsli---bioherba",
      shortDescription:
        "Pterostilben 50 mg kapsle obsahují přírodní polyfenol doplněný o zinek, který přispívá k ochraně buněk před oxidativním stresem a podporuje metabolické procesy. Praktická forma kapslí umožňuje jednoduché každodenní užívání.",
      sourceUrl:
        "https://www.herbatica.cz/pterostilben-50-mg---60-kapsli---bioherba/",
      title: "Pterostilben 50 mg s zinkem – 60 kapslí",
    },
    hu: {
      description:
        "Termék részletes leírása Pterostilbén 50 mg – polifenolt és cinket tartalmazó kapszula. A Bioherba Pterostilbén 50 mg kapszulája a természetes pterostilbén polifenolt cinkkel kombinálja, cink-citrát formájában. A termék praktikus kapszulás kiszerelésben készült, az étrend egyszerű kiegészítésére. A pterostilbén természetesen előforduló anyag, megtalálható például az áfonyában, és szerkezetileg rokon a rezveratrollal. Ebben a formulában cinkkel egészül ki, amely esszenciális ásványi anyag, és fontos szerepet tölt be a szervezet működésében. Hatások és előnyök: 50 mg pterostilbén kapszulánként; a cink hozzájárul a sejtek oxidatív stresszel szembeni védelméhez; támogatja a normál sav-bázis anyagcserét; hozzájárul a szervezet megfelelő sejtszintű működéséhez; egyszerű adagolás – napi 1 kapszula; hosszú távra elegendő kiszerelés – 60 kapszula. Fő összetevők: Pterostilbén (a rezveratrollal rokon természetes polifenol, megtalálható pl. az áfonyában); Cink (cink-citrát) – hozzájárul a sejtek oxidatív stresszel szembeni védelméhez és a normál sav-bázis anyagcseréhez. Használat: napi 1 kapszula, kb. 200 ml vízzel, ajánlott étkezés közben bevenni. Tárolás: száraz, hűvös helyen, közvetlen napfénytől védve. Biztonsági figyelmeztetések: ne lépje túl az ajánlott napi adagot; a termék nem helyettesíti a változatos és kiegyensúlyozott étrendet; gyermekek, várandós és szoptató nők számára nem alkalmas; gyermekektől elzárva tartandó.",
      publicSlug: "pterostilben-50-mg---60-kapszula---bioherba",
      shortDescription:
        "A Pterostilbén 50 mg kapszula természetes polifenolt tartalmaz cinkkel kiegészítve, amely hozzájárul a sejtek oxidatív stresszel szembeni védelméhez és támogatja az anyagcsere-folyamatokat. A praktikus kapszulás forma egyszerű mindennapi használatot tesz lehetővé.",
      sourceUrl:
        "https://www.herbatica.hu/pterostilben-50-mg---60-kapszula---bioherba/",
      title: "Pterostilbén 50 mg kapszula cinkkel, 60 db",
    },
    ro: {
      description:
        "Descriere detaliată a produsului Pterostilben 50 mg – capsule cu polifenol și zinc. Capsulele Pterostilben 50 mg de la Bioherba combină polifenolul natural pterostilben cu zinc sub formă de citrat de zinc. Produsul este conceput pentru completarea simplă a alimentației, într-o formă practică de capsule. Pterostilbenul este o substanță care se găsește în mod natural, de exemplu, în afine, și este înrudit structural cu resveratrolul. În această formulă este completat cu zinc – un mineral esențial cu funcții importante în organism. Efecte și beneficii: 50 mg pterostilben per capsulă; zincul contribuie la protejarea celulelor împotriva stresului oxidativ; susține metabolismul normal acido-bazic; contribuie la funcționarea corectă a organismului la nivel celular; dozare simplă – 1 capsulă pe zi; ambalaj pentru utilizare îndelungată – 60 capsule. Ingrediente principale: Pterostilben (polifenol natural înrudit cu resveratrolul, prezent de exemplu în afine); Zinc (citrat de zinc) – contribuie la protejarea celulelor împotriva stresului oxidativ și la metabolismul normal acido-bazic. Mod de utilizare: 1 capsulă pe zi, cu aproximativ 200 ml de apă, se recomandă administrarea împreună cu alimente. Depozitare: într-un loc uscat și răcoros, ferit de lumina directă a soarelui. Atenționări de siguranță: nu depășiți doza zilnică recomandată; produsul nu înlocuiește o alimentație variată și echilibrată; nu este potrivit pentru copii, femei însărcinate sau care alăptează.",
      publicSlug: "pterostilben-50-mg---60-capsule---bioherba",
      shortDescription:
        "Capsulele Pterostilben 50 mg conțin un polifenol natural completat cu zinc, care contribuie la protejarea celulelor împotriva stresului oxidativ și susține procesele metabolice. Forma practică de capsule permite administrarea zilnică ușoară.",
      sourceUrl:
        "https://www.herbatica.ro/pterostilben-50-mg---60-capsule---bioherba/",
      title: "Pterostilben 50 mg cu zinc, 60 capsule Bioherba",
    },
  },
  prices: { czk: 619, eur: 24.9, huf: 10_090, ron: 130 },
  sku: "SHOPITEM-21978-21978",
  sourceCategoryPaths: {
    sk: "doplnky-vyzivy",
    cz: "doplnky-vyzivy",
    hu: "taplalekkiegeszitok",
    ro: "vitamine-lipozomale",
  },
  sourceShopitemId: "21978",
}

const BRAND_TITLE = "Bioherba"
const CURRENCY_CODES = ["czk", "eur", "huf", "ron"] as const

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

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex")

/**
 * jsonb round-trips do not preserve key order, so structural comparison must be
 * order-independent or every re-run reports a phantom change.
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

const sameAmount = (left: number, right: number) =>
  Math.abs(left - right) < 0.000_001

const truncate = (value: string, length = 72) =>
  value.length <= length ? value : `${value.slice(0, length)}…`

const resolveSalesChannels = async (
  service: ISalesChannelModuleService
): Promise<Readonly<Record<HerbaticaMarket | "default", string>>> => {
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
    { handle: PTEROSTILBEN.categoryHandle },
    { select: ["id", "handle"], take: 2 }
  )
  const category = categories[0]
  if (categories.length !== 1 || !category) {
    throw new Error(
      `Expected exactly one product category ${PTEROSTILBEN.categoryHandle}`
    )
  }
  return category.id
}

/**
 * Identity is anchored on three independent keys so a re-run can never create a
 * duplicate and can never adopt an unrelated product.
 */
const findExistingProduct = async (
  service: IProductModuleService,
  query: Query
): Promise<null | RuntimeProduct> => {
  const byHandle = (await service.listProducts(
    { handle: PTEROSTILBEN.handle },
    {
      relations: ["sales_channels", "variants", "categories"],
      select: [
        "id",
        "external_id",
        "handle",
        "metadata",
        "status",
        "subtitle",
        "title",
        "description",
        "sales_channels.id",
        "categories.id",
        "variants.id",
        "variants.sku",
        "variants.ean",
      ],
      take: 2,
    }
  )) as RuntimeProduct[]
  if (byHandle.length > 1) {
    throw new Error(`Multiple products share handle ${PTEROSTILBEN.handle}`)
  }
  const variants = await service.listProductVariants(
    { $or: [{ sku: PTEROSTILBEN.sku }, { ean: PTEROSTILBEN.ean }] },
    { select: ["id", "product_id", "sku", "ean"], take: 10 }
  )
  const ownerIds = new Set(
    variants.flatMap((variant) =>
      variant.product_id ? [variant.product_id] : []
    )
  )
  const product = byHandle[0] ?? null
  if (!product) {
    if (ownerIds.size > 0) {
      throw new Error(
        `SKU/EAN identity is owned by ${[...ownerIds].join(", ")} but handle ${PTEROSTILBEN.handle} is free; resolve manually`
      )
    }
    return null
  }
  for (const ownerId of ownerIds) {
    if (ownerId !== product.id) {
      throw new Error(
        `SKU ${PTEROSTILBEN.sku} / EAN ${PTEROSTILBEN.ean} is owned by ${ownerId}, not ${product.id}`
      )
    }
  }
  // listProducts does not hydrate link-module relations; Query is the only
  // reliable source for sales channel and category membership.
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

const buildPublicationMetadata = (
  salesChannelIds: Readonly<Record<HerbaticaMarket | "default", string>>
) => ({
  markets: Object.fromEntries(
    MARKETS.map((market) => [
      market,
      {
        publicationStatus: "published",
        publicSlug: PTEROSTILBEN.localized[market].publicSlug,
        salesChannelId: salesChannelIds[market],
      },
    ])
  ),
  schemaVersion: 1,
})

const buildProductMetadata = (
  current: Readonly<Record<string, unknown>>,
  salesChannelIds: Readonly<Record<HerbaticaMarket | "default", string>>
) => {
  const currentTopOffer =
    current.top_offer && typeof current.top_offer === "object"
      ? (current.top_offer as Record<string, unknown>)
      : {}
  return {
    ...current,
    demo_generated: true,
    short_description: PTEROSTILBEN.localized.sk.shortDescription,
    source_code: PTEROSTILBEN.code,
    source_market_category_paths: PTEROSTILBEN.sourceCategoryPaths,
    source_shopitem_id: PTEROSTILBEN.sourceShopitemId,
    source_urls: Object.fromEntries(
      MARKETS.map((market) => [
        market,
        PTEROSTILBEN.localized[market].sourceUrl,
      ])
    ),
    top_offer: {
      ...currentTopOffer,
      code: PTEROSTILBEN.code,
      current_price: PTEROSTILBEN.prices.eur,
      ean: PTEROSTILBEN.ean,
      price_vat: PTEROSTILBEN.prices.eur,
    },
    [PRODUCT_PUBLICATION_METADATA_KEY]:
      buildPublicationMetadata(salesChannelIds),
  }
}

const buildCreateProductInput = () => {
  const sk = PTEROSTILBEN.localized.sk
  const images = PTEROSTILBEN.images.map((url) => ({ url }))
  return [
    {
      brand: { title: BRAND_TITLE },
      categories: [{ handle: PTEROSTILBEN.categoryHandle }],
      description: sk.description,
      external_id: PTEROSTILBEN.sourceShopitemId,
      handle: PTEROSTILBEN.handle,
      images,
      metadata: {
        demo_generated: true,
        short_description: sk.shortDescription,
        source: "herbatica-authorized-live-catalog",
        source_code: PTEROSTILBEN.code,
        source_shopitem_id: PTEROSTILBEN.sourceShopitemId,
      },
      options: [{ title: "Default option", values: ["Default option value"] }],
      salesChannelNames: [
        DEFAULT_SALES_CHANNEL_NAME,
        ...MARKETS.map(
          (market) => HERBATICA_MARKET_CONFIG[market].salesChannelName
        ),
      ],
      shippingProfileName: "Default Shipping Profile",
      status: ProductStatus.PUBLISHED,
      thumbnail: PTEROSTILBEN.images[0],
      title: sk.title,
      variants: [
        {
          ean: PTEROSTILBEN.ean,
          images,
          metadata: {
            code: PTEROSTILBEN.code,
            source_shopitem_id: PTEROSTILBEN.sourceShopitemId,
          },
          options: { "Default option": "Default option value" },
          prices: CURRENCY_CODES.map((currencyCode) => ({
            amount: PTEROSTILBEN.prices[currencyCode],
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
          sku: PTEROSTILBEN.sku,
          thumbnail: PTEROSTILBEN.images[0],
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
  salesChannelIds: Readonly<Record<HerbaticaMarket | "default", string>>
): Change[] => {
  const sk = PTEROSTILBEN.localized.sk
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
    !sameStructure(
      currentMetadata[PRODUCT_PUBLICATION_METADATA_KEY] ?? null,
      buildPublicationMetadata(salesChannelIds)
    )
  ) {
    for (const market of MARKETS) {
      const current = (
        currentMetadata[PRODUCT_PUBLICATION_METADATA_KEY] as
          | undefined
          | { markets?: Record<string, { publicSlug?: string }> }
      )?.markets?.[market]?.publicSlug
      push(
        `publication.${market}.publicSlug`,
        current,
        PTEROSTILBEN.localized[market].publicSlug
      )
    }
    if (changes.every((change) => !change.field.startsWith("publication."))) {
      changes.push({
        after: "rebuilt",
        before: "stale",
        field: "publication.metadata",
      })
    }
  }
  return changes
}

const channelChanges = (
  product: RuntimeProduct,
  salesChannelIds: Readonly<Record<HerbaticaMarket | "default", string>>
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
    const desired = PTEROSTILBEN.prices[currencyCode]
    if (current && sameAmount(current.amount, desired)) {
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
  const localized = PTEROSTILBEN.localized[market]
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

const applyProductUpdate = async (
  container: ExecArgs["container"],
  product: RuntimeProduct,
  salesChannelIds: Readonly<Record<HerbaticaMarket | "default", string>>,
  categoryId: string
) => {
  const sk = PTEROSTILBEN.localized.sk
  const currentCategoryIds = new Set(
    ((product as { categories?: { id: string }[] }).categories ?? []).map(
      ({ id }) => id
    )
  )
  currentCategoryIds.add(categoryId)
  await updateProductsWorkflow(container).run({
    input: {
      products: [
        {
          category_ids: [...currentCategoryIds],
          description: sk.description,
          id: product.id,
          metadata: buildProductMetadata(
            (product.metadata ?? {}) as Record<string, unknown>,
            salesChannelIds
          ),
          sales_channels: Object.values(salesChannelIds).map((id) => ({ id })),
          status: ProductStatus.PUBLISHED,
          subtitle: sk.shortDescription,
          title: sk.title,
        },
      ],
    },
  })
}

const applyPrices = async (
  container: ExecArgs["container"],
  variantId: string,
  prices: readonly RuntimePrice[]
) => {
  const byCurrency = new Map(prices.map((price) => [price.currencyCode, price]))
  await updateProductVariantsWorkflow(container).run({
    input: {
      product_variants: [
        {
          id: variantId,
          prices: CURRENCY_CODES.map((currencyCode) => {
            const current = byCurrency.get(currencyCode)
            return {
              ...(current ? { id: current.id } : {}),
              amount: PTEROSTILBEN.prices[currencyCode],
              currency_code: currencyCode,
            }
          }),
        },
      ],
    },
  })
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

const verify = async (
  container: ExecArgs["container"],
  query: Query,
  salesChannelIds: Readonly<Record<HerbaticaMarket | "default", string>>
) => {
  const productService = container.resolve<IProductModuleService>(
    Modules.PRODUCT
  )
  const translationService = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const product = await findExistingProduct(productService, query)
  if (!product) {
    throw new Error("Pterostilbén product is missing after apply")
  }
  const remaining = [
    ...productChanges(product, salesChannelIds),
    ...(await translationChanges(translationService, product.id)),
  ]
  const missingChannels = channelChanges(product, salesChannelIds)
  const variant = (product.variants ?? [])[0] as undefined | ProductVariantDTO
  if (!variant) {
    throw new Error("Pterostilbén variant is missing after apply")
  }
  const remainingPrices = priceChanges(
    await listVariantPrices(query, variant.id)
  )
  if (
    remaining.length > 0 ||
    missingChannels.length > 0 ||
    remainingPrices.length > 0
  ) {
    throw new Error(
      `Verification failed: ${JSON.stringify({
        missingChannels,
        remaining,
        remainingPrices,
      })}`
    )
  }
  const snapshot = parseProductPublicationSnapshot({
    ...product,
    sales_channels: (product.sales_channels ?? []).map(({ id }) => ({ id })),
  })
  for (const market of MARKETS) {
    const assignment = snapshot.assignments[market]
    if (
      assignment?.publicationStatus !== "published" ||
      assignment.publicSlug !== PTEROSTILBEN.localized[market].publicSlug ||
      assignment.salesChannelId !== salesChannelIds[market]
    ) {
      throw new Error(`Publication snapshot for ${market} is invalid`)
    }
  }
  return { productId: product.id, variantId: variant.id }
}

type PlanInput = Readonly<{
  categoryId: string
  product: null | RuntimeProduct
  query: Query
  salesChannelIds: Readonly<Record<HerbaticaMarket | "default", string>>
  translationService: ITranslationModuleService
}>

const buildPlan = async (input: PlanInput) => {
  const { categoryId, product, query, salesChannelIds } = input
  const variant = (product?.variants ?? [])[0] as undefined | ProductVariantDTO
  const changes = product ? productChanges(product, salesChannelIds) : []
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
    missingChannels,
    pendingPrices,
    pendingTranslations,
    prices: PTEROSTILBEN.prices,
    productId: product?.id ?? null,
    salesChannelIds,
    slugs: Object.fromEntries(
      MARKETS.map((market) => [
        market,
        PTEROSTILBEN.localized[market].publicSlug,
      ])
    ),
    sourceHash: sha256(JSON.stringify(PTEROSTILBEN)),
    totalChanges:
      changes.length +
      missingChannels.length +
      pendingPrices.length +
      pendingTranslations.length +
      (create ? 1 : 0),
    variantId: variant?.id ?? null,
  }
}

const applyPlan = async (
  input: Readonly<{
    categoryId: string
    container: ExecArgs["container"]
    product: RuntimeProduct
    query: Query
    salesChannelIds: Readonly<Record<HerbaticaMarket | "default", string>>
  }>
) => {
  const { categoryId, container, product, query, salesChannelIds } = input
  await applyProductUpdate(container, product, salesChannelIds, categoryId)
  const variant = (product.variants ?? [])[0] as undefined | ProductVariantDTO
  if (!variant) {
    throw new Error("Pterostilbén variant is missing")
  }
  await applyPrices(
    container,
    variant.id,
    await listVariantPrices(query, variant.id)
  )
  const productContentId = await resolveProductContentId(container, product.id)
  await applyTranslations(
    container,
    container.resolve<ITranslationModuleService>(Modules.TRANSLATION),
    product.id,
    productContentId
  )
}

export default async function herbaticaPterostilbenImport({
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

  await assertLocales(translationService)
  const [salesChannelIds, categoryId] = await Promise.all([
    resolveSalesChannels(salesChannelService),
    resolveCategoryId(productService),
  ])

  let product = await findExistingProduct(productService, query)
  const plan = await buildPlan({
    categoryId,
    product,
    query,
    salesChannelIds,
    translationService,
  })
  logger.info(
    `Pterostilbén import plan: ${JSON.stringify({ ...plan, apply }, null, 2)}`
  )

  if (!apply) {
    logger.info(
      `Dry-run complete; ${plan.totalChanges} pending change(s). Set ${APPLY_ENV_VAR}=1 to apply.`
    )
    return plan
  }
  if (plan.totalChanges === 0) {
    logger.info("Pterostilbén import is already converged; nothing to apply")
    return { ...plan, applied: false }
  }

  if (plan.create) {
    await createProduct(container)
    product = await findExistingProduct(productService, query)
  }
  if (!product) {
    throw new Error("Pterostilbén product is unresolved")
  }
  await applyPlan({
    categoryId,
    container,
    product,
    query,
    salesChannelIds,
  })

  const verified = await verify(container, query, salesChannelIds)
  logger.info(
    `Pterostilbén import applied and verified: ${JSON.stringify(verified)}`
  )
  return { ...plan, applied: true, verified }
}
