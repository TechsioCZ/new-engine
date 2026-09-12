import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import { Accordion } from "../../src/molecules/accordion"
import { ColorSelect } from "../../src/molecules/color-select"
import { Dialog } from "../../src/molecules/dialog"
import { FormCheckbox } from "../../src/molecules/form-checkbox"
import { Pagination } from "../../src/molecules/pagination"
import { SearchForm } from "../../src/molecules/search-form"
import { Slider } from "../../src/molecules/slider"
import { Toaster, useToast } from "../../src/molecules/toast"
import { Footer } from "../../src/organisms/footer"
import { Header } from "../../src/organisms/header"
import { BreadcrumbTemplate } from "../../src/templates/breadcrumb"
import { ProductCardTemplate } from "../../src/templates/product-card"
import { SelectTemplate } from "../../src/templates/select"
import {
  brandFacets,
  type StorefrontProduct,
  colorFacets,
  sizeFacets,
  sortOptions,
  storefrontNav,
  storefrontProducts,
} from "./data"

const meta: Meta = {
  /*
   * Business is the brand these back-office pages are designed against: it is the
   * light-only, high-contrast blue scale. Set at meta level so every page opens in
   * it; the Brand toolbar still switches the whole set to Default or Neo.
   */
  globals: { brand: "business", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/Storefront/Category listing",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "The highest-traffic page of any large shop: facets on the left, results on the",
          "right, `Header` and `Footer` organisms framing both.",
          "",
          "**Pattern rules**",
          "- Facets live in a left rail on desktop and in a left-placement `Dialog` drawer",
          "  below `lg` — same controls, same state, no second implementation.",
          "- Active facets are echoed as removable chips above the grid; a shopper must be",
          "  able to see and undo every narrowing without reopening a panel.",
          "- Result count and sort sit together, directly above the grid they govern.",
          "- Cards are `ProductCardTemplate` — price, rating, stock and actions in one",
          "  fixed order, so scanning a grid is a single vertical sweep.",
          "- Paging uses the `Pagination` molecule with real URLs (`getPageUrl`), because",
          "  a category page must stay linkable and crawlable.",
        ].join("\n"),
      },
    },
  },
}

export default meta
type Story = StoryObj

const priceFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

function StorefrontHeader() {
  return (
    <Header size="md">
      <Header.Desktop>
        <Header.Container position="start">
          <span className="flex items-center gap-150 font-semibold">
            <Icon icon="icon-[mdi--hexagon-multiple-outline]" size="md" />
            Northwind
          </span>
          <Header.Nav>
            {storefrontNav.map((item) => (
              <Header.NavItem active={item.id === "footwear"} key={item.id}>
                {item.label}
              </Header.NavItem>
            ))}
          </Header.Nav>
        </Header.Container>
        <Header.Container position="end">
          <Header.Actions>
            <Header.ActionItem>
              <SearchForm size="sm">
                <SearchForm.Control>
                  <SearchForm.Input
                    aria-label="Search the shop"
                    placeholder="Search…"
                  />
                  <SearchForm.Button>Search</SearchForm.Button>
                </SearchForm.Control>
              </SearchForm>
            </Header.ActionItem>
            <Header.ActionItem>
              <Button
                icon="icon-[mdi--account-outline]"
                size="sm"
                theme="borderless"
                variant="secondary"
              >
                Account
              </Button>
            </Header.ActionItem>
            <Header.ActionItem>
              <Button icon="icon-[mdi--cart-outline]" size="sm" variant="primary">
                Cart · 2
              </Button>
            </Header.ActionItem>
          </Header.Actions>
        </Header.Container>
      </Header.Desktop>

      {/* Below the desktop breakpoint the nav moves behind the hamburger. */}
      <Header.Hamburger />
      <Header.Mobile position="right">
        <Header.Nav>
          {storefrontNav.map((item) => (
            <Header.NavItem active={item.id === "footwear"} key={item.id}>
              {item.label}
            </Header.NavItem>
          ))}
        </Header.Nav>
        <Header.Actions>
          <Header.ActionItem>
            <Button
              block
              icon="icon-[mdi--account-outline]"
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Account
            </Button>
          </Header.ActionItem>
          <Header.ActionItem>
            <Button block icon="icon-[mdi--cart-outline]" size="sm" variant="primary">
              Cart · 2
            </Button>
          </Header.ActionItem>
        </Header.Actions>
      </Header.Mobile>
    </Header>
  )
}

function StorefrontFooter() {
  return (
    <Footer size="md">
      <Footer.Container>
        <Footer.Section>
          <Footer.Title>Shop</Footer.Title>
          <Footer.List>
            <li>
              <Footer.Link href="#">New in</Footer.Link>
            </li>
            <li>
              <Footer.Link href="#">Footwear</Footer.Link>
            </li>
            <li>
              <Footer.Link href="#">Sale</Footer.Link>
            </li>
          </Footer.List>
        </Footer.Section>
        <Footer.Section>
          <Footer.Title>Help</Footer.Title>
          <Footer.List>
            <li>
              <Footer.Link href="#">Shipping &amp; delivery</Footer.Link>
            </li>
            <li>
              <Footer.Link href="#">Returns</Footer.Link>
            </li>
            <li>
              <Footer.Link href="#">Size guide</Footer.Link>
            </li>
          </Footer.List>
        </Footer.Section>
        <Footer.Section>
          <Footer.Title>Company</Footer.Title>
          <Footer.List>
            <li>
              <Footer.Link href="#">About</Footer.Link>
            </li>
            <li>
              <Footer.Link href="#">Stores</Footer.Link>
            </li>
            <li>
              <Footer.Link href="#">Careers</Footer.Link>
            </li>
          </Footer.List>
        </Footer.Section>
        <Footer.Bottom>
          <Footer.Text>© 2026 Northwind Commerce</Footer.Text>
        </Footer.Bottom>
      </Footer.Container>
    </Footer>
  )
}

function FacetPanel({
  brands,
  onToggleBrand,
  sizes,
  onToggleSize,
  colors,
  onColorChange,
}: {
  brands: string[]
  onToggleBrand: (value: string) => void
  sizes: string[]
  onToggleSize: (value: string) => void
  colors: string[]
  onColorChange: (value: string) => void
}) {
  return (
    <Accordion collapsible defaultValue={["brand", "price", "size", "colour"]} multiple>
      <Accordion.Item value="brand">
        <Accordion.Header>
          <Accordion.Title>Brand</Accordion.Title>
          <Accordion.Indicator />
        </Accordion.Header>
        <Accordion.Content>
          <div className="flex flex-col gap-100">
            {brandFacets.map((facet) => (
              <FormCheckbox
                checked={brands.includes(facet.value)}
                key={facet.value}
                label={`${facet.label} (${facet.count})`}
                onCheckedChange={() => onToggleBrand(facet.value)}
                size="sm"
              />
            ))}
          </div>
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item value="price">
        <Accordion.Header>
          <Accordion.Title>Price</Accordion.Title>
          <Accordion.Indicator />
        </Accordion.Header>
        <Accordion.Content>
          <Slider
            defaultValue={[40, 260]}
            formatValue={(value) => priceFormatter.format(value)}
            max={400}
            min={0}
            showValueText
            size="sm"
            step={10}
          />
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item value="size">
        <Accordion.Header>
          <Accordion.Title>Size</Accordion.Title>
          <Accordion.Indicator />
        </Accordion.Header>
        <Accordion.Content>
          <div className="flex flex-wrap gap-100">
            {sizeFacets.map((size) => (
              <Button
                aria-pressed={sizes.includes(size)}
                key={size}
                onClick={() => onToggleSize(size)}
                size="sm"
                theme={sizes.includes(size) ? "solid" : "outlined"}
                variant="secondary"
              >
                {size}
              </Button>
            ))}
          </div>
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item value="colour">
        <Accordion.Header>
          <Accordion.Title>Colour</Accordion.Title>
          <Accordion.Indicator />
        </Accordion.Header>
        <Accordion.Content>
          <ColorSelect
            colors={colorFacets.map((facet) => ({
              ...facet,
              selected: colors.includes(facet.label),
            }))}
            layout="grid"
            onColorClick={(color) =>
              onColorChange(
                colorFacets.find((facet) => facet.color === color)?.label ??
                  color
              )
            }
            selectionMode="multiple"
            size="md"
          />
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  )
}

function ProductGrid({ products }: { products: StorefrontProduct[] }) {
  const toaster = useToast()

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-150 rounded-lg border border-border-primary p-450 text-center">
        <p className="font-semibold text-md">No products match those filters</p>
        <p className="max-w-prose text-fg-secondary text-sm">
          Clear a filter above to widen the results.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-250 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {products.map((product) => (
        <ProductCardTemplate
          className="h-full"
          badges={
            product.badge
              ? [{ variant: product.badge.variant, children: product.badge.label }]
              : undefined
          }
          cartButtonText={
            product.stock === "out-of-stock" ? "Notify me" : "Add to cart"
          }
          detailButtonText="Details"
          image={{ src: product.image, alt: product.name }}
          key={product.id}
          name={product.name}
          onAddToCart={() =>
            toaster.create(
              product.stock === "out-of-stock"
                ? {
                    type: "info",
                    title: "We'll let you know",
                    description: `${product.name} is out of stock — we'll email you when it returns.`,
                  }
                : {
                    type: "success",
                    title: "Added to cart",
                    description: product.name,
                  }
            )
          }
          onViewDetails={() =>
            toaster.create({ type: "info", title: product.name })
          }
          originalPrice={product.originalPrice}
          price={product.price}
          rating={{ value: product.rating, count: 5, reviewCount: product.reviewCount }}
          stock={{ status: product.stock, label: product.stockLabel }}
        />
      ))}
    </div>
  )
}

function CategoryPage({ filtersInDrawer }: { filtersInDrawer?: boolean }) {
  const [brands, setBrands] = useState<string[]>(["northwind"])
  const [sizes, setSizes] = useState<string[]>(["M"])
  const [colors, setColors] = useState<string[]>([])
  const [drawer, setDrawer] = useState(false)

  const toggle = (
    list: string[],
    setList: (next: string[]) => void,
    value: string
  ) =>
    setList(
      list.includes(value)
        ? list.filter((entry) => entry !== value)
        : [...list, value]
    )

  const brandLabelOf = (product: StorefrontProduct) =>
    brandFacets.find((facet) => facet.label === product.brand)?.value

  /* Every active facet narrows the grid — a chip that changes nothing is a lie. */
  const visibleProducts = storefrontProducts.filter((product) => {
    const brandValue = brandLabelOf(product)
    const brandOk =
      brands.length === 0 ||
      (brandValue !== undefined && brands.includes(brandValue))
    const sizeOk =
      sizes.length === 0 || sizes.some((size) => product.sizes.includes(size))
    const colorOk =
      colors.length === 0 ||
      colors.some((color) => product.colors.includes(color))
    return brandOk && sizeOk && colorOk
  })

  const activeChips = [
    ...brands.map((value) => ({
      key: `brand-${value}`,
      label: brandFacets.find((facet) => facet.value === value)?.label ?? value,
      clear: () => toggle(brands, setBrands, value),
    })),
    ...sizes.map((value) => ({
      key: `size-${value}`,
      label: `Size ${value}`,
      clear: () => toggle(sizes, setSizes, value),
    })),
    ...colors.map((value) => ({
      key: `colour-${value}`,
      label: value,
      clear: () => toggle(colors, setColors, value),
    })),
  ]

  const facets = (
    <FacetPanel
      brands={brands}
      colors={colors}
      onColorChange={(value) => toggle(colors, setColors, value)}
      onToggleBrand={(value) => toggle(brands, setBrands, value)}
      onToggleSize={(value) => toggle(sizes, setSizes, value)}
      sizes={sizes}
    />
  )

  return (
    <div className="flex min-h-screen flex-col bg-base text-fg-primary">
      <Toaster />
      <StorefrontHeader />

      <main className="mx-auto flex w-full max-w-max-w flex-1 flex-col gap-250 p-250">
        <BreadcrumbTemplate
          items={[
            { label: "Home", href: "#" },
            { label: "Men", href: "#" },
            { label: "Footwear" },
          ]}
          size="sm"
        />

        <div className="flex flex-col gap-100">
          <h1 className="font-semibold text-xl">Footwear</h1>
          <p className="max-w-prose text-fg-secondary text-sm">
            Trainers, boots and everything between — 82 styles, restocked weekly.
          </p>
        </div>

        <div className="flex gap-250">
          {!filtersInDrawer && (
            <aside
              aria-label="Filters"
              className="hidden w-3xs shrink-0 flex-col gap-200 lg:flex"
            >
              <div className="flex items-center justify-between gap-150">
                <h2 className="font-semibold text-sm">Filters</h2>
                <Button
                  onClick={() => {
                    setBrands([])
                    setSizes([])
                    setColors([])
                  }}
                  size="sm"
                  theme="borderless"
                  variant="secondary"
                >
                  Reset
                </Button>
              </div>
              {facets}
            </aside>
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-200">
            <div className="flex flex-wrap items-center justify-between gap-150">
              <div className="flex items-center gap-150">
                {filtersInDrawer && (
                  <Button
                    icon="icon-[mdi--filter-variant]"
                    onClick={() => setDrawer(true)}
                    size="sm"
                    theme="outlined"
                    variant="secondary"
                  >
                    Filters
                  </Button>
                )}
                <span className="text-fg-secondary text-sm">
                  {visibleProducts.length} of 82 products
                </span>
              </div>
              <div className="w-2xs">
                <SelectTemplate
                  defaultValue={["relevance"]}
                  items={sortOptions}
                  label="Sort by"
                  size="sm"
                />
              </div>
            </div>

            {activeChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-100">
                {activeChips.map((chip) => (
                  <Button
                    icon="icon-[mdi--close]"
                    iconPosition="right"
                    key={chip.key}
                    onClick={chip.clear}
                    size="sm"
                    theme="outlined"
                    variant="secondary"
                  >
                    {chip.label}
                  </Button>
                ))}
              </div>
            )}

            <ProductGrid products={visibleProducts} />

            <div className="flex justify-center pt-200">
              <Pagination
                count={82}
                defaultPage={1}
                getPageUrl={({ page }) => `?page=${page}`}
                pageSize={8}
                siblingCount={1}
              />
            </div>
          </div>
        </div>
      </main>

      <StorefrontFooter />

      <Dialog
        customTrigger
        onOpenChange={(details) => setDrawer(details.open)}
        open={drawer}
        placement="left"
        size="sm"
        title="Filters"
      >
        <div className="flex flex-col gap-200 py-200">
          {facets}
          <div className="flex gap-150">
            <Button
              block
              onClick={() => {
                setBrands([])
                setSizes([])
                setColors([])
              }}
              theme="outlined"
              variant="secondary"
            >
              Reset
            </Button>
            <Button block onClick={() => setDrawer(false)} variant="primary">
              Show results
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export const FilterRail: Story = {
  name: "Filter rail (desktop)",
  render: () => <CategoryPage />,
}

export const FilterDrawer: Story = {
  name: "Filter drawer (narrow)",
  parameters: {
    docs: {
      description: {
        story:
          "Below `lg` the rail becomes a left-placement `Dialog`. The facet controls and their state are literally the same component — only the container changes.",
      },
    },
  },
  render: () => <CategoryPage filtersInDrawer />,
}
