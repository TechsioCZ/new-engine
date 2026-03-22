import type { Meta, StoryObj } from '@storybook/react'
import { ProductCardTemplate } from '../../src/templates/product-card'

const productImages = {
  tshirt: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
  shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
  watch: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
  headphones:
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
  camera: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400',
  backpack: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
}

const meta: Meta<typeof ProductCardTemplate> = {
  title: 'Templates/ProductCardTemplate',
  component: ProductCardTemplate,
  parameters: {
    layout: 'centered',
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
  },
  tags: ['autodocs'],
  argTypes: {
    layout: {
      control: 'select',
      options: ['column', 'row'],
      description: 'Card layout orientation',
      table: {
        category: 'Layout',
      },
    },
    name: {
      control: 'text',
      description: 'Product name',
      table: {
        category: 'Content',
      },
    },
    price: {
      control: 'text',
      description: 'Current price',
      table: {
        category: 'Content',
      },
    },
    originalPrice: {
      control: 'text',
      description: 'Original price (for sale items)',
      table: {
        category: 'Content',
      },
    },
    image: {
      control: 'object',
      description: 'Product image with src and alt',
      table: {
        category: 'Content',
      },
    },
    badges: {
      control: 'object',
      description: 'Array of badge configurations',
      table: {
        category: 'Content',
      },
    },
    rating: {
      control: 'object',
      description: 'Rating configuration (value, count, reviewCount)',
      table: {
        category: 'Rating',
      },
    },
    stock: {
      control: 'object',
      description: 'Stock status and label',
      table: {
        category: 'Stock',
      },
    },
    showActions: {
      control: 'boolean',
      description: 'Show action buttons',
      table: {
        category: 'Actions',
      },
    },
    cartButtonText: {
      control: 'text',
      description: 'Add to cart button text',
      table: {
        category: 'Actions',
      },
    },
    detailButtonText: {
      control: 'text',
      description: 'View details button text',
      table: {
        category: 'Actions',
      },
    },
    wishlistButtonText: {
      control: 'text',
      description: 'Wishlist button text',
      table: {
        category: 'Actions',
      },
    },
    onAddToCart: {
      action: 'add-to-cart',
      table: {
        category: 'Actions',
      },
    },
    onViewDetails: {
      action: 'view-details',
      table: {
        category: 'Actions',
      },
    },
    onAddToWishlist: {
      action: 'add-to-wishlist',
      table: {
        category: 'Actions',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ProductCardTemplate>

export const Default: Story = {
  args: {
    name: 'Premium Cotton T-Shirt',
    price: '$29.99',
    image: {
      src: productImages.tshirt,
      alt: 'Premium Cotton T-Shirt',
    },
    showActions: true,
    cartButtonText: 'Add to Cart',
  },
}

export const Playground: Story = {
  name: '🎮 Interactive Playground',
  args: {
    name: 'Premium Cotton T-Shirt',
    price: '$49.99',
    originalPrice: '$79.99',
    image: {
      src: productImages.tshirt,
      alt: 'Premium Cotton T-Shirt',
    },
    badges: [
      { variant: 'success', children: 'New' },
      { variant: 'danger', children: 'Sale' },
    ],
    rating: {
      value: 4.5,
      count: 5,
      reviewCount: 128,
    },
    stock: {
      status: 'limited-stock',
      label: 'Only 3 left in stock!',
    },
    showActions: true,
    cartButtonText: 'Add to Cart',
    detailButtonText: 'View Details',
    wishlistButtonText: 'Add to Wishlist',
    layout: 'column',
  },
}

export const OnSale: Story = {
  args: {
    name: 'Running Shoes Pro',
    price: '$89.99',
    originalPrice: '$149.99',
    image: {
      src: productImages.shoes,
      alt: 'Running Shoes Pro',
    },
    badges: [
      { variant: 'danger', children: '40% OFF' },
      { variant: 'info', children: 'Limited Time' },
    ],
    rating: {
      value: 4.8,
      reviewCount: 542,
    },
    showActions: true,
  },
}

export const OutOfStock: Story = {
  args: {
    name: 'Vintage Camera',
    price: '$1,299.99',
    image: {
      src: productImages.camera,
      alt: 'Vintage Camera',
    },
    badges: [
      { variant: 'secondary', children: 'Collector Edition' },
    ],
    rating: {
      value: 5,
      reviewCount: 23,
    },
    stock: {
      status: 'out-of-stock',
      label: 'Out of Stock',
    },
    showActions: true,
    cartButtonText: 'Notify Me',
  },
}
