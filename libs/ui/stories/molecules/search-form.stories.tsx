import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { StatusText } from "../../src/atoms/status-text"
import {
  SearchForm,
  type SearchFormProps,
} from "../../src/molecules/search-form"

function ProductSearch(args: SearchFormProps) {
  return (
    <SearchForm key={args.defaultValue} {...args}>
      <SearchForm.Label>Search products</SearchForm.Label>
      <SearchForm.Control>
        <SearchForm.Input
          name="query"
          placeholder="Search tools and accessories"
        />
        <SearchForm.ClearButton />
        <SearchForm.Button>Search</SearchForm.Button>
      </SearchForm.Control>
      <SearchForm.StatusText status={args.validateStatus}>
        {" "}
        {args.validateStatus === "error"
          ? "Enter a product name or reference to search."
          : args.validateStatus === "warning"
            ? "Some products may not appear while the catalog updates."
            : args.validateStatus === "success"
              ? "Search results are up to date."
              : "Search by product name or reference."}
      </SearchForm.StatusText>
    </SearchForm>
  )
}
const meta: Meta<typeof SearchForm> = {
  title: "Molecules/SearchForm",
  component: SearchForm,
  tags: ["autodocs"],
  parameters: {
    controls: { include: ["size", "gapped", "readOnly", "disabled", "defaultValue", "validateStatus"] },
    layout: "padded",
    docs: {
      description: {
        component:
          "Submit a search query with a visible label, optional clear action and joined or detached submit button. Use this for an explicit search workflow; use SearchSuggestions for live navigation results, Combobox for choosing a form value, or Input for ordinary text entry. Read-only queries remain selectable and may still be submitted.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-md">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    ref: { control: false, table: { disable: true } },
    id: { control: false, table: { disable: true } },
    size: { control: "select", options: ["sm", "md", "lg"] },
    gapped: { control: "boolean" },
    readOnly: { control: "boolean" },
    disabled: { control: "boolean" },
    defaultValue: { control: "text" },
    validateStatus: {
      control: "select",
      options: ["default", "error", "warning", "success"],
    },
    children: { control: false },
  },
  args: {
    size: "md",
    gapped: false,
    readOnly: false,
    disabled: false,
    onSubmit: fn(),
    onValueChange: fn(),
  },
}
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => <ProductSearch {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          "Explore query editing, validation, disabled and read-only states with controls that affect the complete search form.",
      },
    },
  },
}

export const Sizes: Story = {
  render: (args) => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size, index) => (
        <VariantGroup
          key={size}
          title={
            ["Small (sm)", "Medium (md)", "Large (lg)"][index] ?? "Medium (md)"
          }
          fullWidth
        >
          <ProductSearch {...args} size={size} defaultValue="Mounting kit" />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
  parameters: {
    controls: { exclude: ["size", "defaultValue"] },
    docs: {
      description: {
        story:
          "The same search query, label, helper and button show small, medium and large controls in canonical order.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const input of canvas.getAllByRole("searchbox")) {
      await expect(input).toHaveAttribute("data-clearable", "")
      // Reserve only the icon target, not the generic 120px inside-button slot.
      await expect(Number.parseFloat(getComputedStyle(input).paddingInlineEnd))
        .toBeLessThanOrEqual(input.getBoundingClientRect().height)
    }
  },
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Mounting kit" },
  render: (args) => <ProductSearch {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          "An unavailable search disables its input and submit action and removes the clear action.",
      },
    },
  },
}

export const ReadOnly: Story = {
  name: "Read-only",
  args: { readOnly: true, defaultValue: "Mounting kit" },
  render: (args) => <ProductSearch {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          "The locked query remains focusable, selectable and submittable without allowing edits or clearing.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("searchbox", { name: "Search products" })
    await userEvent.click(input)
    await userEvent.keyboard("{Control>}a{/Control}{Backspace}Changed")
    await expect(input).toHaveValue("Mounting kit")
    await expect(input).not.toBeDisabled()
    await expect(
      canvas.queryByRole("button", { name: /Clear search/ })
    ).toBeNull()
  },
}

export const Gapped: Story = {
  args: { gapped: true },
  render: (args) => <ProductSearch {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          "Detached controls retain their own rounded corners and focus rings with a token-based gap.",
      },
    },
  },
}

export const WithLabel: Story = {
  render: (args) => <ProductSearch {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          "The visible label supplies the input's accessible name instead of being overridden by a generic Search aria-label.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("searchbox", { name: "Search products" })
    ).toBeVisible()
  },
}

export const IconButton: Story = {
  render: (args) => (
    <SearchForm {...args}>
      <SearchForm.Label>Search products</SearchForm.Label>
      <SearchForm.Control>
        <SearchForm.Input placeholder="Search tools and accessories" />
        <SearchForm.Button showSearchIcon />
      </SearchForm.Control>
    </SearchForm>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "An icon-only submit action has an accessible Search name while the field keeps its visible label.",
      },
    },
  },
}

export const WithoutButton: Story = {
  render: (args) => (
    <SearchForm {...args}>
      <SearchForm.Label>Search products</SearchForm.Label>
      <SearchForm.Control>
        <SearchForm.Input placeholder="Search tools and accessories" />
      </SearchForm.Control>
    </SearchForm>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "An input-only search keeps both trailing corners rounded and can still be submitted with Enter.",
      },
    },
  },
}

export const Controlled: Story = {
  render: function ControlledSearch(args) {
    const [value, setValue] = useState("Mounting kit")
    return <ProductSearch {...args} value={value} onValueChange={setValue} />
  },
  parameters: {
    docs: {
      description: {
        story:
          "A parent-controlled query updates through typing and the same clear action as an uncontrolled query.",
      },
    },
  },
}

export const WithClearButton: Story = {
  args: { defaultValue: "Mounting kit" },
  render: (args) => <ProductSearch {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          "Clearing a nonempty query removes the action and returns focus to the search input.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("searchbox", { name: "Search products" })
    await userEvent.click(
      canvas.getByRole("button", { name: "Clear search: Mounting kit" })
    )
    await expect(input).toHaveValue("")
    await expect(input).toHaveFocus()
  },
}

export const Validation: Story = {
  args: { validateStatus: "error" },
  render: (args) => <ProductSearch {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          "Inline search validation links an icon-bearing error message to the input without replacing its label.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("searchbox", { name: "Search products" })
    const message = canvas.getByRole("alert")
    await expect(input).toHaveAttribute("aria-errormessage", message.id)
    await expect(input).toHaveAccessibleDescription(
      "Enter a product name or reference to search."
    )
  },
}

export const WithFormData: Story = {
  render: function QuerySubmission(args) {
    const [query, setQuery] = useState<string>()
    return (
      <div className="flex flex-col gap-300">
        <ProductSearch
          {...args}
          defaultValue="Mounting kit"
          onSubmit={(event) =>
            setQuery(String(new FormData(event.currentTarget).get("query")))
          }
        />
        {query !== undefined && (
          <StatusText status="success">
            Search submitted for “{query}”.
          </StatusText>
        )}
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "The named search input participates in FormData while submission stays local and never reloads the demo.",
      },
    },
  },
}
