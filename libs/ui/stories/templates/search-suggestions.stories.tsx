import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { fn } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Image } from "../../src/atoms/image"
import { Link } from "../../src/atoms/link"
import { Dialog } from "../../src/molecules/dialog"
import {
  SearchSuggestions,
  type SearchSuggestionGroup,
  type SearchSuggestionsProps,
} from "../../src/templates/search-suggestions"

type ProductDetails = { image?: string; subtitle: string; price?: string }
const productImage = new URL(
  "../../assets/gallery/shoes-1.avif",
  import.meta.url
).href
const groups: SearchSuggestionGroup<ProductDetails>[] = [
  {
    id: "products",
    label: "Products",
    items: [
      {
        value: "trainer",
        label: "Everyday trainers",
        href: "#product-trainer",
        data: { image: productImage, subtitle: "In stock", price: "$89" },
      },
      {
        value: "unavailable",
        label: "Limited edition trainers",
        href: "#product-unavailable",
        disabled: true,
        data: { subtitle: "Unavailable", price: "$129" },
      },
    ],
  },
  {
    id: "categories",
    label: "Categories",
    items: [
      {
        value: "footwear",
        label: "Footwear",
        href: "#category-footwear",
        data: { subtitle: "Browse the collection" },
      },
    ],
  },
]

const resultSlot: SearchSuggestionsProps<ProductDetails>["resultSlot"] = (
  item
) => (
  <span className="flex min-w-0 flex-1 items-center gap-150">
    {item.data?.image && (
      <Image
        alt=""
        className="shrink-0 object-cover"
        size="sm"
        src={item.data.image}
      />
    )}
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate">{item.label}</span>
      <span className="text-(length:--text-base)">{item.data?.subtitle}</span>
    </span>
    {item.data?.price && <span className="shrink-0">{item.data.price}</span>}
  </span>
)

const meta = {
  title: "Templates/SearchSuggestions",
  component: SearchSuggestions<ProductDetails>,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-sm">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    clearable: { control: "boolean" },
    loading: { control: "boolean" },
    loadingMessage: { control: "text" },
    noResultsMessage: { control: "text" },
    retryLabel: { control: "text" },
    groups: { control: false },
    resultSlot: { control: false },
    allResultsLink: { control: false },
    navigate: { control: false },
  },
  args: {
    groups,
    label: "Search catalog",
    placeholder: "Search products and categories",
    resultSlot,
    navigate: fn(),
    onInputValueChange: fn(),
    allResultsLink: <Link href="#all-results">View all results</Link>,
  },
} satisfies Meta<typeof SearchSuggestions<ProductDetails>>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size) => (
        <VariantGroup key={size} title={size} fullWidth>
          <SearchSuggestions {...args} label={`Search (${size})`} size={size} />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}

export const States: Story = {
  render: (args) => (
    <VariantContainer>
      <VariantGroup title="Disabled" fullWidth>
        <SearchSuggestions {...args} disabled label="Disabled search" />
      </VariantGroup>
      <VariantGroup title="Read only" fullWidth>
        <SearchSuggestions
          {...args}
          inputValue="trainers"
          label="Read only search"
          readOnly
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const GroupedResults: Story = {
  args: { defaultOpen: true, navigate: undefined },
}

export const WithoutGroupLabels: Story = {
  args: {
    defaultOpen: true,
    groups: [
      {
        id: "suggestions",
        items: [
          { value: "footwear", label: "Footwear", href: "#category-footwear" },
        ],
      },
    ],
  },
}

export const Loading: Story = {
  args: {
    defaultOpen: true,
    loading: true,
    loadingMessage: "Searching catalog...",
  },
}

export const Empty: Story = {
  args: {
    defaultOpen: true,
    inputValue: "missing",
    groups: [],
    noResultsMessage: "No matching products",
  },
}

export const ErrorWithRetry: Story = {
  args: { defaultOpen: true, onRetry: fn() },
  render: function ErrorRetryStory(args) {
    const [failed, setFailed] = useState(true)
    return (
      <SearchSuggestions
        {...args}
        error={failed ? "Search is temporarily unavailable" : undefined}
        onRetry={() => {
          args.onRetry?.()
          setFailed(false)
        }}
        retryLabel="Try again"
      />
    )
  },
}

export const NarrowLayout: Story = {
  args: { defaultOpen: true },
  render: (args) => (
    <div className="w-xs max-w-full">
      <SearchSuggestions {...args} />
    </div>
  ),
}

export const InDialog: Story = {
  render: (args) => (
    <Dialog title="Search catalog" triggerText="Open search">
      <SearchSuggestions {...args} />
    </Dialog>
  ),
}
