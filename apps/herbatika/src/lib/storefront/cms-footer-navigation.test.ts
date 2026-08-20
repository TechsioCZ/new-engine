import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("./cms-client", () => ({
  fetchCmsJsonOrThrow: vi.fn(),
}))

describe("CMS footer navigation fallback", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it("uses the complete RO demo navigation when Payload is empty", async () => {
    const { fetchCmsJsonOrThrow } = await import("./cms-client")
    vi.mocked(fetchCmsJsonOrThrow).mockResolvedValue({
      footerNavigation: { columns: [] },
    })
    const { fetchCmsFooterNavigation } = await import("./cms-footer-navigation")

    const navigation = await fetchCmsFooterNavigation("ro-RO")

    expect(navigation.columns).toHaveLength(3)
    expect(navigation.columns.flatMap((column) => column.items)).toHaveLength(
      12
    )
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

  it("keeps SK empty when Payload is empty", async () => {
    const { fetchCmsJsonOrThrow } = await import("./cms-client")
    vi.mocked(fetchCmsJsonOrThrow).mockResolvedValue({
      footerNavigation: { columns: [] },
    })
    const { fetchCmsFooterNavigation } = await import("./cms-footer-navigation")

    await expect(fetchCmsFooterNavigation("sk-SK")).resolves.toEqual({
      columns: [],
    })
  })
})
