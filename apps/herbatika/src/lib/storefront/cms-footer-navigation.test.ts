import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("./cms-client", () => ({
  fetchCmsJsonOrThrow: vi.fn(),
}))

describe("CMS footer navigation fallback", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it.each([
    ["sk-SK", ["/poradna", "/o-nas", "/casto-kladene-otazky", "/znacky"]],
    ["cs-CZ", ["/poradna", "/o-nas", "/caste-dotazy", "/znacky"]],
    ["hu-HU", ["/tanacsok", "/rolunk", "/gyakori-kerdesek", "/markak"]],
    ["ro-RO", ["/sfaturi", "/despre-noi", "/intrebari-frecvente", "/marci"]],
  ] as const)("uses route-derived %s navigation when Payload is empty", async (locale, expectedHrefs) => {
    const { fetchCmsJsonOrThrow } = await import("./cms-client")
    vi.mocked(fetchCmsJsonOrThrow).mockResolvedValue({
      footerNavigation: { columns: [] },
    })
    const { fetchCmsFooterNavigation } = await import("./cms-footer-navigation")

    const navigation = await fetchCmsFooterNavigation(locale)

    expect(navigation.columns.map((column) => column.slot)).toEqual([
      "information",
    ])
    expect(
      navigation.columns.flatMap((column) =>
        column.items.map((item) => item.href)
      )
    ).toEqual(expectedHrefs)
    expect(
      navigation.columns.flatMap((column) =>
        column.items.map((item) => item.slot)
      )
    ).toEqual(["blog", "about", "faq", "brands"])
  })

  it("preserves an approved non-empty Payload navigation", async () => {
    const approved = {
      columns: [
        {
          items: [{ href: "/despre-noi", slot: "about", type: "internal" }],
          slot: "information",
        },
      ],
    } as const
    const { fetchCmsJsonOrThrow } = await import("./cms-client")
    vi.mocked(fetchCmsJsonOrThrow).mockResolvedValue({
      footerNavigation: approved,
    })
    const { fetchCmsFooterNavigation } = await import("./cms-footer-navigation")

    await expect(fetchCmsFooterNavigation("ro-RO")).resolves.toEqual(approved)
  })

  it("uses the route-derived fallback when Payload fails", async () => {
    const { fetchCmsJsonOrThrow } = await import("./cms-client")
    vi.mocked(fetchCmsJsonOrThrow).mockRejectedValue(new Error("offline"))
    const { fetchCmsFooterNavigation } = await import("./cms-footer-navigation")

    await expect(fetchCmsFooterNavigation("sk-SK")).resolves.toMatchObject({
      columns: [{ slot: "information" }],
    })
  })
})
