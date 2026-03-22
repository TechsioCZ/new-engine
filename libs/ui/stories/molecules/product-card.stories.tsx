import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import { VariantContainer, VariantGroup } from '../../.storybook/decorator'
import { Badge } from '../../src/atoms/badge'
import { Button } from '../../src/atoms/button'
import { NumericInput } from '../../src/atoms/numeric-input'
import { ProductCard } from '../../src/molecules/product-card'

// Sample product images for different scenarios
const productImages = {
  tshirt: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
  shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
  watch: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
  headphones:
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
  camera: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400',
  backpack: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
}

const meta: Meta<typeof ProductCard> = {
  title: 'Molecules/ProductCard',
  component: ProductCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A flexible e-commerce product display component using compound component pattern. Supports custom composition with images, pricing, badges, ratings, and actions.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    layout: {
      control: { type: 'select' },
      options: ['column', 'row'],
      description: 'Card layout orientation',
      table: { defaultValue: { summary: 'column' } },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Image options for select control
const imageOptions = Object.keys(productImages) as (keyof typeof productImages)[]

// Custom args type for Playground (compound component pattern)
interface PlaygroundArgs {
  layout: 'column' | 'row'
  productName: string
  price: string
  imageSrc: keyof typeof productImages
  showRating: boolean
  showStock: boolean
  showBadges: boolean
  rating: number
  stockStatus: 'in-stock' | 'limited-stock' | 'out-of-stock'
  stockText: string
  buttonVariant: 'cart' | 'detail' | 'wishlist'
  buttonText: string
}

// Playground with controls for interactive testing
export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: {
    // Layout
    layout: {
      control: 'select',
      options: ['column', 'row'],
      description: 'Card layout orientation',
      table: { defaultValue: { summary: 'column' }, category: 'Layout' },
    },

    // Content
    productName: {
      control: 'text',
      description: 'Product name',
      table: { category: 'Content' },
    },
    price: {
      control: 'text',
      description: 'Product price',
      table: { category: 'Content' },
    },
    imageSrc: {
      control: 'select',
      options: imageOptions,
      description: 'Product image',
      table: { category: 'Content' },
    },

    // Visibility
    showRating: {
      control: 'boolean',
      description: 'Show rating stars',
      table: { defaultValue: { summary: 'true' }, category: 'Visibility' },
    },
    showStock: {
      control: 'boolean',
      description: 'Show stock status',
      table: { defaultValue: { summary: 'true' }, category: 'Visibility' },
    },
    showBadges: {
      control: 'boolean',
      description: 'Show product badges',
      table: { defaultValue: { summary: 'false' }, category: 'Visibility' },
    },
    rating: {
      control: { type: 'number', min: 0, max: 5, step: 0.5 },
      description: 'Rating value (0-5)',
      table: { defaultValue: { summary: '4' }, category: 'Rating' },
    },
    stockStatus: {
      control: 'select',
      options: ['in-stock', 'limited-stock', 'out-of-stock'],
      description: 'Stock availability status',
      table: { defaultValue: { summary: 'in-stock' }, category: 'Stock' },
    },
    stockText: {
      control: 'text',
      description: 'Stock status text',
      table: { category: 'Stock' },
    },
    buttonVariant: {
      control: 'select',
      options: ['cart', 'detail', 'wishlist'],
      description: 'Primary button variant',
      table: { defaultValue: { summary: 'cart' }, category: 'Button' },
    },
    buttonText: {
      control: 'text',
      description: 'Button label text',
      table: { category: 'Button' },
    },
  },
  args: {
    layout: 'column',
    productName: 'Premium Cotton T-Shirt',
    price: '$29.99',
    imageSrc: 'tshirt',
    showRating: true,
    showStock: true,
    showBadges: false,
    rating: 4,
    stockStatus: 'in-stock',
    stockText: 'In Stock',
    buttonVariant: 'cart',
    buttonText: 'Add to Cart',
  },
  render: (args) => {
    const buttonIcons = {
      cart: 'token-icon-cart-button',
      detail: 'token-icon-detail-button',
      wishlist: 'token-icon-wishlist-button',
    } as const

    return (
      <ProductCard layout={args.layout} className={args.layout === 'row' ? 'w-lg' : ''}>
        <ProductCard.Image
          src={productImages[args.imageSrc]}
          alt={args.productName}
          className={args.layout === 'row' ? 'row-span-6' : ''}
        />
        {args.showBadges && (
          <ProductCard.Badges>
            <Badge variant="success">New</Badge>
            <Badge variant="danger">Sale</Badge>
          </ProductCard.Badges>
        )}
        <ProductCard.Name>{args.productName}</ProductCard.Name>
        {args.showRating && (
          <ProductCard.Rating rating={{ value: args.rating, readOnly: true }} />
        )}
        {args.showStock && (
          <ProductCard.Stock status={args.stockStatus}>
            {args.stockText}
          </ProductCard.Stock>
        )}
        <ProductCard.Price>{args.price}</ProductCard.Price>
        <ProductCard.Actions>
          <ProductCard.Button
            buttonVariant={args.buttonVariant}
            icon={buttonIcons[args.buttonVariant]}
          >
            {args.buttonText}
          </ProductCard.Button>
        </ProductCard.Actions>
      </ProductCard>
    )
  },
}

export const Badges: Story = {
  render: () => {
    const badges = [
      { variant: 'success' as const, label: 'New' },
      { variant: 'warning' as const, label: 'Limited Stock' },
      { variant: 'danger' as const, label: 'Sale' },
      { variant: 'info' as const, label: 'Eco friendly' },
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
        <ProductCard.Button buttonVariant="cart" icon="token-icon-cart-button">
          Add to Cart
        </ProductCard.Button>
      </ProductCard.Actions>
    </ProductCard>
    )
  },
}

export const BadgesWithCustomColors: Story = {
  name: 'Badges - Custom Colors',
  render: () => {
    return (
    <ProductCard>
      <ProductCard.Image
        src={productImages.shoes}
        alt="Running Shoes"
      />
      <ProductCard.Name>Limited Edition Running Shoes</ProductCard.Name>
      <ProductCard.Badges>
        <Badge variant="success">New Arrival</Badge>
        <Badge variant="dynamic" bgColor="#fff" fgColor="#000" borderColor="#eee">50% OFF</Badge>

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
          bgColor="transparent"
          fgColor="#fff"
          borderColor="#fff"
        >
          Exclusive
        </Badge>
      </ProductCard.Badges>
      <ProductCard.Price>$89.99</ProductCard.Price>
      <ProductCard.Stock status="limited-stock">Only 3 left!</ProductCard.Stock>
      <ProductCard.Actions>
        <ProductCard.Button buttonVariant="cart" icon="token-icon-cart-button">
          Add to Cart
        </ProductCard.Button>
      </ProductCard.Actions>
    </ProductCard>
    )
  },
}

export const StockStates: Story = {
  name: 'Stock Status Variants',
  render: () => (
    <VariantContainer>
      <VariantGroup title="In Stock">
        <ProductCard>
          <ProductCard.Image src={productImages.tshirt} alt="T-Shirt" />
          <ProductCard.Name>Cotton T-Shirt</ProductCard.Name>
          <ProductCard.Price>$24.99</ProductCard.Price>
          <ProductCard.Stock status="in-stock">In Stock</ProductCard.Stock>
          <ProductCard.Actions>
            <ProductCard.Button
              buttonVariant="cart"
              icon="token-icon-cart-button"
            >
              Add to Cart
            </ProductCard.Button>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>

      <VariantGroup title="Limited Stock">
        <ProductCard>
          <ProductCard.Image src={productImages.shoes} alt="Running Shoes" />
          <ProductCard.Name>Running Shoes</ProductCard.Name>
          <ProductCard.Price>$89.99</ProductCard.Price>
          <ProductCard.Stock status="limited-stock">Only 3 left in stock</ProductCard.Stock>
          <ProductCard.Actions>
            <ProductCard.Button
              buttonVariant="cart"
              icon="token-icon-cart-button"
            >
              Add to Cart
            </ProductCard.Button>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>

      <VariantGroup title="Out of Stock">
        <ProductCard>
          <ProductCard.Image src={productImages.watch} alt="Luxury Watch" />
          <ProductCard.Name>Luxury Watch</ProductCard.Name>
          <ProductCard.Price>$499.99</ProductCard.Price>
          <ProductCard.Stock status="out-of-stock">Out of Stock - Notify When Available</ProductCard.Stock>
          <ProductCard.Actions>
            <ProductCard.Button
              buttonVariant="detail"
              icon="token-icon-detail-button"
            >
              Notify Me
            </ProductCard.Button>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const AllButtonVariants: Story = {
  name: 'Button Variants',
  render: () => (
    <VariantContainer>
      <VariantGroup title="Cart Button">
        <ProductCard>
          <ProductCard.Image src={productImages.shoes} alt="Running Shoes" />
          <ProductCard.Name>Running Shoes</ProductCard.Name>
          <ProductCard.Price>$89.99</ProductCard.Price>
          <ProductCard.Actions>
            <ProductCard.Button
              buttonVariant="cart"
              icon="token-icon-cart-button"
              onClick={fn()}
            >
              Add to Cart
            </ProductCard.Button>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>

      <VariantGroup title="Detail Button">
        <ProductCard>
          <ProductCard.Image src={productImages.watch} alt="Luxury Watch" />
          <ProductCard.Name>Luxury Watch</ProductCard.Name>
          <ProductCard.Price>$499.99</ProductCard.Price>
          <ProductCard.Actions>
            <ProductCard.Button
              buttonVariant="detail"
              icon="token-icon-detail-button"
              onClick={fn()}
            >
              View Details
            </ProductCard.Button>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>

      <VariantGroup title="Wishlist Button">
        <ProductCard>
          <ProductCard.Image src={productImages.headphones} alt="Headphones" />
          <ProductCard.Name>Wireless Headphones</ProductCard.Name>
          <ProductCard.Price>$199.99</ProductCard.Price>
          <ProductCard.Actions>
            <ProductCard.Button
              buttonVariant="wishlist"
              icon="token-icon-wishlist-button"
              onClick={fn()}
            >
              Save to Wishlist
            </ProductCard.Button>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>

      <VariantGroup title="Custom Button">
        <ProductCard>
          <ProductCard.Image src={productImages.camera} alt="Camera" />
          <ProductCard.Name>Professional Camera</ProductCard.Name>
          <ProductCard.Price>$1,299.99</ProductCard.Price>
          <ProductCard.Actions>
            <ProductCard.Button
              buttonVariant="custom"
              icon="token-icon-share"
              onClick={fn()}
              className="bg-accent text-accent-fg hover:bg-accent-hover"
            >
              Share Product
            </ProductCard.Button>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const LayoutVariants: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Column Layout (Default)">
        <ProductCard layout="column">
          <ProductCard.Image src={productImages.tshirt} alt="T-Shirt" />
          <ProductCard.Name>Cotton T-Shirt</ProductCard.Name>
          <ProductCard.Rating rating={{defaultValue: 4}} />
          <ProductCard.Stock status="in-stock">In Stock</ProductCard.Stock>
          <ProductCard.Price>$24.99</ProductCard.Price>
          <ProductCard.Actions>
            <ProductCard.Button
              buttonVariant="cart"
              icon="token-icon-cart-button"
            >
              Add to Cart
            </ProductCard.Button>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>

      <VariantGroup title="Row Layout">
        <ProductCard layout="row" className="w-lg">
          <ProductCard.Image
            src={productImages.shoes}
            alt="Shoes"
            className="row-span-6"
          />
          <ProductCard.Name>Running Shoes</ProductCard.Name>
          <ProductCard.Rating rating={{defaultValue: 5}} />
          <ProductCard.Stock status="limited-stock">Limited Stock</ProductCard.Stock>
          <ProductCard.Price>$89.99</ProductCard.Price>
          <ProductCard.Actions>
            <ProductCard.Button
              buttonVariant="cart"
              icon="token-icon-cart-button"
            >
              Add to Cart
            </ProductCard.Button>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const CustomComposition: Story = {
  render: () => (
    <ProductCard>
      <ProductCard.Image src={productImages.camera} alt="DSLR Camera" />

      <div className="mb-100 flex gap-100">
        <Badge variant="info">-30%</Badge>
        <Badge variant="success">Free Shipping</Badge>
      </div>

      <ProductCard.Name>Professional DSLR Camera</ProductCard.Name>

      <div className="flex items-baseline gap-100">
        <span className="text-100 text-fg-primary line-through">$1,899</span>
        <ProductCard.Price>$1,329</ProductCard.Price>
      </div>

      <div className="flex items-center gap-100">
        <ProductCard.Rating rating={{defaultValue: 4.5}} />
        <span className="text-100 text-fg-muted">(245 reviews)</span>
      </div>

      <ProductCard.Stock status="limited-stock">Only 3 left in stock</ProductCard.Stock>

      <ProductCard.Actions>
        <div className="flex w-full gap-200">
          <ProductCard.Button
            buttonVariant="cart"
            icon="token-icon-cart-button"
            className="flex-1"
          >
            Buy Now
          </ProductCard.Button>
          <ProductCard.Button
            buttonVariant="detail"
            icon="token-icon-detail-button"
          >
            Details
          </ProductCard.Button>
        </div>
      </ProductCard.Actions>
    </ProductCard>
  ),
}

export const WithQuantityInput: Story = {
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
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </NumericInput>
        <ProductCard.Button
          buttonVariant="cart"
          icon="token-icon-cart-button"
          onClick={fn()}
          className="flex-1"
        >
          Add to Cart
        </ProductCard.Button>
        <ProductCard.Button
          buttonVariant="wishlist"
          icon="token-icon-wishlist-button"
          onClick={fn()}
          className="w-full"
        >
          Save for Later
        </ProductCard.Button>
      </ProductCard.Actions>
    </ProductCard>
  ),
}

export const MinimalCard: Story = {
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
  render: () => (
    <ProductCard className="w-md">
      <div className="relative">
        <ProductCard.Image src={productImages.camera} alt="Camera Kit" className="w-full"/>
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
        <ProductCard.Rating rating={{ defaultValue: 4.9 }} />
        <span className="text-50 text-fg-muted">(512 reviews)</span>
      </div>

      <div className="mb-200 flex flex-col gap-100">
        <div className="flex items-baseline gap-100">
          <span className="text-fg-muted line-through">$3,499</span>
          <ProductCard.Price>$2,449</ProductCard.Price>
          <Badge variant="danger">
            Save $1,050
          </Badge>
        </div>
        <span className="text-50 text-success-fg">Free shipping included</span>
      </div>

      <ProductCard.Stock status="limited-stock">Only 2 units left - Order soon!</ProductCard.Stock>

      <ProductCard.Actions>
        <div className="mb-100 flex items-center gap-100">
          <NumericInput id="product-quantity" defaultValue={1} min={1} max={10}>
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </NumericInput>
          <ProductCard.Button
            buttonVariant="cart"
            icon="token-icon-cart-button"
            onClick={fn()}
            className="flex-1"
          >
            Add to Cart
          </ProductCard.Button>
        </div>

        <div className="grid grid-cols-2 gap-100">
          <ProductCard.Button
            buttonVariant="detail"
            icon="token-icon-detail-button"
            onClick={fn()}
          >
            Quick View
          </ProductCard.Button>
          <ProductCard.Button
            buttonVariant="wishlist"
            icon="token-icon-wishlist-button"
            onClick={fn()}
          >
            Wishlist
          </ProductCard.Button>
        </div>

        <Button
          variant="secondary"
          theme="borderless"
          size="sm"
          className="mt-100 w-full"
          onClick={fn()}
        >
          Compare with similar items
        </Button>
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
  name: 'Action Button Layouts',
  render: () => (
    <VariantContainer>
      <VariantGroup title="Horizontal Actions">
        <ProductCard>
          <ProductCard.Image src={productImages.shoes} alt="Shoes" />
          <ProductCard.Name>Running Shoes</ProductCard.Name>
          <ProductCard.Price>$89.99</ProductCard.Price>
          <ProductCard.Actions>
            <div className="flex gap-100">
              <ProductCard.Button
                buttonVariant="cart"
                icon="token-icon-cart-button"
              >
                Cart
              </ProductCard.Button>
              <ProductCard.Button
                buttonVariant="detail"
                icon="token-icon-detail-button"
              >
                View
              </ProductCard.Button>
              <ProductCard.Button
                buttonVariant="wishlist"
                icon="token-icon-wishlist-button"
              >
                Save
              </ProductCard.Button>
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
              <ProductCard.Button
                buttonVariant="cart"
                icon="token-icon-cart-button"
                className="w-full"
              >
                Add to Cart
              </ProductCard.Button>
              <ProductCard.Button
                buttonVariant="detail"
                icon="token-icon-detail-button"
                className="w-full"
              >
                View Details
              </ProductCard.Button>
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
            <ProductCard.Button
              buttonVariant="cart"
              icon="token-icon-cart-button"
              className="mb-100 w-full"
            >
              Add to Cart
            </ProductCard.Button>
            <div className="flex gap-100">
              <ProductCard.Button
                buttonVariant="detail"
                icon="token-icon-detail-button"
                className="flex-1"
              >
                Details
              </ProductCard.Button>
              <ProductCard.Button
                buttonVariant="wishlist"
                icon="token-icon-wishlist-button"
                className="flex-1"
              >
                Wishlist
              </ProductCard.Button>
            </div>
          </ProductCard.Actions>
        </ProductCard>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const CustomRowSpan: Story = {
  name: 'Custom Row Span Override',
  render: () => (
    <ProductCard layout="row" className="w-lg grid-rows-[auto, auto, auto]">
    <div className='row-span-3'>
    <ProductCard.Name>Professional Camera</ProductCard.Name>
      <ProductCard.Image
        src={productImages.camera}
        alt="Camera"
        className="h-fit row-span-2"
      />
      </div>
      <div className="col-2 row-3 place-self-end">
      <ProductCard.Price>$1,299.99</ProductCard.Price>
      <ProductCard.Rating rating={{ defaultValue: 4.5 }} />
      <ProductCard.Actions>
        <ProductCard.Button
          buttonVariant="cart"
          icon="token-icon-cart-button"
        >
          Add to Cart
        </ProductCard.Button>
      </ProductCard.Actions></div>
    </ProductCard>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates simple className override - changing row-span-6 to row-span-3 and aspect-auto to aspect-video.',
      },
    },
  },
}

export const CustomGridLayout: Story = {
  name: 'Custom Grid Structure',
  render: () => (
    <ProductCard layout="row" className="w-xl grid-cols-[auto_1fr]">
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
        <ProductCard.Rating rating={{ defaultValue: 4.9 }} />
        <ProductCard.Stock status="limited-stock">
          Only 5 left in stock!
        </ProductCard.Stock>
        <ProductCard.Actions>
          <ProductCard.Button
            buttonVariant="cart"
            icon="token-icon-cart-button"
          >
            Add to Cart
          </ProductCard.Button>
          <ProductCard.Button
            buttonVariant="wishlist"
            icon="token-icon-wishlist-button"
          >
            Wishlist
          </ProductCard.Button>
        </ProductCard.Actions>
      </div>
    </ProductCard>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates complex layout override - custom grid with Title + Image in first column, all other content in second column. Uses grid-cols-[400px_1fr] to create asymmetric layout.',
      },
    },
  },
}
