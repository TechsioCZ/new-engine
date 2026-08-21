import type { GetServerSidePropsContext } from "next"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchServerCategories: vi.fn(),
  fetchStorefrontBrands: vi.fn(),
  prefetchBrandPageStorefrontData: vi.fn(),
  prefetchCategoryPageStorefrontData: vi.fn(),
  readCatalogPublicationProofFromMedusa: vi.fn(),
  resolveEntityPublicPage: vi.fn(),
}))

vi.mock("@/components/category-listing", () => ({
  CategoryListing: vi.fn(() => null),
}))
vi.mock("@/components/brands/brand-listing", () => ({
  BrandListing: vi.fn(() => null),
}))
vi.mock("@/lib/routing/pages/localized-page-error", () => ({
  LocalizedPageError: vi.fn(() => null),
}))
vi.mock("@/lib/routing/public-page", () => ({
  resolveEntityPublicPage: mocks.resolveEntityPublicPage,
}))
vi.mock("@/lib/storefront/catalog-publication-proof.server", () => ({
  readCatalogPublicationProofFromMedusa:
    mocks.readCatalogPublicationProofFromMedusa,
}))
vi.mock("@/lib/storefront/plp-query-state", () => ({
  parsePlpQueryStateFromSearchParams: vi.fn(() => ({ page: 1 })),
}))
vi.mock("@/lib/storefront/ssr", () => ({
  prefetchBrandPageStorefrontData: mocks.prefetchBrandPageStorefrontData,
  prefetchCategoryPageStorefrontData: mocks.prefetchCategoryPageStorefrontData,
}))
vi.mock("@/lib/storefront/ssr/context", () => ({
  getRegionServerContext: vi.fn().mockResolvedValue({
    locale: "cs-CZ",
    queryClient: {},
  }),
}))
vi.mock("@/lib/storefront/ssr/public-entity-projections", () => ({
  readCompletePublicEntitySlugs: vi.fn(),
  readRequiredPublicEntitySlugs: vi.fn(),
}))
vi.mock("@/lib/storefront/storefront-server", () => ({
  fetchServerCategories: mocks.fetchServerCategories,
}))
vi.mock("@/lib/storefront/brands.server", () => ({
  fetchStorefrontBrands: mocks.fetchStorefrontBrands,
}))

import { getServerSideProps as getBrandServerSideProps } from "@/pages/~sf/[market]/brand/[slug]"
import { getServerSideProps as getCategoryServerSideProps } from "@/pages/~sf/[market]/category/[slug]"

const context = {
  params: { market: "cz", slug: "vitaminy" },
  query: {},
  req: { headers: {}, url: "/~sf/cz/category/vitaminy" },
  res: {},
} as unknown as GetServerSidePropsContext

describe("category and brand detail publication proof", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveEntityPublicPage.mockImplementation(async (_context, input) =>
      input.loadSource({
        market: "cz",
        publicSlug: "vitaminy",
        sourceId: input.kind === "category" ? "category_1" : "brand_1",
        sourceVersion: "7",
      })
    )
    mocks.readCatalogPublicationProofFromMedusa.mockResolvedValue({
      causeCode: "CATALOG_PUBLICATION_PROOF_MISMATCH",
      kind: "invalid-response",
    })
  })

  it("rejects a category before its catalog payload when assignment or Translation proof drifts", async () => {
    await getCategoryServerSideProps(context)

    expect(mocks.readCatalogPublicationProofFromMedusa).toHaveBeenCalledWith({
      entityId: "category_1",
      entityKind: "category",
      market: "cz",
      publicSlug: "vitaminy",
      sourceVersion: "7",
    })
    expect(mocks.fetchServerCategories).not.toHaveBeenCalled()
  })

  it("rejects a brand before its catalog payload when assignment or Translation proof drifts", async () => {
    await getBrandServerSideProps(context)

    expect(mocks.readCatalogPublicationProofFromMedusa).toHaveBeenCalledWith({
      entityId: "brand_1",
      entityKind: "brand",
      market: "cz",
      publicSlug: "vitaminy",
      sourceVersion: "7",
    })
    expect(mocks.fetchStorefrontBrands).not.toHaveBeenCalled()
  })
})
