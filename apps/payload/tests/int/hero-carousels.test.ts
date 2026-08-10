import { getRecordValue, isRecord } from "@techsio/std/object"
import { describe, expect, it } from "vitest"

import { HeroCarousels } from "@/collections/hero-carousels"

const beforeValidate: unknown = HeroCarousels.hooks?.beforeValidate?.at(0)

const runBeforeValidate = async (args: unknown): Promise<unknown> => {
  if (typeof beforeValidate !== "function") {
    throw new TypeError("Hero carousel beforeValidate hook is unavailable")
  }

  return await Reflect.apply(beforeValidate, undefined, [args])
}

describe("hero carousel internal title", () => {
  it("derives an internal title when creating a document without one", async () => {
    const data = { heading: "  Seasonal offer  " }

    const result = await runBeforeValidate({
      data,
      operation: "create",
      req: { locale: "en" },
    })

    expect(result).toStrictEqual({
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
        heading: "Previous campaign",
        id: 1,
        internalTitle: "Editorial title",
      },
      req: { locale: "en" },
    })

    if (!isRecord(result)) {
      throw new TypeError("Hero carousel hook returned an invalid document")
    }
    expect(getRecordValue(result, "internalTitle")).toBe("Updated campaign")
  })
})
