import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const testContext = vi.hoisted(() => ({
  market: { code: "sk" },
}))

vi.mock("@techsio/ui-kit/molecules/accordion", () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  )

  return {
    Accordion: Object.assign(Passthrough, {
      Content: Passthrough,
      Header: Passthrough,
      Indicator: () => null,
      Item: Passthrough,
      Title: Passthrough,
    }),
  }
})
vi.mock("@techsio/ui-kit/molecules/tabs", () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  )

  return {
    Tabs: Object.assign(Passthrough, {
      Content: Passthrough,
      Indicator: () => null,
      List: Passthrough,
      Trigger: Passthrough,
    }),
  }
})
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock("@/components/product-detail/product-detail-html-content", () => ({
  ProductDetailHtmlContent: () => null,
}))
vi.mock("@/components/product-detail/sections/product-detail-reviews", () => ({
  ProductDetailReviews: () => null,
}))
vi.mock("@/lib/storefront/market-context-provider", () => ({
  useMarketContext: () => testContext.market,
}))

import { ProductDetailTabs } from "./product-detail-tabs"

const renderTabs = () =>
  renderToStaticMarkup(
    <ProductDetailTabs
      defaultSectionValue="description"
      onSectionValueChange={vi.fn()}
      productId="prod_1"
      sections={[{ html: "", key: "description", title: "Description" }]}
    />
  )

describe("ProductDetailTabs section structure", () => {
  it.each([
    "sk",
    "cz",
    "hu",
    "ro",
  ])("renders the reviews tab for %s", (market) => {
    testContext.market = { code: market }

    expect(renderTabs()).toContain("reviews.tab_label")
  })

  it("drops the reviews tab when the product id is unknown", () => {
    testContext.market = { code: "sk" }

    expect(
      renderToStaticMarkup(
        <ProductDetailTabs
          defaultSectionValue="description"
          onSectionValueChange={vi.fn()}
          sections={[{ html: "", key: "description", title: "Description" }]}
        />
      )
    ).not.toContain("reviews.tab_label")
  })
})
