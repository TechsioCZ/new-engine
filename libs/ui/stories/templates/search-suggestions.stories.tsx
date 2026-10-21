import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
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
  parameters: {
    controls: { include: ["label", "placeholder", "size", "disabled", "readOnly", "clearable", "loading", "loadingMessage", "noResultsMessage", "retryLabel"] },
    layout: "padded",
    docs: {
      description: {
        component:
          "Search a catalog with grouped, rich suggestions that navigate to products, categories or articles. Use this for live search navigation; use SearchForm for explicit query submission, Combobox for selecting form values, or Command for app actions. Queries support sm/md/lg sizing, linked validation and focusable, copyable read-only states. Demo navigation is intercepted so Storybook stays on the page.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-sm">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    id: { control: false, table: { disable: true } },
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
    allResultsLink: (
      <Link href="#all-results" onClick={(event) => event.preventDefault()}>
        View all results
      </Link>
    ),
  },
} satisfies Meta<typeof SearchSuggestions<ProductDetails>>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Type a catalog query and explore sizes, state and result controls without navigating away.",
      },
    },
  },
}

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Small, medium and large use identical catalog copy and rich results to show the canonical scale.",
      },
    },
  },
  render: (args) => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size) => (
        <VariantGroup
          key={size}
          title={
            { sm: "Small (sm)", md: "Medium (md)", lg: "Large (lg)" }[size]
          }
          fullWidth
        >
          <SearchSuggestions {...args} label="Search catalog" size={size} />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Disabled search is unavailable while read-only search keeps a focusable, immutable query.",
      },
    },
  },
  render: (args) => (
    <VariantContainer>
      <VariantGroup title="Disabled" fullWidth>
        <SearchSuggestions {...args} disabled label="Disabled search" />
      </VariantGroup>
      <VariantGroup title="Read-only" fullWidth>
        <SearchSuggestions
          {...args}
          inputValue="trainers"
          label="Read-only search"
          readOnly
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const GroupedResults: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Product and category headings make rich navigation suggestions easy to scan.",
      },
    },
  },
  args: { defaultOpen: true },
}

export const WithoutGroupLabels: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Suggestions may omit headings without leaving a dangling accessible group name.",
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story:
          "A loading message replaces stale suggestions while fresh search results are pending.",
      },
    },
  },
  args: {
    defaultOpen: true,
    loading: true,
    loadingMessage: "Searching catalog...",
  },
}

export const Empty: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A specific no-results message helps users revise a query that matched no products.",
      },
    },
  },
  args: {
    defaultOpen: true,
    inputValue: "missing",
    groups: [],
    noResultsMessage: "No matching products",
  },
}

export const ErrorWithRetry: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Search failures remain visible with a local retry action that restores the results.",
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story:
          "Rich result rows stay usable in a narrow catalog search surface.",
      },
    },
  },
  args: { defaultOpen: true },
  render: (args) => (
    <div className="w-xs max-w-full">
      <SearchSuggestions {...args} />
    </div>
  ),
}

export const InDialog: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Inline search suggestions preserve modal focus containment and dismiss before their parent dialog.",
      },
    },
  },
  render: (args) => (
    <Dialog title="Search catalog" triggerText="Open search">
      <SearchSuggestions {...args} />
    </Dialog>
  ),
}

export const Disabled: Story = {
  args: {
    disabled: true,
    inputValue: "trainers",
    helpText: "Search is unavailable while the catalog is updating.",
  },
  parameters: {
    docs: {
      description: {
        story:
          "An unavailable query and its actions are removed from the keyboard tab order.",
      },
    },
  },
}

export const ReadOnly: Story = {
  name: "Read-only",
  args: {
    readOnly: true,
    inputValue: "trainers",
    defaultOpen: true,
    helpText: "This saved query cannot be changed.",
  },
  parameters: {
    docs: {
      description: {
        story:
          "A saved query stays focusable and copyable without opening suggestions or showing clear and dropdown actions.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("combobox", { name: "Search catalog" })
    await userEvent.click(input)
    await userEvent.keyboard("{ArrowDown}{Backspace}x")
    await expect(input).toHaveValue("trainers")
    await expect(input).toHaveAttribute("aria-expanded", "false")
    await expect(input).not.toBeDisabled()
    await expect(
      canvas.queryByRole("button", { name: /Clear|Toggle/ })
    ).toBeNull()
  },
}

export const Validation: Story = {
  args: {
    validateStatus: "error",
    helpText: "Enter a product name or reference to search.",
  },
  parameters: {
    docs: {
      description: {
        story:
          "A linked inline validation message includes its error icon and preserves the catalog search label.",
      },
    },
  },
}
