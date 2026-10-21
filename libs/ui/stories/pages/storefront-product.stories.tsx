import { expect, userEvent, within } from "storybook/test"
import { DemoBoundary } from "./demo-boundary"
import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useState } from "react"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import { NumericInput } from "../../src/atoms/numeric-input"
import { Rating } from "../../src/atoms/rating"
import { StatusText } from "../../src/atoms/status-text"
import { Dialog } from "../../src/molecules/dialog"
import { Accordion } from "../../src/molecules/accordion"
import { Carousel } from "../../src/molecules/carousel"
import { ColorSelect } from "../../src/molecules/color-select"
import { RadioCard } from "../../src/molecules/radio-card"
import { Tabs } from "../../src/molecules/tabs"
import { Toaster, useToast } from "../../src/molecules/toast"
import { Gallery } from "../../src/organisms/gallery"
import { Table } from "../../src/organisms/table"
import { BreadcrumbTemplate } from "../../src/templates/breadcrumb"
import { ProductCardTemplate } from "../../src/templates/product-card"
import { colorFacets, productGallery, storefrontProducts } from "./data"

const meta: Meta = {
  decorators: [
    (Story) => (
      <DemoBoundary>
        <Story />
      </DemoBoundary>
    ),
  ],
  tags: ["autodocs"],
  title: "Pages/Storefront/Product detail",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "Product detail: media on the left, the buying decision on the right, the",
          "supporting detail below the fold.",
          "",
          "**Pattern rules**",
          "- The buy box is one uninterrupted column — price, variant, quantity, action,",
          "  delivery promise — and nothing else competes with it above the fold.",
          "- Variant pickers that change the price or availability sit *above* the add-to-",
          "  cart button, never below it.",
          "- Stock and delivery are stated as facts next to the action, not hidden in a tab.",
          "- Specification detail goes in `Accordion`/`Tabs` below: it matters to some",
          "  shoppers, but it must never push the action off screen.",
          "- Related products are a `ProductCardTemplate` rail using the same card as the",
          "  category grid, so the comparison is like-for-like.",
        ].join("\n"),
      },
    },
  },
}

export default meta
type Story = StoryObj

const sizeOptions =
  storefrontProducts.find((product) => product.id === "sf-2")?.sizes ?? []

function ProductDetailPage() {
  const toaster = useToast()
  const [slidesPerPage, setSlidesPerPage] = useState(1)
  useEffect(() => {
    const tablet = window.matchMedia("(min-width: 640px)")
    const desktop = window.matchMedia("(min-width: 1024px)")
    const update = () =>
      setSlidesPerPage(desktop.matches ? 4 : tablet.matches ? 2 : 1)
    update()
    tablet.addEventListener("change", update)
    desktop.addEventListener("change", update)
    return () => {
      tablet.removeEventListener("change", update)
      desktop.removeEventListener("change", update)
    }
  }, [])
  const [size, setSize] = useState("42")
  const [quantity, setQuantity] = useState(1)
  const [color, setColor] = useState(colorFacets[0]?.color)
  const [guideOpen, setGuideOpen] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  return (
    <div className="flex min-h-screen flex-col bg-base text-fg-primary">
      <Toaster />
      <Dialog
        customTrigger
        title="Size guide — Runner low"
        description="Measure your foot from heel to toe. EU 40: 25.5 cm · EU 41: 26 cm · EU 42: 26.5 cm · EU 43: 27.5 cm · EU 44: 28 cm. Choose the next size if between measurements."
        open={guideOpen}
        onOpenChange={({ open }) => setGuideOpen(open)}
      />
      <StatusText className="px-250" role="status">
        Demo cart: {cartCount} items
      </StatusText>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-350 p-250">
        <BreadcrumbTemplate
          items={[
            { label: "Home", href: "#" },
            { label: "Men", href: "#" },
            { label: "Footwear", href: "#" },
            { label: "Runner low" },
          ]}
          size="sm"
        />

        <div className="grid grid-cols-1 items-start gap-350 lg:grid-cols-2">
          <Gallery items={productGallery} thumbnailSize={88}>
            <Gallery.Main>
              <Gallery.Carousel />
            </Gallery.Main>
            <Gallery.Thumbnails />
          </Gallery>

          <div className="flex flex-col gap-250">
            <div className="flex flex-col gap-100">
              <span className="text-fg-secondary text-sm">Northwind Sport</span>
              <h1 className="font-semibold text-2xl">Runner low</h1>
              <div className="flex flex-wrap items-center gap-150">
                <Rating count={5} defaultValue={4.8} readOnly size="sm" />
                <span className="text-fg-secondary text-sm">542 reviews</span>
                <Badge size="sm" variant="success">
                  In stock
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-150">
              <span className="font-semibold text-xl">139 €</span>
              <span className="text-fg-secondary line-through">179 €</span>
              <Badge size="sm" variant="danger">
                −22%
              </Badge>
            </div>

            <div className="flex flex-col gap-100">
              <span className="font-medium text-sm">Colour</span>
              <ColorSelect
                colors={colorFacets
                  .slice(0, 4)
                  .map((item) => ({ ...item, selected: item.color === color }))}
                onColorClick={setColor}
                layout="grid"
                selectionMode="single"
                size="md"
              />
            </div>

            <div className="flex flex-col gap-100">
              <div className="flex items-center justify-between gap-150">
                <span className="font-medium text-sm">Size (EU)</span>
                <Button
                  onClick={() => setGuideOpen(true)}
                  size="sm"
                  theme="borderless"
                  variant="secondary"
                >
                  Size guide
                </Button>
              </div>
              <div className="flex flex-wrap gap-100">
                {sizeOptions.map((option) => (
                  <Button
                    aria-pressed={option === size}
                    disabled={option === "39"}
                    key={option}
                    onClick={() => setSize(option)}
                    size="sm"
                    theme={option === size ? "solid" : "outlined"}
                    variant="secondary"
                  >
                    {option}
                  </Button>
                ))}
              </div>
              <StatusText size="sm" status="default">
                Runs slightly narrow — consider a half size up.
              </StatusText>
            </div>

            <div className="grid grid-cols-1 items-end gap-150 sm:flex sm:flex-wrap">
              <div className="w-full sm:w-3xs">
                <NumericInput
                  max={10}
                  min={1}
                  onChange={setQuantity}
                  value={quantity}
                >
                  <NumericInput.Control>
                    <NumericInput.Input aria-label="Quantity" />
                    <NumericInput.TriggerContainer>
                      <NumericInput.IncrementTrigger />
                      <NumericInput.DecrementTrigger />
                    </NumericInput.TriggerContainer>
                  </NumericInput.Control>
                </NumericInput>
              </div>
              <Button
                className="w-full sm:w-auto sm:flex-1"
                icon="icon-[mdi--cart-outline]"
                onClick={() => {
                  setCartCount((count) => count + quantity)
                  toaster.create({
                    type: "success",
                    title: "Added to cart",
                    description: `Runner low · EU ${size} · ${quantity} pc · saved to this demo cart`,
                  })
                }}
                variant="primary"
              >
                Add to cart
              </Button>
              <Button
                className="justify-self-start"
                aria-label={
                  wishlisted ? "Remove from wishlist" : "Add to wishlist"
                }
                aria-pressed={wishlisted}
                onClick={() => setWishlisted((value) => !value)}
                icon={
                  wishlisted ? "icon-[mdi--heart]" : "icon-[mdi--heart-outline]"
                }
                theme="outlined"
                variant="secondary"
              />
            </div>

            <RadioCard
              defaultValue="standard"
              name="delivery"
              size="sm"
              variant="outline"
            >
              <RadioCard.Label>Delivery</RadioCard.Label>
              <RadioCard.Item value="standard">
                <RadioCard.ItemHiddenInput />
                <RadioCard.ItemControl>
                  <RadioCard.ItemContent>
                    <RadioCard.ItemText>Standard — free</RadioCard.ItemText>
                    <RadioCard.ItemDescription>
                      Arrives Tue 16 – Thu 18 September
                    </RadioCard.ItemDescription>
                  </RadioCard.ItemContent>
                  <RadioCard.ItemIndicator />
                </RadioCard.ItemControl>
              </RadioCard.Item>
              <RadioCard.Item value="express">
                <RadioCard.ItemHiddenInput />
                <RadioCard.ItemControl>
                  <RadioCard.ItemContent>
                    <RadioCard.ItemText>Express — 9 €</RadioCard.ItemText>
                    <RadioCard.ItemDescription>
                      Ordered before 14:00 · arrives tomorrow
                    </RadioCard.ItemDescription>
                  </RadioCard.ItemContent>
                  <RadioCard.ItemIndicator />
                </RadioCard.ItemControl>
              </RadioCard.Item>
            </RadioCard>

            <div className="flex flex-col gap-100 rounded-md border border-border-primary p-150">
              <span className="flex items-center gap-100 text-sm">
                <Icon icon="icon-[mdi--truck-outline]" size="sm" />
                Free returns within 30 days
              </span>
              <span className="flex items-center gap-100 text-sm">
                <Icon icon="icon-[mdi--shield-check-outline]" size="sm" />
                Two-year manufacturer warranty
              </span>
            </div>
          </div>
        </div>

        <Tabs
          className="overflow-hidden rounded-lg border border-border-primary"
          defaultValue="description"
          variant="line"
        >
          <Tabs.List className="px-250 pt-250">
            <Tabs.Trigger value="description">Description</Tabs.Trigger>
            <Tabs.Trigger value="specs">Specification</Tabs.Trigger>
            <Tabs.Trigger value="reviews">Reviews</Tabs.Trigger>
            <Tabs.Trigger value="shipping">Shipping</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>

          <Tabs.Content
            className="flex flex-col gap-150 p-250"
            value="description"
          >
            <p className="max-w-prose text-fg-secondary text-sm">
              A low-profile everyday trainer on a compression-moulded midsole.
              The upper is a single piece of recycled engineered mesh, so there
              are no seams across the flex point.
            </p>
          </Tabs.Content>

          <Tabs.Content className="p-250" value="specs">
            <Table size="sm" variant="line">
              <Table.Body>
                <Table.Row>
                  <Table.ColumnHeader scope="row">Upper</Table.ColumnHeader>
                  <Table.Cell>Recycled engineered mesh</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.ColumnHeader scope="row">Midsole</Table.ColumnHeader>
                  <Table.Cell>Compression-moulded EVA</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.ColumnHeader scope="row">Drop</Table.ColumnHeader>
                  <Table.Cell>8 mm</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.ColumnHeader scope="row">Weight</Table.ColumnHeader>
                  <Table.Cell>268 g (EU 42)</Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table>
          </Tabs.Content>

          <Tabs.Content className="flex flex-col gap-250 p-250" value="reviews">
            <div className="flex flex-wrap items-center gap-250">
              <div className="flex flex-col gap-50">
                <span className="font-semibold text-xl">4.8</span>
                <Rating count={5} defaultValue={4.8} readOnly size="sm" />
                <span className="text-fg-secondary text-xs">542 reviews</span>
              </div>
            </div>
            <Accordion collapsible defaultValue={["r1"]} multiple>
              <Accordion.Item value="r1">
                <Accordion.Header>
                  <Accordion.Title>
                    “Best daily trainer I have owned”
                  </Accordion.Title>
                  <Accordion.Indicator />
                </Accordion.Header>
                <Accordion.Content>
                  <p className="max-w-prose text-fg-secondary text-sm">
                    600 km in and the midsole has barely changed. Sizing is
                    accurate for a narrow foot.
                  </p>
                </Accordion.Content>
              </Accordion.Item>
              <Accordion.Item value="r2">
                <Accordion.Header>
                  <Accordion.Title>“Great, but narrow”</Accordion.Title>
                  <Accordion.Indicator />
                </Accordion.Header>
                <Accordion.Content>
                  <p className="max-w-prose text-fg-secondary text-sm">
                    Had to exchange for a half size up. The return was free and
                    took two days.
                  </p>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>
          </Tabs.Content>

          <Tabs.Content
            className="flex flex-col gap-150 p-250"
            value="shipping"
          >
            <p className="max-w-prose text-fg-secondary text-sm">
              Free standard delivery over 50 €. Express orders placed before
              14:00 ship the same day. Returns are free for 30 days.
            </p>
          </Tabs.Content>
        </Tabs>

        <section className="flex flex-col gap-200">
          <h2 className="font-semibold text-md">You may also like</h2>
          <Carousel
            aria-label="Related products"
            aspectRatio="none"
            size="full"
            slideCount={storefrontProducts.length}
            slidesPerPage={slidesPerPage}
          >
            <Carousel.Slides
              slides={storefrontProducts.map((product) => ({
                id: product.id,
                content: (
                  <ProductCardTemplate
                    image={{ src: product.image, alt: product.name }}
                    name={product.name}
                    price={product.price}
                    rating={{ value: product.rating, count: 5 }}
                    showActions={false}
                  />
                ),
              }))}
            />
            <Carousel.Control
              className="mx-auto mt-200 w-max max-w-full"
              controlPosition="unset"
            >
              <Carousel.Previous />
              <Carousel.Indicators />
              <Carousel.Next />
            </Carousel.Control>
          </Carousel>
        </section>
      </main>
    </div>
  )
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const quantity = canvas.getByRole("spinbutton", { name: "Quantity" })
    await expect(quantity).toBeVisible()
    const colors = canvas.getAllByRole("radio")
    await userEvent.click(colors[1]!)
    await expect(colors[1]!).toHaveAttribute("aria-checked", "true")
    await userEvent.click(canvas.getByRole("button", { name: "Size guide" }))
    const dialog = within(canvasElement.ownerDocument.body).getByRole(
      "dialog",
      { name: "Size guide — Runner low" }
    )
    await expect(dialog).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await userEvent.click(
      canvas.getByRole("button", { name: "Add to wishlist" })
    )
    const saved = canvas.getByRole("button", { name: "Remove from wishlist" })
    await expect(saved).toHaveAttribute("aria-pressed", "true")
    await expect(saved.innerHTML).toContain("mdi--heart]")
    await userEvent.click(saved)
    await expect(
      canvas.getByRole("button", { name: "Add to wishlist" })
    ).toHaveAttribute("aria-pressed", "false")
    const related = canvas.getByRole("region", { name: "Related products" })
    const slides = related.querySelector<HTMLElement>(
      '[data-part="item-group"]'
    )!
    const controls = related.querySelector<HTMLElement>(
      '[data-part="control"]'
    )!
    await expect(controls.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      slides.getBoundingClientRect().bottom
    )
    await expect(
      canvasElement.ownerDocument.documentElement.scrollWidth
    ).toBeLessThanOrEqual(
      canvasElement.ownerDocument.defaultView?.innerWidth ?? 1440
    )
  },

  parameters: {
    docs: {
      description: {
        story:
          "Compare product details, select a variant and quantity, and add it to a local demo cart without leaving Storybook.",
      },
    },
  },

  name: "Buy box + detail",
  render: () => <ProductDetailPage />,
}
