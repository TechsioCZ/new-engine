import { queryKeysFactory } from "../query-key-factory"

describe("queryKeysFactory", () => {
  it("builds stable keys for list and detail queries", () => {
    const keys = queryKeysFactory<"companies", { q?: string }, string>("companies")

    expect(keys.all).toEqual(["companies"])
    expect(keys.lists()).toEqual(["companies", "list"])
    expect(keys.list({ q: "acme" })).toEqual([
      "companies",
      "list",
      { query: { q: "acme" } },
    ])
    expect(keys.list()).toEqual(["companies", "list", { query: undefined }])

    expect(keys.details()).toEqual(["companies", "detail"])
    expect(keys.detail("cmp_1", { q: "acme" })).toEqual([
      "companies",
      "detail",
      "cmp_1",
      { query: { q: "acme" } },
    ])
    expect(keys.detail("cmp_1")).toEqual([
      "companies",
      "detail",
      "cmp_1",
      { query: undefined },
    ])
  })
})
