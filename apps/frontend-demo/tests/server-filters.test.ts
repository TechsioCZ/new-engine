import { describe, expect, it } from "vitest"

import { buildMedusaQuery } from "@/utils/server-filters"

describe("server product filters", () => {
  it("preserves country and order in the typed Medusa query", () => {
    expect(
      buildMedusaQuery(undefined, {
        country_code: "cz",
        order: "-title",
      }),
    ).toStrictEqual({
      country_code: "cz",
      order: "-title",
    })
  })

  it("builds an owner-compatible exact size filter", () => {
    expect(buildMedusaQuery({ sizes: ["M"] })).toStrictEqual({
      variants: { options: { value: "M" } },
    })
  })

  it("builds owner-compatible alternatives for multiple sizes", () => {
    expect(buildMedusaQuery({ sizes: ["S", "M"] })).toStrictEqual({
      variants: {
        $or: [{ options: { value: "S" } }, { options: { value: "M" } }],
      },
    })
  })
})
