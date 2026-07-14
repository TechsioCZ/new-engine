import type { CollectionBeforeValidateHook } from "payload"
import { describe, expect, it } from "vitest"
import { HeroCarousels } from "@/collections/hero-carousels"

const beforeValidate = HeroCarousels.hooks
  ?.beforeValidate?.[0] as CollectionBeforeValidateHook

type BeforeValidateArgs = Parameters<CollectionBeforeValidateHook>[0]
type TestBeforeValidateArgs = Omit<Partial<BeforeValidateArgs>, "req"> & {
  req?: { locale?: string }
}

const runBeforeValidate = async (
  args: TestBeforeValidateArgs
) =>
  beforeValidate(args as unknown as BeforeValidateArgs)

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
