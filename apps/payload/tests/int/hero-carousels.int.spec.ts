import type {
  CollectionBeforeOperationHook,
  CollectionBeforeValidateHook,
} from "payload"
import { describe, expect, it } from "vitest"
import {
  HeroCarousels,
  normalizeHeroButtonTarget,
} from "@/collections/hero-carousels"

const beforeValidate = HeroCarousels.hooks
  ?.beforeValidate?.[0] as CollectionBeforeValidateHook
const beforeOperation = HeroCarousels.hooks
  ?.beforeOperation?.[0] as CollectionBeforeOperationHook

type BeforeValidateArgs = Parameters<CollectionBeforeValidateHook>[0]
type TestBeforeValidateArgs = Omit<Partial<BeforeValidateArgs>, "req"> & {
  req?: { locale?: string }
}

const runBeforeValidate = async (args: TestBeforeValidateArgs) =>
  beforeValidate(args as unknown as BeforeValidateArgs)

type BeforeOperationArgs = Parameters<CollectionBeforeOperationHook>[0]
type TestBeforeOperationArgs = {
  args: { data: Record<string, unknown> }
  operation: BeforeOperationArgs["operation"]
}

const runBeforeOperation = async (args: TestBeforeOperationArgs) =>
  beforeOperation(args as unknown as BeforeOperationArgs)

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

  it("discards stale entity identity when switching to a static target", async () => {
    const result = await runBeforeValidate({
      data: {
        buttonTarget: {
          targetType: "static",
          sourceSystem: "medusa",
          sourceType: "product",
          sourceId: "prod_1",
          staticRouteKey: "root:privacy",
        },
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
      targetType: "static",
      sourceSystem: null,
      sourceType: null,
      sourceId: null,
      staticRouteKey: "root:privacy",
    })
  })

  it("discards a stale static key when switching to an entity target", async () => {
    const result = await runBeforeValidate({
      data: {
        buttonTarget: {
          targetType: "entity",
          sourceSystem: "payload",
          sourceType: "article",
          sourceId: "article_2",
          staticRouteKey: "root:privacy",
        },
      },
      operation: "update",
      originalDoc: {
        id: 1,
        internalTitle: "Editorial title",
        buttonTarget: {
          targetType: "static",
          sourceSystem: null,
          sourceType: null,
          sourceId: null,
          staticRouteKey: "root:privacy",
        },
      },
      req: { locale: "en" },
    })

    expect(result?.buttonTarget).toEqual({
      targetType: "entity",
      sourceSystem: "payload",
      sourceType: "article",
      sourceId: "article_2",
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

describe("hero carousel create without a call-to-action", () => {
  // Regression coverage: Payload's own group-field default-value logic
  // (fields/hooks/beforeValidate and beforeChange) resets a missing group
  // to `{}` only when the incoming value is `undefined` — it checks
  // `typeof value !== "object"`, which is true for `undefined` but false
  // for `null` (typeof null === "object" in JS). A create request whose
  // buttonTarget group is explicitly `null` therefore used to reach
  // Payload's core field traversal with a null sibling value and crash
  // reading `null.targetType` on the first child field, before our own
  // beforeValidate hook ever ran.

  it("beforeOperation replaces an explicit null buttonTarget with an empty object on create", async () => {
    const args = { data: { internalTitle: "x", buttonTarget: null } }

    const result = await runBeforeOperation({
      args,
      operation: "create",
    })

    expect(
      (result as unknown as { data: Record<string, unknown> }).data
    ).toMatchObject({ buttonTarget: {} })
  })

  it("beforeOperation leaves an absent buttonTarget untouched on create", async () => {
    const args = { data: { internalTitle: "x" } }

    const result = await runBeforeOperation({
      args,
      operation: "create",
    })

    expect(
      (result as unknown as { data: Record<string, unknown> }).data
    ).not.toHaveProperty("buttonTarget")
  })

  it("beforeOperation ignores read operations", async () => {
    const args = { data: { internalTitle: "x", buttonTarget: null } }

    const result = await runBeforeOperation({
      args,
      operation: "read",
    })

    expect(
      (result as unknown as { data: { buttonTarget: unknown } }).data
        .buttonTarget
    ).toBeNull()
  })

  it("creates cleanly when buttonTarget is undefined", async () => {
    const result = await runBeforeValidate({
      data: { internalTitle: "x" },
      operation: "create",
      req: { locale: "en" },
    })

    expect(result).not.toHaveProperty("buttonTarget")
  })

  it("creates cleanly when buttonTarget is null", async () => {
    // Simulates the full request pipeline: beforeOperation sanitizes the
    // explicit null before Payload's core field traversal, then
    // beforeValidate runs against the sanitized data.
    const args = { data: { internalTitle: "x", buttonTarget: null } }
    const sanitized = (await runBeforeOperation({
      args,
      operation: "create",
    })) as unknown as { data: Record<string, unknown> }

    const result = await runBeforeValidate({
      data: sanitized.data,
      operation: "create",
      req: { locale: "en" },
    })

    expect(result?.buttonTarget).toEqual({})
  })

  it("creates cleanly with a valid static buttonTarget", async () => {
    const args = {
      data: {
        internalTitle: "x",
        buttonTarget: { targetType: "static", staticRouteKey: "root:about" },
      },
    }
    const sanitized = (await runBeforeOperation({
      args,
      operation: "create",
    })) as unknown as { data: Record<string, unknown> }

    const result = await runBeforeValidate({
      data: sanitized.data,
      operation: "create",
      req: { locale: "en" },
    })

    expect(result?.buttonTarget).toEqual({
      targetType: "static",
      sourceSystem: null,
      sourceType: null,
      sourceId: null,
      staticRouteKey: "root:about",
    })
  })
})
