import { createHash } from "node:crypto"
import type { ExecArgs } from "@medusajs/framework/types"
import { STOREFRONT_TEXT_MODULE } from "../modules/storefront-text"
import type StorefrontTextModuleService from "../modules/storefront-text/service"

const OVERRIDES = {
  cz: {
    "navigation.footer.columns.important.shipping_payment": "Doprava a platby",
    "navigation.footer.columns.partners.affiliate": "Affiliate program",
  },
  hu: {
    "navigation.footer.columns.important.privacy":
      "Az Ön személyes adatai nálunk biztonságban vannak",
    "navigation.footer.columns.important.terms": "Üzleti feltételek",
    "navigation.footer.columns.information.about": "Minden a csapatunkról",
    "navigation.footer.columns.information.reviews": "A mi vevőink elégedettek",
  },
  ro: {
    "navigation.footer.columns.important.privacy":
      "Protejăm datele dvs. cu caracter personal",
    "navigation.footer.columns.important.shipping_payment":
      "Transportul și plata",
    "navigation.footer.columns.information.about":
      "Totul despre echipa noastră",
    "navigation.footer.columns.information.blog": "Vizitați blogul nostru",
  },
  sk: {
    "navigation.footer.columns.important.shipping_payment": "Doprava a platby",
  },
} as const

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

export default async function publishHerbatikaFooterTextOverrides({
  container,
  args,
}: ExecArgs) {
  const apply = args.includes("apply") || args.includes("--apply")
  const hashIndex = Math.max(
    args.indexOf("confirm-plan-hash"),
    args.indexOf("--confirm-plan-hash")
  )
  const confirmedHash = hashIndex === -1 ? undefined : args[hashIndex + 1]
  if (hashIndex !== -1 && !confirmedHash) {
    throw new Error("--confirm-plan-hash requires a value")
  }

  const service = container.resolve<StorefrontTextModuleService>(
    STOREFRONT_TEXT_MODULE
  )
  const records = await service.listStorefrontTexts(
    { market: Object.keys(OVERRIDES) },
    { take: 10_000 }
  )
  const byIdentity = new Map(
    records.map((record) => [`${record.market}:${record.key}`, record])
  )
  const updates = Object.entries(OVERRIDES).flatMap(([market, messages]) =>
    Object.entries(messages).map(([key, value]) => {
      const record = byIdentity.get(`${market}:${key}`)
      if (!record) {
        throw new Error(`Missing storefront text ${market}/${key}`)
      }
      return {
        id: record.id,
        key,
        market,
        previousOverride: record.override_value,
        value,
      }
    })
  )
  const planHash = hash({ overrides: OVERRIDES })
  const changed = updates.filter(
    ({ previousOverride, value }) => previousOverride !== value
  )
  process.stdout.write(
    `${JSON.stringify(
      {
        applied: false,
        changed: changed.map(({ key, market }) => `${market}:${key}`),
        planHash,
      },
      null,
      2
    )}\n`
  )

  if (!apply) {
    return
  }
  if (confirmedHash !== planHash) {
    throw new Error(
      "--confirm-plan-hash must equal the exact hash emitted by dry-run"
    )
  }
  if (changed.length) {
    await service.updateStorefrontTexts(
      changed.map(({ id, value }) => ({ id, override_value: value }))
    )
  }

  const verified = await service.listStorefrontTexts(
    { id: updates.map(({ id }) => id) },
    { take: updates.length }
  )
  const verifiedById = new Map(verified.map((record) => [record.id, record]))
  for (const update of updates) {
    if (verifiedById.get(update.id)?.override_value !== update.value) {
      throw new Error(
        `Storefront text verification failed for ${update.market}/${update.key}`
      )
    }
  }
  process.stdout.write(
    `${JSON.stringify({ applied: true, planHash, updated: changed.length })}\n`
  )
}
