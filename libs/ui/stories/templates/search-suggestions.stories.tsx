import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Image } from "../../src/atoms/image"
import { Link } from "../../src/atoms/link"
import { Dialog } from "../../src/molecules/dialog"
import {
  SearchSuggestions,
  searchSuggestionsResultVariants,
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

const resultStyles = searchSuggestionsResultVariants()
const resultSlot: SearchSuggestionsProps<ProductDetails>["resultSlot"] = (
  item
) => (
  <span className={resultStyles.row()}>
    {item.data?.image && (
      <Image
        alt=""
        className={resultStyles.image()}
        size="sm"
        src={item.data.image}
      />
    )}
    <span className={resultStyles.body()}>
      <span className={resultStyles.title()}>{item.label}</span>
      <span className={resultStyles.subtitle()}>{item.data?.subtitle}</span>
    </span>
    {item.data?.price && (
      <span className={resultStyles.price()}>{item.data.price}</span>
    )}
  </span>
)

// Keep JSX out of initial args: shared Controls curation hides inferred JSX rows.
// The decorator supplies the rich default without erasing the public API row.
const allResultsLink = (
  <Link
    href="#all-results"
    onClick={(event) => event.preventDefault()}
    size="current"
  >
    View all results
  </Link>
)

const meta = {
  title: "Templates/SearchSuggestions",
  component: SearchSuggestions<ProductDetails>,
  tags: ["autodocs"],
  parameters: {
    controls: {
      include: [
        "label",
        "placeholder",
        "size",
        "disabled",
        "readOnly",
        "clearable",
        "loading",
        "loadingMessage",
        "noResultsMessage",
        "retryLabel",
        "inputValue",
        "defaultInputValue",
        "onInputValueChange",
        "filterBehavior",
        "groups",
        "resultSlot",
        "allResultsLink",
        "navigate",
      ],
    },
    layout: "fullscreen",
    docs: {
      description: {
        component: `Search a catalog with grouped, rich suggestions that navigate to products, categories or articles. Use this for live search navigation; use SearchForm for explicit query submission, Combobox for selecting form values, or Command for app actions. Queries support sm/md/lg sizing, linked validation and focusable, copyable read-only states. Demo navigation is intercepted so Storybook stays on the page.

## Integration contract

- **Query ownership:** control \`inputValue\` with \`onInputValueChange(nextQuery)\`, or use \`defaultInputValue\` for an uncontrolled query. The application owns query state, request debounce, fetching, cancellation and stale-response handling.
- **Filtering:** \`filterBehavior="external"\` is the default. Replace \`groups\` with application-filtered results; the template does not fetch or filter them in this mode. Opt into \`"local"\` only for a complete in-memory collection.
- **Groups and identity:** each group needs a unique \`id\`, an optional visible \`label\` and \`items\`. Every item needs a globally unique \`value\` across all groups, a text \`label\` and an application-built \`href\`; optional \`data\` supplies presentation details.
- **Rich rows:** \`resultSlot(item)\` renders noninteractive content only. The option already owns its anchor and accessible label; do not nest links, buttons or inputs.
- **Full results:** \`allResultsLink\` is a separate footer node, not a suggestion. Build its query-specific URL and link label in the application, and handle full-query submission there rather than assuming Enter on unselected text navigates.
- **Navigation:** \`navigate({ href, node, value })\` owns routing for Enter on a result or an unmodified result click. Without it, anchors navigate natively; modified clicks retain browser behavior. Highlighting never navigates. Routing, analytics and full-results navigation stay application-owned.
`,
      },
    },
  },
  decorators: [
    (Story, { args }) => (
      <div
        className={
          args.defaultOpen && !args.readOnly
            ? "min-h-screen w-full min-w-0 p-200"
            : "w-full min-w-0 p-200"
        }
      >
        <div className="mx-auto w-full max-w-sm">
          <Story
            args={{
              ...args,
              allResultsLink: args.allResultsLink ?? allResultsLink,
            }}
          />
        </div>
      </div>
    ),
  ],
  argTypes: {
    inputValue: {
      control: false,
      description:
        "Controlled query owned by the application. Pair with onInputValueChange and replace groups with current results; the Playground owns this state locally.",
    },
    defaultInputValue: {
      control: false,
      description:
        "Initial query for uncontrolled use. Do not combine with a controlled inputValue.",
    },
    onInputValueChange: {
      control: false,
      description:
        "Receives the next query string. Update controlled inputValue and run application-side filtering or debounced fetching; this callback does not fetch results itself.",
    },
    filterBehavior: {
      control: false,
      description:
        "Defaults to external: the application supplies already-filtered groups. Choose local only when the complete in-memory collection should be filtered by the component.",
    },
    id: { control: false, table: { disable: true } },
    label: { control: "text" },
    placeholder: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    disabled: { control: "boolean" },
    readOnly: {
      description:
        "Keep the saved query focusable and copyable without opening or editing suggestions.",
      control: "boolean",
    },
    clearable: {
      description:
        "Show a clear-query action when the query is nonempty (default true).",
      control: "boolean",
    },
    loading: {
      description:
        "Show a loading announcement instead of selectable results. The application owns fetching.",
      control: "boolean",
    },
    loadingMessage: { control: "text" },
    noResultsMessage: {
      description:
        "Empty-state copy; {inputValue} is replaced by the current query.",
      control: "text",
    },
    retryLabel: { control: "text" },
    groups: {
      control: false,
      description:
        "Application-provided result groups with unique ids and optional headings. Each item needs a globally unique value across all groups, a label and an href; replace groups when external results change.",
    },
    resultSlot: {
      control: false,
      description:
        "Render noninteractive presentation for a result using its optional data. The option already supplies the anchor and accessible label; never nest links, buttons or inputs.",
    },
    allResultsLink: {
      control: false,
      description:
        "Optional footer node for a query-specific full-results link. The application builds the URL, label and navigation; it is separate from selectable suggestions.",
    },
    navigate: {
      control: false,
      description:
        "Application routing callback receiving { href, node, value } for Enter on a result or an unmodified click. Without it, anchors navigate natively; modified clicks keep browser behavior.",
    },
  },
  args: {
    groups,
    label: "Search catalog",
    placeholder: "Search catalog",
    resultSlot,
    navigate: fn(),
    onInputValueChange: fn(),
  },
} satisfies Meta<typeof SearchSuggestions<ProductDetails>>

export default meta
type Story = StoryObj<typeof meta>

// Locator captures include the canvas, not Storybook's external layout padding.
// Keep the complete control outline inside that canvas even after keyboard use.
const checkControlFraming = async (canvasElement: HTMLElement) => {
  const controls = canvasElement.querySelectorAll<HTMLElement>(
    '[data-scope="combobox"][data-part="control"]'
  )
  await expect(controls.length).toBeGreaterThan(0)
  for (const control of controls) {
    const root = canvasElement.getBoundingClientRect()
    const box = control.getBoundingClientRect()
    const style = getComputedStyle(control)
    const outline = Math.max(
      0,
      Number.parseFloat(style.outlineWidth) +
        Number.parseFloat(style.outlineOffset)
    )
    await expect(box.left - outline).toBeGreaterThan(root.left)
    await expect(box.right + outline).toBeLessThan(root.right)
    await expect(box.bottom + outline).toBeLessThan(root.bottom)
  }
}

const checkOpenSuggestions = (text: string): NonNullable<Story["play"]> =>
  async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await checkControlFraming(canvasElement)
    await expect(canvas.getByRole("combobox", { name: "Search catalog" })).toHaveAttribute("aria-expanded", "true")
    // Presence precedes visibility while the popup's opening transition runs.
    await waitFor(() =>
      expect(body.getByText(text, { exact: true })).toBeVisible()
    )
    const panel = canvasElement.querySelector('[data-scope="combobox"][data-part="content"]')
    if (!panel) throw new Error("Missing search suggestions panel")
    await waitFor(() => {
      const root = canvasElement.getBoundingClientRect()
      const popup = panel.getBoundingClientRect()
      expect(popup.bottom).toBeLessThanOrEqual(root.bottom)
      expect(popup.right).toBeLessThanOrEqual(root.right)
    })
  }

function FilteredCatalog(args: SearchSuggestionsProps<ProductDetails>) {
  const [query, setQuery] = useState("")
  const filteredGroups = args.groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      ),
    }))
    .filter((group) => group.items.length > 0)
  return (
    <SearchSuggestions
      {...args}
      groups={filteredGroups}
      inputValue={query}
      filterBehavior="external"
      onInputValueChange={(nextQuery) => {
        setQuery(nextQuery)
        args.onInputValueChange?.(nextQuery)
      }}
      allResultsLink={filteredGroups.length ? args.allResultsLink : undefined}
    />
  )
}

export const Playground: Story = {
  render: (args) => <FilteredCatalog {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          "Type to filter catalog suggestions; this demo simulates application-owned external filtering. Production apps own fetching, debounce and result updates. Navigation stays inside Storybook.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const input = canvas.getByRole("combobox", { name: "Search catalog" })
    await userEvent.type(input, "zzzzunknown")
    await waitFor(() => expect(body.queryAllByRole("option")).toHaveLength(0))
    await expect(
      body.getByText('No results found for "zzzzunknown"')
    ).toBeVisible()
    await userEvent.clear(input)
    await userEvent.type(input, "Footwear")
    await waitFor(() => expect(body.getAllByRole("option")).toHaveLength(1))
    await expect(body.getByRole("option", { name: "Footwear" })).toBeVisible()
    await userEvent.clear(input)
    await waitFor(() => expect(body.getAllByRole("option")).toHaveLength(3))
    await userEvent.keyboard("{Escape}")
    await checkControlFraming(canvasElement)
  },
}

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Small, medium and large use identical catalog copy and rich results to show the canonical scale. Each fixture reserves room for its open suggestions.",
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
          <div className="search-suggestions-preview-room">
            <SearchSuggestions {...args} label="Search catalog" size={size} />
          </div>
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
  play: async (context) => {
    await checkOpenSuggestions("Everyday trainers")(context)
    const body = within(context.canvasElement.ownerDocument.body)
    const title = body.getByText("Everyday trainers", { exact: true })
    const subtitle = body.getByText("In stock", { exact: true })
    await expect(
      Number.parseFloat(getComputedStyle(subtitle).fontSize)
    ).toBeLessThan(Number.parseFloat(getComputedStyle(title).fontSize))
  },
}

export const WithoutGroupLabels: Story = {
  play: checkOpenSuggestions("Footwear"),
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
  play: checkOpenSuggestions("Searching catalog..."),
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
  play: checkOpenSuggestions("No matching products"),
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
  play: checkOpenSuggestions("Search is temporarily unavailable"),
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
  play: checkOpenSuggestions("Everyday trainers"),
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
          "A top-aligned search dialog leaves room below the query for results while preserving modal focus containment and dismissing suggestions before their parent dialog.",
      },
    },
  },
  render: (args) => (
    <Dialog
      className="self-start"
      title="Search catalog"
      triggerText="Open search"
    >
      <div className="search-suggestions-preview-room">
        <SearchSuggestions {...args} />
      </div>
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
