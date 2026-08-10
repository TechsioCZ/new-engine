import type { Meta, StoryObj } from "@storybook/react"

import { ProductCardTemplate } from "../../src/templates/product-card"

const productImages = {
  backpack: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
  camera: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400",
  headphones:
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
  shoes: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
  tshirt: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
  watch: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
}

const premiumCottonTShirt = "Premium Cotton T-Shirt"

const meta: Meta<typeof ProductCardTemplate> = {
  argTypes: {
    badges: {
      control: "object",
      description: "Array of badge configurations",
      table: {
        category: "Content",
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
    image: {
      control: "object",
      description: "Product image with src and alt",
      table: {
        category: "Content",
      },
    },
    layout: {
      control: "select",
      description: "Card layout orientation",
      options: ["column", "row"],
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
    onAddToCart: {
      action: "add-to-cart",
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
    onViewDetails: {
      action: "view-details",
      table: {
        category: "Actions",
      },
    },
    originalPrice: {
      control: "text",
      description: "Original price (for sale items)",
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
    rating: {
      control: "object",
      description: "Rating configuration (value, count, reviewCount)",
      table: {
        category: "Rating",
      },
    },
    showActions: {
      control: "boolean",
      description: "Show action buttons",
      table: {
        category: "Actions",
      },
    },
    stock: {
      control: "object",
      description: "Stock status and label",
      table: {
        category: "Stock",
      },
    },
    wishlistButtonText: {
      control: "text",
      description: "Wishlist button text",
      table: {
        category: "Actions",
      },
    },
  },
  component: ProductCardTemplate,
  parameters: {
    docs: {
      description: {
        component: `
          A ready-to-use product card template with props-based API.
          This template provides a simplified interface for the ProductCard compound component,
          making it ideal for Storybook controls and rapid prototyping.

          Part of the templates layer in atomic design architecture.
        `,
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Templates/ProductCardTemplate",
}

export default meta
type Story = StoryObj<typeof ProductCardTemplate>

export const Default: Story = {
  args: {
    cartButtonText: "Add to Cart",
    image: {
      alt: premiumCottonTShirt,
      src: productImages.tshirt,
    },
    name: premiumCottonTShirt,
    price: "$29.99",
    showActions: true,
  },
}

export const Playground: Story = {
  args: {
    badges: [
      { children: "New", variant: "success" },
      { children: "Sale", variant: "danger" },
    ],
    cartButtonText: "Add to Cart",
    detailButtonText: "View Details",
    image: {
      alt: premiumCottonTShirt,
      src: productImages.tshirt,
    },
    layout: "column",
    name: premiumCottonTShirt,
    originalPrice: "$79.99",
    price: "$49.99",
    rating: {
      count: 5,
      reviewCount: 128,
      value: 4.5,
    },
    showActions: true,
    stock: {
      label: "Only 3 left in stock!",
      status: "limited-stock",
    },
    wishlistButtonText: "Add to Wishlist",
  },
  name: "🎮 Interactive Playground",
}

export const OnSale: Story = {
  args: {
    badges: [
      { children: "40% OFF", variant: "danger" },
      { children: "Limited Time", variant: "info" },
    ],
    image: {
      alt: "Running Shoes Pro",
      src: productImages.shoes,
    },
    name: "Running Shoes Pro",
    originalPrice: "$149.99",
    price: "$89.99",
    rating: {
      reviewCount: 542,
      value: 4.8,
    },
    showActions: true,
  },
}

export const OutOfStock: Story = {
  args: {
    badges: [{ children: "Collector Edition", variant: "secondary" }],
    cartButtonText: "Notify Me",
    image: {
      alt: "Vintage Camera",
      src: productImages.camera,
    },
    name: "Vintage Camera",
    price: "$1,299.99",
    rating: {
      reviewCount: 23,
      value: 5,
    },
    showActions: true,
    stock: {
      label: "Out of Stock",
      status: "out-of-stock",
    },
  },
}
