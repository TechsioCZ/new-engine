import type { Meta, StoryObj } from "@storybook/react"
import { useId, useRef, useState } from "react"
import { expect, userEvent, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import { Input } from "../../src/atoms/input"
import { Label } from "../../src/atoms/label"
import { iconCatalog, iconLabels } from "../helpers/icon-options"

const meta = {
  title: "Atoms/Icon",
  component: Icon,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Icon is a lightweight glyph for navigation, actions and status. Prefer the named token icons for consistent meaning across the product; use an Iconify class when no token fits. Icons inherit text size and color by default. Keep icons beside text decorative, or supply label for a meaningful standalone image. Use ActionIcon or Button—not Icon—for clickable actions. Browse the searchable Gallery for names and copyable class names.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    icon: {
      control: { type: "select", labels: iconLabels },
      options: iconCatalog.map(({ icon }) => icon),
      description: "Named token glyph or statically declared Iconify class.",
    },
    size: {
      control: "select",
      options: ["current", "xs", "sm", "md", "lg", "xl", "2xl"],
      description: "System size scale; current inherits surrounding text size.",
      table: { defaultValue: { summary: "current" } },
    },
    color: {
      control: "select",
      options: [
        "current",
        "primary",
        "secondary",
        "success",
        "danger",
        "warning",
      ],
      description:
        "Component color alias; current inherits surrounding text color.",
    },
    label: {
      control: "text",
      description:
        "Accessible name for a meaningful standalone icon; omit beside text.",
    },
  },
  args: {
    icon: "token-icon-home",
    size: "lg",
    color: "current",
    label: "Home",
  },
} satisfies Meta<typeof Icon>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A recognizable Home glyph at a comfortable large size; use Controls to explore icons, size, color and its accessible name.",
      },
    },
  },
}

export const Sizes: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare the same Home glyph at Small (sm), Medium (md) and Large (lg). Icon also supports xs, xl, 2xl and current for decorative and inline composition, not independent touch targets.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="System icon sizes">
        {(["sm", "md", "lg"] as const).map((size) => (
          <div className="flex flex-col items-center gap-150 p-150" key={size}>
            <div className="flex h-600 items-center justify-center">
              <Icon icon="token-icon-home" size={size} />
            </div>
            <span className="font-medium text-fg-primary text-sm">
              {{ sm: "Small (sm)", md: "Medium (md)", lg: "Large (lg)" }[size]}
            </span>
          </div>
        ))}
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Colors: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Labeled color aliases show theme-aware icon accents without relying on color alone to communicate meaning.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Theme-aware colors">
        {(
          [
            "current",
            "primary",
            "secondary",
            "success",
            "danger",
            "warning",
          ] as const
        ).map((color) => (
          <div className="flex flex-col items-center gap-150 p-150" key={color}>
            <Icon icon="token-icon-home" size="lg" color={color} />
            <span className="text-fg-primary text-sm">{color}</span>
          </div>
        ))}
      </VariantGroup>
    </VariantContainer>
  ),
}

function IconGallery({
  entries = iconCatalog,
}: {
  entries?: typeof iconCatalog
}) {
  const [query, setQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const searchId = useId()
  const resultsId = useId()
  const search = query.trim().toLocaleLowerCase()
  const matches = entries.filter(({ label, icon, category }) =>
    `${label} ${icon} ${category}`.toLocaleLowerCase().includes(search)
  )
  const categories = [...new Set(matches.map(({ category }) => category))]

  return (
    <div className="flex w-full max-w-4xl flex-col gap-300">
      <div className="flex flex-col gap-100">
        <Label htmlFor={searchId}>Find an icon</Label>
        <div className="flex items-center gap-150">
          <Input
            ref={searchRef}
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search home, navigation, token-icon…"
            aria-describedby={resultsId}
          />
          {query && (
            <Button
              className="shrink-0 whitespace-nowrap"
              theme="outlined"
              onClick={() => {
                setQuery("")
                searchRef.current?.focus()
              }}
            >
              Clear search
            </Button>
          )}
        </div>
        <output
          id={resultsId}
          className="text-fg-secondary text-sm"
          aria-live="polite"
        >
          {matches.length} {matches.length === 1 ? "icon" : "icons"} found
        </output>
      </div>
      {categories.map((category) => (
        <section
          className="flex flex-col gap-150"
          key={category}
          aria-label={category}
        >
          <h3 className="font-semibold text-fg-primary text-md">{category}</h3>
          <ul className="grid grid-cols-1 gap-150 sm:grid-cols-2 lg:grid-cols-3">
            {matches
              .filter((entry) => entry.category === category)
              .map(({ icon, label }) => (
                <li
                  className="flex min-w-0 items-center gap-200 rounded-md border border-border-primary bg-bg-primary p-200"
                  key={icon}
                >
                  <Icon icon={icon} size="lg" />
                  <div className="min-w-0">
                    <p className="font-medium text-fg-primary text-sm">
                      {label}
                    </p>
                    <code className="block break-all text-fg-secondary text-xs">
                      {icon}
                    </code>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}
      {matches.length === 0 && (
        <div className="rounded-md border border-border-primary p-300 text-center">
          <p className="font-medium">No icons match “{query}”</p>
          <p className="mt-100 text-fg-secondary text-sm">
            Try a name like “home”, a category like “actions”, or clear the
            search.
          </p>
        </div>
      )}
    </div>
  )
}

export const Gallery: Story = {
  parameters: {
    layout: "padded",
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Search named token glyphs and curated Iconify examples by name, class or category to find a consistent icon for your interface.",
      },
    },
  },
  render: () => <IconGallery />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const search = canvas.getByRole("searchbox", { name: "Find an icon" })
    await userEvent.type(search, "token-icon-home")
    await expect(canvas.getAllByRole("listitem")).toHaveLength(1)
    await expect(canvas.getByText("Home", { exact: true })).toBeVisible()
    await userEvent.clear(search)
    await userEvent.type(search, "no-such-glyph")
    await expect(canvas.queryAllByRole("listitem")).toHaveLength(0)
    await expect(
      canvas.getByText("No icons match “no-such-glyph”")
    ).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Clear search" }))
    await expect(canvas.getAllByRole("listitem")).toHaveLength(
      iconCatalog.length
    )
    await expect(search).toHaveFocus()
  },
}

export const SemanticTokens: Story = {
  tags: ["!autodocs"],
  parameters: {
    layout: "padded",
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Status token aliases give error, success, warning and information a stable name so themes can choose the right glyph.",
      },
    },
  },
  render: () => (
    <IconGallery
      entries={iconCatalog.filter(({ category }) => category === "Status")}
    />
  ),
}

export const ComponentTokens: Story = {
  tags: ["!autodocs"],
  parameters: {
    layout: "padded",
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Form-control aliases reuse shared status and direction glyphs, keeping validation and steppers consistent across components.",
      },
    },
  },
  render: () => (
    <IconGallery
      entries={iconCatalog.filter(
        ({ category }) => category === "Form controls"
      )}
    />
  ),
}

export const AccessibleMeaning: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Use a label for a meaningful standalone image, but leave the same glyph decorative when adjacent text already conveys its meaning.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Standalone image">
        <Icon
          icon="token-icon-check-circle"
          size="lg"
          color="success"
          label="In stock"
        />
      </VariantGroup>
      <VariantGroup title="Decorative beside text">
        <span className="inline-flex items-center gap-100">
          <Icon icon="token-icon-check-circle" size="lg" color="success" />
          In stock
        </span>
      </VariantGroup>
    </VariantContainer>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getAllByRole("img", { name: "In stock" })).toHaveLength(
      1
    )
    await expect(
      canvasElement.querySelectorAll('[aria-hidden="true"]')
    ).toHaveLength(1)
  },
}
