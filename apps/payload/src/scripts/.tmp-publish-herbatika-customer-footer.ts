import { createHash } from "node:crypto"
import { getPayload } from "payload"
import config from "../payload.config"

type Locale = "cs" | "hu" | "ro" | "sk"
type Slot =
  | "about"
  | "affiliate"
  | "blog"
  | "brands"
  | "claims_returns"
  | "cookies"
  | "dropshipping"
  | "faq"
  | "private_label"
  | "privacy"
  | "reviews"
  | "shipping_payment"
  | "terms"
  | "wholesale"

type AppRouteLink = Readonly<{
  blockType: "appRouteLink"
  path: string
  slot: Slot
}>
type ExternalLink = Readonly<{
  blockType: "externalLink"
  newTab: boolean
  slot: Slot
  url: string
}>
type FooterItem = AppRouteLink | ExternalLink
type FooterColumn = Readonly<{
  items: readonly FooterItem[]
  slot: "important" | "information" | "partners"
}>

const app = (slot: Slot, path: string): AppRouteLink => ({
  blockType: "appRouteLink",
  path,
  slot,
})
const external = (slot: Slot, url: string): ExternalLink => ({
  blockType: "externalLink",
  newTab: true,
  slot,
  url,
})

const FOOTERS = {
  cs: [
    {
      slot: "information",
      items: [
        app("blog", "/blog"),
        external("reviews", "https://obchody.heureka.cz/herbatica-cz/recenze/"),
      ],
    },
    {
      slot: "important",
      items: [
        app("shipping_payment", "/doprava"),
        app("claims_returns", "/vraceni-zbozi"),
        app("terms", "/obchodni-podminky"),
        app("privacy", "/ochrana-osobnich-udaju"),
        app("cookies", "/cookies"),
      ],
    },
    {
      slot: "partners",
      items: [
        external(
          "affiliate",
          "https://www.dognet.cz/kampane/kampan-herbatica-sk/"
        ),
        app("wholesale", "/velkoobchod"),
        app("dropshipping", "/dropshipping"),
        app("private_label", "/private-label"),
      ],
    },
  ],
  hu: [
    {
      slot: "information",
      items: [
        app("blog", "/blog"),
        external(
          "reviews",
          "https://www.arukereso.hu/stores/herbatica-hu-s161826/#velemenyek-or10of0fr-1fm-1/"
        ),
      ],
    },
    {
      slot: "important",
      items: [
        app("shipping_payment", "/szallitas"),
        app("terms", "/altalanos-szerzodesi-feltetelek"),
        app("privacy", "/adatvedelmi-tajekoztato"),
      ],
    },
  ],
  ro: [
    {
      slot: "information",
      items: [app("blog", "/blog")],
    },
    {
      slot: "important",
      items: [
        app("shipping_payment", "/livrare"),
        app("terms", "/termeni-si-conditii"),
        app("privacy", "/politica-de-confidentialitate"),
      ],
    },
  ],
  sk: [
    {
      slot: "information",
      items: [
        app("blog", "/blog"),
        app("brands", "/znacky"),
        external("reviews", "https://obchody.heureka.sk/herbatica-sk/recenze/"),
      ],
    },
    {
      slot: "important",
      items: [
        app("shipping_payment", "/doprava"),
        app("claims_returns", "/vratenie-tovaru"),
        app("terms", "/obchodne-podmienky"),
        app("privacy", "/ochrana-osobnych-udajov"),
        app("cookies", "/cookies"),
      ],
    },
    {
      slot: "partners",
      items: [
        external(
          "affiliate",
          "https://www.dognet.sk/kampane/kampan-herbatica-sk/"
        ),
        app("wholesale", "/velkoobchod"),
        app("dropshipping", "/dropshipping"),
        app("private_label", "/private-label"),
      ],
    },
  ],
} as const satisfies Record<Locale, readonly FooterColumn[]>

const SOURCE_EVIDENCE = {
  cs: {
    rawSha256:
      "df0f0e07f2209e3d8dbde84c8853a9e3f3977d73a8f028807a6f7fd51d278f61",
    sourceUrl: "https://www.herbatica.cz/o-nas/",
  },
  hu: {
    rawSha256:
      "768d138cb8888c3dea27c7138d2659778e05c06652cc077c35565f4db2c07a92",
    sourceUrl: "https://www.herbatica.hu/csapatunkrol/",
  },
  ro: {
    rawSha256:
      "fc36aedd36864c3230350aeda26f52dce0489379b3bc88bf80547c860e6d4d59",
    sourceUrl: "https://www.herbatica.ro/despre-noi/",
  },
  sk: {
    rawSha256:
      "53aa980963cd2ba2cbf3e71c5979ca7e2ef78437cd81579bb70a2b975fd5f33f",
    sourceUrl: "https://www.herbatica.sk/o-nas/",
  },
} as const satisfies Record<
  Locale,
  Readonly<{ rawSha256: string; sourceUrl: string }>
>

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }
  if (!value || typeof value !== "object") {
    return value
  }
  const record = value as Readonly<Record<string, unknown>>
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, canonicalize(record[key])])
  )
}

const hash = (value: unknown) =>
  `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")}`

const normalizeColumns = (value: unknown): FooterColumn[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map((columnValue) => {
    const column = columnValue as Readonly<Record<string, unknown>>
    const items = Array.isArray(column.items) ? column.items : []
    return {
      slot: column.slot as FooterColumn["slot"],
      items: items.map((itemValue) => {
        const item = itemValue as Readonly<Record<string, unknown>>
        if (item.blockType === "externalLink") {
          return external(item.slot as Slot, String(item.url))
        }
        return app(item.slot as Slot, String(item.path))
      }),
    }
  })
}

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const hashIndex = args.indexOf("--confirm-plan-hash")
const confirmedHash = hashIndex === -1 ? undefined : args[hashIndex + 1]
if (hashIndex !== -1 && !confirmedHash) {
  throw new Error("--confirm-plan-hash requires a value")
}

const plan = {
  footers: FOOTERS,
  sourceEvidence: SOURCE_EVIDENCE,
}
const planHash = hash(plan)
const payload = await getPayload({ config })

try {
  const current = {} as Record<Locale, FooterColumn[]>
  for (const locale of Object.keys(FOOTERS) as Locale[]) {
    const footer = await payload.findGlobal({
      slug: "footer-navigation",
      locale,
      fallbackLocale: false,
      depth: 0,
      overrideAccess: true,
    })
    current[locale] = normalizeColumns(footer.columns)
  }

  const changedLocales = (Object.keys(FOOTERS) as Locale[]).filter(
    (locale) => hash(current[locale]) !== hash(FOOTERS[locale])
  )
  process.stdout.write(
    `${JSON.stringify(
      {
        applied: false,
        changedLocales,
        counts: Object.fromEntries(
          (Object.keys(FOOTERS) as Locale[]).map((locale) => [
            locale,
            FOOTERS[locale].reduce(
              (count, column) => count + column.items.length,
              0
            ),
          ])
        ),
        planHash,
      },
      null,
      2
    )}\n`
  )

  if (apply) {
    if (confirmedHash !== planHash) {
      throw new Error(
        "--confirm-plan-hash must equal the exact hash emitted by dry-run"
      )
    }
    for (const locale of changedLocales) {
      await payload.updateGlobal({
        slug: "footer-navigation",
        locale,
        overrideAccess: true,
        data: { columns: FOOTERS[locale] as never },
      })
    }

    for (const locale of Object.keys(FOOTERS) as Locale[]) {
      const footer = await payload.findGlobal({
        slug: "footer-navigation",
        locale,
        fallbackLocale: false,
        depth: 0,
        overrideAccess: true,
      })
      if (hash(normalizeColumns(footer.columns)) !== hash(FOOTERS[locale])) {
        throw new Error(`Footer verification failed for ${locale}`)
      }
    }
    process.stdout.write(
      `${JSON.stringify({ applied: true, planHash, updated: changedLocales })}\n`
    )
  }
} finally {
  await payload.destroy()
}
