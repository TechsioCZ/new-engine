import { readFileSync } from "node:fs"
import type { CollectionBeforeValidateHook } from "payload"
import { describe, expect, it } from "vitest"
import {
  HeroCarousels,
  normalizeHeroButtonTarget,
} from "@/collections/hero-carousels"

const beforeValidate = HeroCarousels.hooks
  ?.beforeValidate?.[0] as CollectionBeforeValidateHook

type BeforeValidateArgs = Parameters<CollectionBeforeValidateHook>[0]
type TestBeforeValidateArgs = Omit<Partial<BeforeValidateArgs>, "req"> & {
  req?: { locale?: string }
}

const runBeforeValidate = async (args: TestBeforeValidateArgs) =>
  beforeValidate(args as unknown as BeforeValidateArgs)

const stableTargetMigration = readFileSync(
  new URL("../../src/migrations/20260819_012135.ts", import.meta.url),
  "utf8"
)

describe("hero carousel internal title", () => {
  it("derives an internal title when creating a document without one", async () => {
    const data = { heading: "  Seasonal offer  " }

    const result = await runBeforeValidate({
      data,
      operation: "create",
      req: { locale: "en" },
    })

    expect(result).toEqual({
      heading: "  Seasonal offer  ",
      internalTitle: "Seasonal offer",
    })
  })

  it("preserves an internal title omitted from a partial update", async () => {
    const data = { buttonHref: "/updated-destination" }

    const result = await runBeforeValidate({
      data,
      operation: "update",
      originalDoc: {
        id: 1,
        internalTitle: "Editorial title",
      },
      req: { locale: "en" },
    })

    expect(result).toBe(data)
    expect(result).not.toHaveProperty("internalTitle")
  })

  it("re-derives an explicitly cleared internal title", async () => {
    const result = await runBeforeValidate({
      data: {
        heading: "Updated campaign",
        internalTitle: " ",
      },
      operation: "update",
      originalDoc: {
        id: 1,
        heading: "Previous campaign",
        internalTitle: "Editorial title",
      },
      req: { locale: "en" },
    })

    expect(result?.internalTitle).toBe("Updated campaign")
  })
})

describe("hero carousel stable button target", () => {
  it("backfills every localized root-static legacy URL", () => {
    expect(stableTargetMigration).toContain('UPDATE "payload"."hero_carousels"')
    expect(stableTargetMigration).toContain(
      "\"button_target_target_type\" = 'static'"
    )

    for (const path of [
      "/o-nas",
      "/rolunk",
      "/despre-noi",
      "/kontakt",
      "/kapcsolat",
      "/contact",
      "/casto-kladene-otazky",
      "/caste-dotazy",
      "/gyakori-kerdesek",
      "/intrebari-frecvente",
      "/doprava",
      "/szallitas",
      "/livrare",
      "/vratenie-tovaru",
      "/vraceni-zbozi",
      "/visszakuldes",
      "/retururi",
      "/obchodne-podmienky",
      "/obchodni-podminky",
      "/altalanos-szerzodesi-feltetelek",
      "/termeni-si-conditii",
      "/ochrana-osobnych-udajov",
      "/ochrana-osobnich-udaju",
      "/adatvedelmi-tajekoztato",
      "/politica-de-confidentialitate",
      "/cookies",
      "/cookie-tajekoztato",
      "/politica-cookies",
    ]) {
      expect(stableTargetMigration).toContain(`WHEN '${path}'`)
    }
  })

  it("normalizes a supported entity identity without a public URL", () => {
    expect(
      normalizeHeroButtonTarget({
        targetType: "entity",
        sourceSystem: "medusa",
        sourceType: "category",
        sourceId: "  pcat_123  ",
      })
    ).toEqual({
      targetType: "entity",
      sourceSystem: "medusa",
      sourceType: "category",
      sourceId: "pcat_123",
      staticRouteKey: null,
    })
  })

  it("normalizes a supported static route identity", () => {
    expect(
      normalizeHeroButtonTarget({
        targetType: "static",
        staticRouteKey: "root:privacy",
      })
    ).toEqual({
      targetType: "static",
      sourceSystem: null,
      sourceType: null,
      sourceId: null,
      staticRouteKey: "root:privacy",
    })
  })

  it("merges and validates a stable target during a partial update", async () => {
    const result = await runBeforeValidate({
      data: {
        buttonTarget: { sourceId: "prod_2" },
      },
      operation: "update",
      originalDoc: {
        id: 1,
        internalTitle: "Editorial title",
        buttonTarget: {
          targetType: "entity",
          sourceSystem: "medusa",
          sourceType: "product",
          sourceId: "prod_1",
          staticRouteKey: null,
        },
      },
      req: { locale: "en" },
    })

    expect(result?.buttonTarget).toEqual({
      targetType: "entity",
      sourceSystem: "medusa",
      sourceType: "product",
      sourceId: "prod_2",
      staticRouteKey: null,
    })
  })

  it("rejects mismatched source ownership and free-form static keys", () => {
    expect(() =>
      normalizeHeroButtonTarget({
        targetType: "entity",
        sourceSystem: "payload",
        sourceType: "product",
        sourceId: "prod_123",
      })
    ).toThrow("source system does not own the entity type")

    expect(() =>
      normalizeHeroButtonTarget({
        targetType: "static",
        staticRouteKey: "/arbitrary-path",
      })
    ).toThrow("unsupported static route key")
  })

  it("keeps legacy buttonHref read-only and outside the link contract", () => {
    const legacyField = HeroCarousels.fields.find(
      (field) => "name" in field && field.name === "buttonHref"
    )

    expect(legacyField).toMatchObject({
      admin: { readOnly: true },
      access: {
        create: expect.any(Function),
        update: expect.any(Function),
      },
    })
  })
})
