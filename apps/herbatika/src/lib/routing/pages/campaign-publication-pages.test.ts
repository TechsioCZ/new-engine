import type { GetServerSidePropsContext } from "next"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  readDetail: vi.fn(),
  readIndex: vi.fn(),
  resolveEntityPublicPage: vi.fn(),
  resolveStaticPublicPage: vi.fn(),
}))

vi.mock("@/components/cms/cms-page-surface", () => ({
  CmsPageSurface: vi.fn(),
}))
vi.mock("@/components/entity-index-page", () => ({
  EntityIndexPage: vi.fn(),
}))
vi.mock("@/lib/routing/public-page", () => ({
  foundSource: (value: unknown) => ({ kind: "found", value }),
  resolveEntityPublicPage: mocks.resolveEntityPublicPage,
  resolveStaticPublicPage: mocks.resolveStaticPublicPage,
}))
vi.mock("@/lib/storefront/campaign-publication-source.server", () => ({
  readCampaignPublicationDetailFromRuntime: mocks.readDetail,
  readCampaignPublicationIndexFromRuntime: mocks.readIndex,
}))

const context = (
  market: "sk" | "cz" | "hu" | "ro",
  slug?: string
): GetServerSidePropsContext =>
  ({
    params: { market, ...(slug ? { slug } : {}) },
    query: {},
    req: { headers: {}, url: "/" },
    res: { setHeader: vi.fn() },
  }) as unknown as GetServerSidePropsContext

describe("campaign publication pages", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveStaticPublicPage.mockImplementation(
      async (
        _context: unknown,
        input: { loadSource: (market: "ro") => Promise<unknown> }
      ) => ({ props: { page: await input.loadSource("ro") } })
    )
    mocks.resolveEntityPublicPage.mockImplementation(
      async (
        _context: unknown,
        input: {
          loadSource: (value: {
            market: "sk"
            sourceId: string
          }) => Promise<unknown>
        }
      ) => ({
        props: {
          page: await input.loadSource({
            market: "sk",
            sourceId: "campaign_summer",
          }),
        },
      })
    )
  })

  it("builds the Romanian index only from verified source entries and URLR slugs", async () => {
    mocks.readIndex.mockResolvedValue({
      kind: "found",
      value: [
        {
          id: "campaign_summer",
          publicSlug: "vara",
          title: "Promoție de vară",
        },
      ],
    })
    const { getServerSideProps } = await import(
      "@/pages/~sf/[market]/campaigns"
    )
    const result = await getServerSideProps(context("ro"))

    expect(result).toMatchObject({
      props: {
        page: {
          kind: "found",
          value: {
            items: [
              {
                href: "/promotii/vara",
                id: "campaign_summer",
                label: "Promoție de vară",
              },
            ],
            title: "Promoții",
          },
        },
      },
    })
    expect(mocks.resolveStaticPublicPage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        expectedRouteKey: "campaign.index",
        path: { kind: "campaign" },
        queryKind: "campaign-index",
      })
    )
  })

  it("binds detail rendering and indexability to the verified campaign source", async () => {
    mocks.readDetail.mockResolvedValue({
      kind: "found",
      value: {
        content: "<p>Verified</p>",
        id: "campaign_summer",
        indexable: false,
        publicSlug: "letna-akcia",
        title: "Letná akcia",
      },
    })
    const { getServerSideProps } = await import(
      "@/pages/~sf/[market]/campaign/[slug]"
    )
    await getServerSideProps(context("sk", "letna-akcia"))

    expect(mocks.resolveEntityPublicPage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        expectedRouteKey: "campaign.detail",
        kind: "campaign",
        queryKind: "campaign-detail",
      })
    )
    const options = mocks.resolveEntityPublicPage.mock.calls.at(-1)?.[1]
    expect(options.isIndexable({ indexable: false })).toBe(false)
    expect(mocks.readDetail).toHaveBeenCalledWith({
      market: "sk",
      sourceId: "campaign_summer",
    })
  })

  it("does not substitute content when the reviewed campaign source is absent", async () => {
    mocks.readIndex.mockResolvedValue({ kind: "missing" })
    const { getServerSideProps } = await import(
      "@/pages/~sf/[market]/campaigns"
    )
    await expect(getServerSideProps(context("ro"))).resolves.toEqual({
      props: { page: { kind: "missing" } },
    })
  })
})
