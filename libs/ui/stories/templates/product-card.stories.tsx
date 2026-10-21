import { expect, fn, userEvent, within } from "storybook/test"
import type { Meta, StoryObj } from "@storybook/react"
import {
  ProductCardTemplate,
  type ProductCardTemplateProps,
} from "../../src/templates/product-card"

const productImages = {
  tshirt: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
  shoes: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
  watch: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
  headphones:
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
  camera: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400",
  backpack: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
}

const meta: Meta<ProductCardTemplateProps> = {
  title: "Templates/ProductCardTemplate",
  component: ProductCardTemplate,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A ready-to-use catalog card for comparing product images, prices, stock and aggregate ratings. Use this props-based template for standard product lists; use the compound ProductCard when you need a custom buy box or media composition. Aggregate ratings are static accessible summaries, not form controls.",
      },
    },
  },
  tags: ["autodocs"],
  args: { onAddToCart: fn(), onViewDetails: fn(), onAddToWishlist: fn() },
  argTypes: {
    layout: {
      control: "select",
      options: ["column", "row"],
      description: "Card layout orientation",
      table: {
        category: "Layout",
      },
    },
    name: {
      control: "text",
      description: "Product name",
      table: {
        category: "Content",
      },
    },
    price: {
      control: "text",
      description: "Current price",
      table: {
        category: "Content",
      },
    },
    originalPrice: {
      control: "text",
      description: "Original price (for sale items)",
      table: {
        category: "Content",
      },
    },
    image: {
      control: "object",
      description: "Product image with src and alt",
      table: {
        category: "Content",
      },
    },
    badges: {
      control: "object",
      description: "Array of badge configurations",
      table: {
        category: "Content",
      },
    },
    rating: {
      control: "object",
      description: "Rating configuration (value, count, reviewCount)",
      table: {
        category: "Rating",
      },
    },
    stock: {
      control: "object",
      description: "Stock status and label",
      table: {
        category: "Stock",
      },
    },
    showActions: {
      control: "boolean",
      description: "Show action buttons",
      table: {
        category: "Actions",
      },
    },
    cartButtonText: {
      control: "text",
      description: "Add to cart button text",
      table: {
        category: "Actions",
      },
    },
    detailButtonText: {
      control: "text",
      description: "View details button text",
      table: {
        category: "Actions",
      },
    },
    wishlistButtonText: {
      control: "text",
      description: "Wishlist button text",
      table: {
        category: "Actions",
      },
    },
    onAddToCart: {
      action: "add-to-cart",
      table: {
        category: "Actions",
      },
    },
    onViewDetails: {
      action: "view-details",
      table: {
        category: "Actions",
      },
    },
    onAddToWishlist: {
      action: "add-to-wishlist",
      table: {
        category: "Actions",
      },
    },
  },
}

export default meta
type Story = StoryObj<ProductCardTemplateProps>

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole("radiogroup")).not.toBeInTheDocument()
    await expect(
      canvas.getByRole("img", { name: "4.5 out of 5" })
    ).toBeVisible()
  },

  parameters: {
    docs: {
      description: {
        story:
          "Edit the card content to compare badges, sale prices and static aggregate ratings; action callbacks are local Storybook events.",
      },
    },
  },

  name: "Playground",
  args: {
    name: "Premium Cotton T-Shirt",
    price: "$49.99",
    originalPrice: "$79.99",
    image: {
      src: productImages.tshirt,
      alt: "Premium Cotton T-Shirt",
    },
    badges: [
      { variant: "success", children: "New" },
      { variant: "danger", children: "Sale" },
    ],
    rating: {
      value: 4.5,
      count: 5,
      reviewCount: 128,
    },
    stock: {
      status: "limited-stock",
      label: "Only 3 left in stock!",
    },
    showActions: true,
    cartButtonText: "Add to Cart",
    detailButtonText: "View Details",
    wishlistButtonText: "Add to Wishlist",
    layout: "column",
  },
}

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Show a basic catalog card with one current price and an add-to-cart action without requiring ratings or badges.",
      },
    },
  },

  args: {
    name: "Premium Cotton T-Shirt",
    price: "$29.99",
    image: {
      src: productImages.tshirt,
      alt: "Premium Cotton T-Shirt",
    },
    showActions: true,
    cartButtonText: "Add to Cart",
  },
}

export const OnSale: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare a labeled previous price with the current sale amount while keeping promotion badges and aggregate reviews distinct.",
      },
    },
  },

  args: {
    name: "Running Shoes Pro",
    price: "$89.99",
    originalPrice: "$149.99",
    image: {
      src: productImages.shoes,
      alt: "Running Shoes Pro",
    },
    badges: [
      { variant: "danger", children: "40% OFF" },
      { variant: "info", children: "Limited Time" },
    ],
    rating: {
      value: 4.8,
      reviewCount: 542,
    },
    showActions: true,
  },
}

export const OutOfStock: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Use an explicit unavailable-stock message and a Notify Me action instead of suggesting an unavailable product can be added to the cart.",
      },
    },
  },

  args: {
    name: "Vintage Camera",
    price: "$1,299.99",
    image: {
      src: productImages.camera,
      alt: "Vintage Camera",
    },
    badges: [{ variant: "secondary", children: "Collector Edition" }],
    rating: {
      value: 5,
      reviewCount: 23,
    },
    stock: {
      status: "out-of-stock",
      label: "Out of Stock",
    },
    showActions: true,
    cartButtonText: "Notify Me",
  },
}

const badgeHover = fn()
export const LinkedSaleCard: Story = {
  args: {
    name: "Montážní sada M8",
    href: "#montazni-sada-m8",
    showActions: false,
    price: "249 Kč",
    originalPrice: "299 Kč",
    currentPriceLabel: "Aktuální cena",
    originalPriceLabel: "Původní cena",
    linkProps: { onClick: (event) => event.preventDefault() },
    badges: [
      {
        key: "stock",
        variant: "info",
        children: "Skladem",
        size: "lg",
        title: "Stock status",
        "aria-label": "Available now",
        className: "commerce-standard-badge",
        style: { opacity: 0.9 },
        onMouseEnter: badgeHover,
      },
      {
        key: "offer",
        variant: "dynamic",
        children: "Akce",
        size: "lg",
        bgColor: "var(--color-primary)",
        borderColor: "var(--color-primary)",
        fgColor: "var(--color-primary-fg)",
        "aria-label": "Special offer",
        title: "Offer details",
        className: "commerce-dynamic-badge",
        style: { opacity: 0.9 },
        onMouseEnter: badgeHover,
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          "A product-name link remains reachable without action buttons, sale prices have localized meanings, and standard and dynamic badges retain their supplied attributes; navigation is intercepted in this demo.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const link = canvas.getByRole("link", { name: "Montážní sada M8" })
    await expect(link).toHaveAttribute("href", "#montazni-sada-m8")
    link.focus()
    await expect(link).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument()
    await expect(canvas.getByText("Původní cena:")).toBeInTheDocument()
    await expect(canvas.getByText("Aktuální cena:")).toBeInTheDocument()
    badgeHover.mockClear()
    for (const label of ["Available now", "Special offer"]) {
      const badge = canvas.getByLabelText(label)
      await expect(badge).toHaveStyle({ opacity: "0.9" })
      await expect(badge.className).toContain("lg")
      await expect(badge.className).toContain("commerce-")
      await expect(badge).toHaveAttribute("title")
      await userEvent.hover(badge)
      await userEvent.unhover(badge)
    }
    await expect(badgeHover).toHaveBeenCalledTimes(2)
  },
}
