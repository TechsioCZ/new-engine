import type { Meta, StoryObj } from "@storybook/react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import {
  type ComponentProps,
  type ComponentPropsWithRef,
  type ReactNode,
  createContext,
  useContext,
  useRef,
  useState,
} from "react"
import { StatusText } from "../../src/atoms/status-text"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Badge } from "../../src/atoms/badge"
import { NumericInput } from "../../src/atoms/numeric-input"
import { ProductCard } from "../../src/molecules/product-card"

// Sample product images for different scenarios
const productImages = {
  tshirt: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
  shoes: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
  watch: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
  headphones:
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
  camera: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400",
  backpack: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
}

const ActionContext = createContext<(message: string) => void>(() => {})
function DemoActions({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState(
    "Actions update this local preview only."
  )
  return (
    <ActionContext.Provider value={setMessage}>
      <div className="flex w-full min-w-0 flex-col gap-200">
        {children}
        <StatusText role="status">{message}</StatusText>
      </div>
    </ActionContext.Provider>
  )
}
function DemoProductButton(props: ComponentProps<typeof ProductCard.Button>) {
  const announce = useContext(ActionContext)
  const [selected, setSelected] = useState(false)
  const [count, setCount] = useState(0)
  const wishlist = props.buttonVariant === "wishlist"
  return (
    <ProductCard.Button
      {...props}
      aria-pressed={wishlist ? selected : undefined}
      onClick={(event) => {
        props.onClick?.(event)
        const next = !selected
        setSelected(next)
        if (!wishlist && props.buttonVariant !== "detail") setCount(count + 1)
        announce(
          wishlist
            ? next
              ? "Added to the local wishlist."
              : "Removed from the local wishlist."
            : props.buttonVariant === "detail"
              ? "Product details are shown in this card. This demo does not open a shop page."
              : `Added one item to the local demo cart. Quantity: ${count + 1}.`
        )
      }}
    />
  )
}
const meta: Meta<typeof ProductCard> = {
  decorators: [
    (Story) => (
      <DemoActions>
        <Story />
      </DemoActions>
    ),
  ],
  title: "Molecules/ProductCard",
  component: ProductCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A compound catalog card for comparing products through consistent media, names, prices, stock and actions. Use it for custom commerce layouts; use ProductCardTemplate for a ready-made card and LineItem for an editable basket row. Aggregate ratings are static summaries.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    layout: {
      control: { type: "select" },
      options: ["column", "row"],
      description: "Card layout orientation",
      table: { defaultValue: { summary: "column" } },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Image options for select control
const imageOptions = Object.keys(
  productImages
) as (keyof typeof productImages)[]

// Custom args type for Playground (compound component pattern)
type PlaygroundArgs = {
  layout: "column" | "row"
  productName: string
  price: string
  imageSrc: keyof typeof productImages
  showRating: boolean
  showStock: boolean
  showBadges: boolean
  rating: number
  stockStatus: "in-stock" | "limited-stock" | "out-of-stock"
  stockText: string
  buttonVariant: "cart" | "detail" | "wishlist"
  buttonText: string
}

// Playground with controls for interactive testing
export const Playground: StoryObj<PlaygroundArgs> = {
  parameters: {
    docs: {
      description: {
        story:
          "Configure a catalog card’s layout, badges, availability, rating and action, then try the action for local-only feedback.",
      },
    },
  },

  argTypes: {
    // Layout
    layout: {
      control: "select",
      options: ["column", "row"],
      description: "Card layout orientation",
      table: { defaultValue: { summary: "column" }, category: "Layout" },
    },

    // Content
    productName: {
      control: "text",
      description: "Product name",
      table: { category: "Content" },
    },
    price: {
      control: "text",
      description: "Product price",
      table: { category: "Content" },
    },
    imageSrc: {
      control: "select",
      options: imageOptions,
      description: "Product image",
      table: { category: "Content" },
    },

    // Visibility
    showRating: {
      control: "boolean",
      description: "Show rating stars",
      table: { defaultValue: { summary: "true" }, category: "Visibility" },
    },
    showStock: {
      control: "boolean",
      description: "Show stock status",
      table: { defaultValue: { summary: "true" }, category: "Visibility" },
    },
    showBadges: {
      control: "boolean",
      description: "Show product badges",
      table: { defaultValue: { summary: "false" }, category: "Visibility" },
    },
    rating: {
      control: { type: "number", min: 0, max: 5, step: 0.5 },
      description: "Rating value (0-5)",
      table: { defaultValue: { summary: "4" }, category: "Rating" },
    },
    stockStatus: {
      control: "select",
      options: ["in-stock", "limited-stock", "out-of-stock"],
      description: "Stock availability status",
      table: { defaultValue: { summary: "in-stock" }, category: "Stock" },
    },
    stockText: {
      control: "text",
      description: "Stock status text",
      table: { category: "Stock" },
    },
    buttonVariant: {
      control: "select",
      options: ["cart", "detail", "wishlist"],
      description: "Primary button variant",
      table: { defaultValue: { summary: "cart" }, category: "Button" },
    },
    buttonText: {
      control: "text",
      description: "Button label text",
      table: { category: "Button" },
    },
  },
  args: {
    layout: "column",
    productName: "Premium Cotton T-Shirt",
    price: "$29.99",
    imageSrc: "tshirt",
    showRating: true,
    showStock: true,
    showBadges: false,
    rating: 4,
    stockStatus: "in-stock",
    stockText: "In Stock",
    buttonVariant: "cart",
    buttonText: "Add to Cart",
  },
  render: (args) => {
    const buttonIcons = {
      cart: "token-icon-cart-button",
      detail: "token-icon-detail-button",
      wishlist: "token-icon-wishlist-button",
    } as const

    return (
      <ProductCard
        layout={args.layout}
        className={args.layout === "row" ? "w-full max-w-lg" : ""}
      >
        <ProductCard.Image
          src={productImages[args.imageSrc]}
          alt={args.productName}
          className={args.layout === "row" ? "row-span-6" : ""}
        />
        {args.showBadges && (
          <ProductCard.Badges>
            <Badge variant="success">New</Badge>
            <Badge variant="danger">Sale</Badge>
          </ProductCard.Badges>
        )}
        <ProductCard.Name>{args.productName}</ProductCard.Name>
        {args.showRating && (
          <ProductCard.Rating
            rating={{ value: args.rating, displayOnly: true }}
          />
        )}
        {args.showStock && (
          <ProductCard.Stock status={args.stockStatus}>
            {args.stockText}
          </ProductCard.Stock>
        )}
        <ProductCard.Price>{args.price}</ProductCard.Price>
        <ProductCard.Actions>
          <DemoProductButton
            buttonVariant={args.buttonVariant}
            onClick={fn()}
            icon={buttonIcons[args.buttonVariant]}
          >
            {args.buttonText}
          </DemoProductButton>
        </ProductCard.Actions>
      </ProductCard>
    )
  },
}

export const Badges: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Add to Cart" }))
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Added one item to the local demo cart."
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Product badges distinguish a new arrival, limited stock, a sale and an eco-friendly option without replacing the product name or price.",
      },
    },
  },

  render: () => {
    const badges = [
      { variant: "success" as const, label: "New" },
      { variant: "warning" as const, label: "Limited Stock" },
      { variant: "danger" as const, label: "Sale" },
      { variant: "info" as const, label: "Eco friendly" },
    ]
    return (
      <ProductCard>
        <ProductCard.Image
          src={productImages.tshirt}
          alt="Premium Cotton T-Shirt"
        />
        <ProductCard.Name>Premium Cotton T-Shirt</ProductCard.Name>
        <ProductCard.Badges>
          {badges.map((badge, idx) => (
            <Badge key={idx} variant={badge.variant}>
              {badge.label}
            </Badge>
          ))}
        </ProductCard.Badges>
        <ProductCard.Price>$29.99</ProductCard.Price>
        <ProductCard.Actions>
          <DemoProductButton buttonVariant="cart" icon="token-icon-cart-button">
            Add to Cart
          </DemoProductButton>
        </ProductCard.Actions>
      </ProductCard>
    )
  },
}

export const BadgesWithCustomColors: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Dynamic badges accept application-supplied colors for campaign labels while keeping the card’s ordinary product and action slots.",
      },
    },
  },

  name: "Badges - Custom Colors",
  render: () => {
    return (
      <ProductCard>
        <ProductCard.Image src={productImages.shoes} alt="Running Shoes" />
        <ProductCard.Name>Limited Edition Running Shoes</ProductCard.Name>
        <ProductCard.Badges>
          <Badge variant="success">New Arrival</Badge>
          <Badge
            variant="dynamic"
            bgColor="#fff"
            fgColor="#000"
            borderColor="#eee"
          >
            50% OFF
          </Badge>

          <Badge
            variant="dynamic"
            bgColor="#7f22fe"
            fgColor="#fff"
            borderColor="#9810fa"
          >
            Premium
          </Badge>

          <Badge
            variant="dynamic"
            bgColor="#f5f3ff"
            fgColor="#7f22fe"
            borderColor="#7f22fe"
          >
            Exclusive
          </Badge>
        </ProductCard.Badges>
        <ProductCard.Price>$89.99</ProductCard.Price>
        <ProductCard.Stock status="limited-stock">
          Only 3 left!
        </ProductCard.Stock>
        <ProductCard.Actions>
          <DemoProductButton buttonVariant="cart" icon="token-icon-cart-button">
            Add to Cart
          </DemoProductButton>
        </ProductCard.Actions>
      </ProductCard>
    )
  },
}

export const StockStates: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Available, limited-stock and unavailable products pair explicit stock copy with an appropriate purchase or detail action.",
      },
    },
  },

  name: "Stock Status Variants",
  render: () => (
    <VariantContainer>
      <VariantGroup title="In Stock">
        <ProductCard>
          <ProductCard.Image src={productImages.tshirt} alt="T-Shirt" />
          <ProductCard.Name>Cotton T-Shirt</ProductCard.Name>
          <ProductCard.Price>$24.99</ProductCard.Price>
          <ProductCard.Stock status="in-stock">In Stock</ProductCard.Stock>
          <ProductCard.Actions>
            <DemoProductButton
              buttonVariant="cart"
              icon="token-icon-cart-button"
            >
              Add to Cart
            </DemoProductButton>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>

      <VariantGroup title="Limited Stock">
        <ProductCard>
          <ProductCard.Image src={productImages.shoes} alt="Running Shoes" />
          <ProductCard.Name>Running Shoes</ProductCard.Name>
          <ProductCard.Price>$89.99</ProductCard.Price>
          <ProductCard.Stock status="limited-stock">
            Only 3 left in stock
          </ProductCard.Stock>
          <ProductCard.Actions>
            <DemoProductButton
              buttonVariant="cart"
              icon="token-icon-cart-button"
            >
              Add to Cart
            </DemoProductButton>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>

      <VariantGroup title="Out of Stock">
        <ProductCard>
          <ProductCard.Image src={productImages.watch} alt="Luxury Watch" />
          <ProductCard.Name>Luxury Watch</ProductCard.Name>
          <ProductCard.Price>$499.99</ProductCard.Price>
          <ProductCard.Stock status="out-of-stock">
            Out of Stock - Notify When Available
          </ProductCard.Stock>
          <ProductCard.Actions>
            <DemoProductButton
              buttonVariant="detail"
              icon="token-icon-detail-button"
            >
              Notify Me
            </DemoProductButton>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const AllButtonVariants: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Cart, detail, wishlist and custom actions retain distinct purposes and report their result locally instead of navigating or purchasing.",
      },
    },
  },

  name: "Button Variants",
  render: () => (
    <VariantContainer>
      <VariantGroup title="Cart Button">
        <ProductCard>
          <ProductCard.Image src={productImages.shoes} alt="Running Shoes" />
          <ProductCard.Name>Running Shoes</ProductCard.Name>
          <ProductCard.Price>$89.99</ProductCard.Price>
          <ProductCard.Actions>
            <DemoProductButton
              buttonVariant="cart"
              icon="token-icon-cart-button"
              onClick={fn()}
            >
              Add to Cart
            </DemoProductButton>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>

      <VariantGroup title="Detail Button">
        <ProductCard>
          <ProductCard.Image src={productImages.watch} alt="Luxury Watch" />
          <ProductCard.Name>Luxury Watch</ProductCard.Name>
          <ProductCard.Price>$499.99</ProductCard.Price>
          <ProductCard.Actions>
            <DemoProductButton
              buttonVariant="detail"
              icon="token-icon-detail-button"
              onClick={fn()}
            >
              View Details
            </DemoProductButton>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>

      <VariantGroup title="Wishlist Button">
        <ProductCard>
          <ProductCard.Image src={productImages.headphones} alt="Headphones" />
          <ProductCard.Name>Wireless Headphones</ProductCard.Name>
          <ProductCard.Price>$199.99</ProductCard.Price>
          <ProductCard.Actions>
            <DemoProductButton
              buttonVariant="wishlist"
              icon="token-icon-wishlist-button"
              onClick={fn()}
            >
              Save to Wishlist
            </DemoProductButton>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>

      <VariantGroup title="Custom Button">
        <ProductCard>
          <ProductCard.Image src={productImages.camera} alt="Camera" />
          <ProductCard.Name>Professional Camera</ProductCard.Name>
          <ProductCard.Price>$1,299.99</ProductCard.Price>
          <ProductCard.Actions>
            <DemoProductButton
              buttonVariant="custom"
              icon="token-icon-share"
              onClick={fn()}
              className="bg-accent text-accent-fg hover:bg-accent-hover"
            >
              Share Product
            </DemoProductButton>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const LayoutVariants: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Column cards prioritize imagery in a catalog grid, while row cards keep product details together in a compact listing.",
      },
    },
  },

  render: () => (
    <VariantContainer>
      <VariantGroup title="Column Layout (Default)">
        <ProductCard layout="column">
          <ProductCard.Image src={productImages.tshirt} alt="T-Shirt" />
          <ProductCard.Name>Cotton T-Shirt</ProductCard.Name>
          <ProductCard.Rating rating={{ defaultValue: 4, displayOnly: true }} />
          <ProductCard.Stock status="in-stock">In Stock</ProductCard.Stock>
          <ProductCard.Price>$24.99</ProductCard.Price>
          <ProductCard.Actions>
            <DemoProductButton
              buttonVariant="cart"
              icon="token-icon-cart-button"
            >
              Add to Cart
            </DemoProductButton>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>

      <VariantGroup title="Row Layout">
        <ProductCard layout="row" className="w-full max-w-lg">
          <ProductCard.Image
            src={productImages.shoes}
            alt="Shoes"
            className="row-span-6"
          />
          <ProductCard.Name>Running Shoes</ProductCard.Name>
          <ProductCard.Rating rating={{ defaultValue: 5, displayOnly: true }} />
          <ProductCard.Stock status="limited-stock">
            Limited Stock
          </ProductCard.Stock>
          <ProductCard.Price>$89.99</ProductCard.Price>
          <ProductCard.Actions>
            <DemoProductButton
              buttonVariant="cart"
              icon="token-icon-cart-button"
            >
              Add to Cart
            </DemoProductButton>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const CustomComposition: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByText("$1,329", { selector: "p" })
    ).toHaveTextContent("Current price $1,329")
    const previous = canvas.getByText("$1,899", {
      exact: false,
      selector: "del",
    })
    await expect(previous).toHaveTextContent("Original price $1,899")
  },
  parameters: {
    docs: {
      description: {
        story:
          "A sale camera combines labeled current and original prices, campaign badges and separate purchase and detail actions using compound slots.",
      },
    },
  },

  render: () => (
    <ProductCard>
      <ProductCard.Image src={productImages.camera} alt="DSLR Camera" />

      <div className="mb-100 flex gap-100">
        <Badge variant="info">-30%</Badge>
        <Badge variant="success">Free Shipping</Badge>
      </div>

      <ProductCard.Name>Professional DSLR Camera</ProductCard.Name>

      <div className="flex flex-wrap items-baseline gap-100">
        <del className="text-100 text-fg-primary">
          <span className="sr-only">Original price </span>$1,899
        </del>
        <ProductCard.Price>
          <span className="sr-only">Current price </span>$1,329
        </ProductCard.Price>
      </div>

      <div className="flex items-center gap-100">
        <ProductCard.Rating rating={{ defaultValue: 4.5, displayOnly: true }} />
        <span className="text-100 text-fg-muted">(245 reviews)</span>
      </div>

      <ProductCard.Stock status="limited-stock">
        Only 3 left in stock
      </ProductCard.Stock>

      <ProductCard.Actions>
        <div className="flex w-full gap-200">
          <DemoProductButton
            buttonVariant="cart"
            icon="token-icon-cart-button"
            className="flex-1"
          >
            Buy Now
          </DemoProductButton>
          <DemoProductButton
            buttonVariant="detail"
            icon="token-icon-detail-button"
          >
            Details
          </DemoProductButton>
        </div>
      </ProductCard.Actions>
    </ProductCard>
  ),
}

export const WithQuantityInput: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A quantity stepper sits beside the purchase action so shoppers can choose an amount without leaving the product card.",
      },
    },
  },

  render: () => (
    <ProductCard className="max-w-sm">
      <div>
        <ProductCard.Image
          src={productImages.watch}
          alt="Luxury Watch"
          className="h-auto w-full"
        />
        <ProductCard.Name>Swiss Luxury Watch</ProductCard.Name>
        <ProductCard.Price>$2,499</ProductCard.Price>
        <ProductCard.Stock status="limited-stock">
          Limited Edition - 5 Available
        </ProductCard.Stock>
      </div>
      <ProductCard.Actions>
        <NumericInput id="product-quantity" defaultValue={1} min={1} max={5}>
          <NumericInput.Control>
            <NumericInput.Input aria-label="Quantity" />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
        <DemoProductButton
          buttonVariant="cart"
          icon="token-icon-cart-button"
          onClick={fn()}
          className="flex-1"
        >
          Add to Cart
        </DemoProductButton>
        <DemoProductButton
          buttonVariant="wishlist"
          icon="token-icon-wishlist-button"
          onClick={fn()}
          className="w-full"
        >
          Save for Later
        </DemoProductButton>
      </ProductCard.Actions>
    </ProductCard>
  ),
}

export const MinimalCard: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A compact discovery card shows only the product name, image and price when purchase controls would distract from browsing.",
      },
    },
  },

  render: () => (
    <ProductCard>
      <ProductCard.Name className="text-center">
        Travel Backpack
      </ProductCard.Name>
      <ProductCard.Image src={productImages.backpack} alt="Travel Backpack" />
      <ProductCard.Price>$79.99</ProductCard.Price>
    </ProductCard>
  ),
}

export const ComplexCard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByText("$2,449", { selector: "p" })
    ).toHaveTextContent("Current price $2,449")
    const previous = canvas.getByText("$3,499", {
      exact: false,
      selector: "del",
    })
    await expect(previous).toHaveTextContent("Original price $3,499")
  },
  parameters: {
    docs: {
      description: {
        story:
          "A camera bundle keeps sale pricing, reviews, shipping, scarcity and quantity controls readable together in one responsive card.",
      },
    },
  },

  render: () => (
    <ProductCard className="w-full max-w-md">
      <div className="relative">
        <ProductCard.Image
          src={productImages.camera}
          alt="Camera Kit"
          className="w-full"
        />
        <Badge variant="danger" className="absolute top-100 right-100">
          HOT DEAL
        </Badge>
      </div>

      <ProductCard.Badges>
        <Badge variant="info">New Arrival</Badge>
        <Badge variant="success">Eco-Friendly</Badge>
        <Badge variant="warning">Limited Stock</Badge>
      </ProductCard.Badges>

      <ProductCard.Name>
        Professional Camera Kit with Accessories
      </ProductCard.Name>

      <div className="mb-100 flex items-center gap-100">
        <ProductCard.Rating rating={{ defaultValue: 4.9, displayOnly: true }} />
        <span className="text-50 text-fg-muted">(512 reviews)</span>
      </div>

      <div className="mb-200 flex flex-col gap-100">
        <div className="flex flex-wrap items-baseline gap-100">
          <del className="text-fg-muted">
            <span className="sr-only">Original price </span>$3,499
          </del>
          <ProductCard.Price>
            <span className="sr-only">Current price </span>$2,449
          </ProductCard.Price>
          <Badge variant="danger">Save $1,050</Badge>
        </div>
        <span className="text-50 text-success-fg">Free shipping included</span>
      </div>

      <ProductCard.Stock status="limited-stock">
        Only 2 units left - Order soon!
      </ProductCard.Stock>

      <ProductCard.Actions>
        <div className="mb-100 flex flex-col gap-100 sm:flex-row sm:items-center">
          <NumericInput
            className="min-w-0 flex-1"
            id="product-quantity"
            defaultValue={1}
            min={1}
            max={10}
          >
            <NumericInput.Control>
              <NumericInput.Input aria-label="Quantity" />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </NumericInput>
          <DemoProductButton
            buttonVariant="cart"
            icon="token-icon-cart-button"
            onClick={fn()}
            className="flex-1"
          >
            Add to Cart
          </DemoProductButton>
        </div>

        <div className="grid grid-cols-2 gap-100">
          <DemoProductButton
            buttonVariant="detail"
            icon="token-icon-detail-button"
            onClick={fn()}
          >
            Quick View
          </DemoProductButton>
          <DemoProductButton
            buttonVariant="wishlist"
            icon="token-icon-wishlist-button"
            onClick={fn()}
          >
            Wishlist
          </DemoProductButton>
        </div>
      </ProductCard.Actions>

      <div className="border-border-primary border-t pt-100">
        <span className="text-50 text-fg-muted">
          ✓ 2-year warranty • ✓ 30-day returns • ✓ Expert support
        </span>
      </div>
    </ProductCard>
  ),
}

export const ActionLayouts: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Full-width, split and grouped actions demonstrate how to keep one purchase action prominent alongside secondary product tasks.",
      },
    },
  },

  name: "Action Button Layouts",
  render: () => (
    <VariantContainer>
      <VariantGroup title="Horizontal Actions">
        <ProductCard>
          <ProductCard.Image src={productImages.shoes} alt="Shoes" />
          <ProductCard.Name>Running Shoes</ProductCard.Name>
          <ProductCard.Price>$89.99</ProductCard.Price>
          <ProductCard.Actions>
            <div className="flex gap-100">
              <DemoProductButton
                buttonVariant="cart"
                icon="token-icon-cart-button"
              >
                Cart
              </DemoProductButton>
              <DemoProductButton
                buttonVariant="detail"
                icon="token-icon-detail-button"
              >
                View
              </DemoProductButton>
              <DemoProductButton
                buttonVariant="wishlist"
                icon="token-icon-wishlist-button"
              >
                Save
              </DemoProductButton>
            </div>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>

      <VariantGroup title="Vertical Actions">
        <ProductCard>
          <ProductCard.Image src={productImages.headphones} alt="Headphones" />
          <ProductCard.Name>Wireless Headphones</ProductCard.Name>
          <ProductCard.Price>$199.99</ProductCard.Price>
          <ProductCard.Actions>
            <div className="flex flex-col gap-100">
              <DemoProductButton
                buttonVariant="cart"
                icon="token-icon-cart-button"
                className="w-full"
              >
                Add to Cart
              </DemoProductButton>
              <DemoProductButton
                buttonVariant="detail"
                icon="token-icon-detail-button"
                className="w-full"
              >
                View Details
              </DemoProductButton>
            </div>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>

      <VariantGroup title="Mixed Layout">
        <ProductCard>
          <ProductCard.Image src={productImages.watch} alt="Watch" />
          <ProductCard.Name>Luxury Watch</ProductCard.Name>
          <ProductCard.Price>$999.99</ProductCard.Price>
          <ProductCard.Actions>
            <DemoProductButton
              buttonVariant="cart"
              icon="token-icon-cart-button"
              className="mb-100 w-full"
            >
              Add to Cart
            </DemoProductButton>
            <div className="flex gap-100">
              <DemoProductButton
                buttonVariant="detail"
                icon="token-icon-detail-button"
                className="flex-1"
              >
                Details
              </DemoProductButton>
              <DemoProductButton
                buttonVariant="wishlist"
                icon="token-icon-wishlist-button"
                className="flex-1"
              >
                Wishlist
              </DemoProductButton>
            </div>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const CustomRowSpan: Story = {
  name: "Custom Row Span Override",
  render: () => (
    <ProductCard layout="row" className="w-full max-w-lg auto-rows-auto">
      <div className="row-span-3">
        <ProductCard.Name>Professional Camera</ProductCard.Name>
        <ProductCard.Image
          src={productImages.camera}
          alt="Camera"
          className="h-fit row-span-2"
        />
      </div>
      <div className="col-2 row-3 place-self-end">
        <ProductCard.Price>$1,299.99</ProductCard.Price>
        <ProductCard.Rating rating={{ defaultValue: 4.5, displayOnly: true }} />
        <ProductCard.Actions>
          <DemoProductButton buttonVariant="cart" icon="token-icon-cart-button">
            Add to Cart
          </DemoProductButton>
        </ProductCard.Actions>
      </div>
    </ProductCard>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates simple className override - changing row-span-6 to row-span-3 and aspect-auto to aspect-video.",
      },
    },
  },
}

export const CustomGridLayout: Story = {
  name: "Custom Grid Structure",
  render: () => (
    <ProductCard
      layout="row"
      className="w-full max-w-xl grid-cols-1 sm:grid-cols-2"
    >
      <div className="flex flex-col gap-200">
        <ProductCard.Name>Premium Wireless Headphones</ProductCard.Name>
        <ProductCard.Image
          src={productImages.headphones}
          alt="Headphones"
          className="aspect-video row-span-1"
        />
      </div>
      <div className="flex flex-col gap-200">
        <ProductCard.Badges className="flex flex-row flex-nowrap w-max">
          <Badge variant="success">New Arrival</Badge>
          <Badge variant="info">Noise Cancelling</Badge>
        </ProductCard.Badges>
        <ProductCard.Price>$349.99</ProductCard.Price>
        <ProductCard.Rating rating={{ defaultValue: 4.9, displayOnly: true }} />
        <ProductCard.Stock status="limited-stock">
          Only 5 left in stock!
        </ProductCard.Stock>
        <ProductCard.Actions>
          <DemoProductButton buttonVariant="cart" icon="token-icon-cart-button">
            Add to Cart
          </DemoProductButton>
          <DemoProductButton
            buttonVariant="wishlist"
            icon="token-icon-wishlist-button"
          >
            Wishlist
          </DemoProductButton>
        </ProductCard.Actions>
      </div>
    </ProductCard>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates complex layout override - custom grid with Title + Image in first column, all other content in second column. Uses a single column on phones and two equal columns on larger screens.",
      },
    },
  },
}

export const NativeMediaFallback: Story = {
  render: () => (
    <ProductCard>
      <ProductCard.Image
        src="data:image/png;base64,invalid"
        alt="Runner low side view"
        width={400}
        height={300}
      />
      <ProductCard.Name>Runner low</ProductCard.Name>
    </ProductCard>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "A failed native image retains its reserved media geometry and meaningful alternative instead of showing a broken browser icon.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const media =
      canvasElement.querySelector<HTMLElement>("[data-image-state]")!
    await waitFor(() =>
      expect(media).toHaveAttribute("data-image-state", "error")
    )
    await expect(
      within(canvasElement).getByRole("img", { name: "Runner low side view" })
    ).toBeVisible()
    await expect(media.getBoundingClientRect().height).toBeGreaterThan(0)
  },
}

function CardMediaAdapter({
  src,
  assetId,
  ...props
}: ComponentPropsWithRef<"img"> & { assetId: string }) {
  return <img {...props} data-requested-src={src} data-asset-id={assetId} />
}
function CardMediaLifecycleExample() {
  const [source, setSource] = useState("pending-card")
  const [events, setEvents] = useState("Waiting for media")
  const image = useRef<HTMLImageElement>(null)
  return (
    <div className="flex flex-col gap-200">
      <ProductCard>
        <ProductCard.Image
          as={CardMediaAdapter}
          assetId="runner-side"
          ref={image}
          src={source}
          alt="Runner low adapter side view"
          width={400}
          height={300}
          onLoad={() =>
            setEvents(
              image.current?.tagName === "IMG"
                ? "Loaded on image ref"
                : "Incorrect ref"
            )
          }
          onError={() =>
            setEvents("Image failed; select a new source to recover")
          }
        />
        <ProductCard.Name>Runner low</ProductCard.Name>
      </ProductCard>
      <Button onClick={() => setSource("recovered-card")}>
        Recover card media
      </Button>
      <StatusText role="status" aria-label="Card media lifecycle">
        {events}
      </StatusText>
    </div>
  )
}
export const AdapterMediaLifecycle: Story = {
  render: () => <CardMediaLifecycleExample />,
  parameters: {
    docs: {
      description: {
        story:
          "A custom adapter retains its required props, event handlers and actual image ref through loading, failure and source recovery.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    let image = canvasElement.querySelector<HTMLImageElement>(
      '[data-asset-id="runner-side"]'
    )!
    const media = image.closest<HTMLElement>("[data-image-state]")!
    const initial = media.getBoundingClientRect()
    await expect(media).toHaveAttribute("data-image-state", "loading")
    image.dispatchEvent(new Event("error"))
    await waitFor(() =>
      expect(media).toHaveAttribute("data-image-state", "error")
    )
    await expect(
      canvas.getByRole("status", { name: "Card media lifecycle" })
    ).toHaveTextContent("Image failed")
    await expect(
      canvas.getByRole("img", { name: "Runner low adapter side view" })
    ).toBeVisible()
    await userEvent.click(
      canvas.getByRole("button", { name: "Recover card media" })
    )
    image = canvasElement.querySelector<HTMLImageElement>(
      '[data-asset-id="runner-side"]'
    )!
    await expect(image.closest("[data-image-state]")).toHaveAttribute(
      "data-image-state",
      "loading"
    )
    image.dispatchEvent(new Event("load"))
    await waitFor(() =>
      expect(
        canvas.getByRole("status", { name: "Card media lifecycle" })
      ).toHaveTextContent("Loaded on image ref")
    )
    const recovered = image
      .closest<HTMLElement>("[data-image-state]")!
      .getBoundingClientRect()
    await expect(recovered.width).toBe(initial.width)
    await expect(recovered.height).toBe(initial.height)
  },
}
