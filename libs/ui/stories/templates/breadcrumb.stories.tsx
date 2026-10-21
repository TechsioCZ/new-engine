import type { Meta, StoryObj } from "@storybook/react"
import { expect, fn, userEvent, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import {
  BreadcrumbTemplate,
  type BreadcrumbTemplateItem,
} from "../../src/templates/breadcrumb"

const onDemoNavigate = fn().mockName("onDemoNavigate")

const defaultItems: BreadcrumbTemplateItem[] = [
  { label: "Home", href: "/", icon: "token-icon-home" },
  { label: "Products", href: "/products", icon: "token-icon-shopping-bag" },
  {
    label: "Electronics",
    href: "/products/electronics",
    icon: "token-icon-cpu",
  },
  { label: "Smartphones", href: "/products/electronics/smartphones" },
]

const longItems: BreadcrumbTemplateItem[] = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Electronics", href: "/products/electronics" },
  { label: "Computers", href: "/products/electronics/computers" },
  { label: "Laptops", href: "/products/electronics/computers/laptops" },
  { label: "Gaming", href: "/products/electronics/computers/laptops/gaming" },
  {
    label: "High-End",
    href: "/products/electronics/computers/laptops/gaming/high-end",
  },
]

const meta: Meta<typeof BreadcrumbTemplate> = {
  title: "Templates/BreadcrumbTemplate",
  component: BreadcrumbTemplate,
  parameters: {
    controls: { exclude: ["ref", "id", "children", "ids", "getRootNode"] },
    layout: "centered",
    docs: {
      description: {
        component: `
A ready-to-use location trail driven by an array of ancestor pages. The last item is the non-interactive current page unless isCurrent is explicit. Use the Breadcrumb molecule for custom slot ordering or per-slot styling, Tabs for peer views, and Steps for task progress. Demo link activation is logged and prevented so you stay in Storybook; application links keep real navigation semantics.
        `,
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div
        className="max-w-container-md bg-surface p-400"
        onClickCapture={(event) => {
          const link =
            event.target instanceof Element
              ? event.target.closest("a[href]")
              : null
          if (link) {
            event.preventDefault()
            onDemoNavigate(link.getAttribute("href"))
          }
        }}
      >
        <Story />
      </div>
    ),
  ],
  argTypes: {
    ref: { control: false, table: { disable: true } },
    items: {
      control: "object",
      description:
        "Ordered ancestor pages with label, href and optional icon; the last page is current unless an item sets isCurrent. Demo navigation stays in Storybook.",
      table: {
        category: "Content",
      },
    },
    maxItems: {
      control: { type: "number", min: 0, step: 1 },
      description:
        "Maximum visible page items (ellipsis does not count). Zero shows all; one shows only the last item; larger limits keep the root and trailing pages.",
      table: {
        category: "Behavior",
        defaultValue: { summary: "0" },
      },
    },
    separator: {
      control: "text",
      description: "Custom separator content shared by all separators.",
      table: {
        category: "Content",
      },
    },
    "aria-label": {
      control: "text",
      description: "Accessible name for the navigation landmark.",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Controls breadcrumb sizing.",
      table: {
        category: "Appearance",
        defaultValue: { summary: "md" },
      },
    },
    variant: {
      control: "select",
      options: ["plain", "underline"],
      description: "Controls the visual style of breadcrumb links.",
      table: {
        category: "Appearance",
        defaultValue: { summary: "plain" },
      },
    },
  },
  args: {
    items: defaultItems,
    maxItems: 0,
    size: "md",
    variant: "plain",
    "aria-label": "breadcrumb",
  },
}

export default meta
type Story = StoryObj<typeof BreadcrumbTemplate>

export const Playground: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const initialUrl = window.location.href
    for (const link of canvas.queryAllByRole("link")) {
      await userEvent.click(link)
      await expect(onDemoNavigate).toHaveBeenCalledWith(
        link.getAttribute("href")
      )
      await expect(window.location.href).toBe(initialUrl)
      link.focus()
      await userEvent.keyboard("{Enter}")
      await expect(window.location.href).toBe(initialUrl)
      await expect(link).toHaveFocus()
    }
    if (args.items.length > 0) {
      await expect(
        canvasElement.querySelector('[aria-current="page"]')
      ).toBeVisible()
    }
  },
  parameters: {
    docs: {
      description: {
        story:
          "Edit the page hierarchy, size, link treatment and collapse limit; all demo links remain inside Storybook even after editing their destinations.",
      },
    },
  },
  args: {
    items: defaultItems,
  },
}

export const Variants: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare plain and underlined breadcrumb labels to match the surrounding navigation style.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Variants">
        <div className="flex flex-col gap-300">
          <BreadcrumbTemplate
            aria-label="Breadcrumb, plain"
            items={defaultItems}
            variant="plain"
          />
          <BreadcrumbTemplate
            aria-label="Breadcrumb, underline"
            items={defaultItems}
            variant="underline"
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Sizes: Story = {
  play: async ({ canvasElement }) => {
    for (const nav of within(canvasElement).getAllByRole("navigation")) {
      const link = within(nav).getAllByRole("link")[0] as HTMLElement
      const current = nav.querySelector('[aria-current="page"]') as HTMLElement
      await expect(getComputedStyle(link).fontSize).toBe(getComputedStyle(current).fontSize)
    }
  },
  parameters: { controls: { disable: true }, docs: { description: { story: "Compare Small (sm), Medium (md) and Large (lg) using the same location trail." } } },
  render: () => <VariantContainer>
    {(["sm", "md", "lg"] as const).map((size) => <VariantGroup key={size} title={{ sm: "Small (sm)", md: "Medium (md)", lg: "Large (lg)" }[size]}>
      <BreadcrumbTemplate aria-label="Product location" items={defaultItems} size={size} />
    </VariantGroup>)}
  </VariantContainer>,
}

export const CustomSeparator: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Use a slash instead of the default chevron without adding separator noise to screen-reader output.",
      },
    },
  },
  args: {
    items: defaultItems,
    separator: "/",
  },
}

export const Ellipsis: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Collapse a deep product hierarchy to its root and trailing pages so the current location remains readable.",
      },
    },
  },
  args: {
    items: longItems,
    maxItems: 4,
  },
}

export const ExplicitCurrent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Use an explicit current-page flag from application route data while keeping that non-interactive page at the end of the trail.",
      },
    },
  },
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "Products", href: "/products" },
      {
        label: "Electronics",
        href: "/products/electronics",
        isCurrent: true,
      },
    ],
  },
}

export const CollapsedCurrentAncestor: Story = {
  args: {
    maxItems: 2,
    items: [
      { label: "Home", href: "/" },
      { label: "Catalog", href: "/catalog" },
      { label: "Tools", href: "/catalog/tools", isCurrent: true },
      { label: "Drills", href: "/catalog/tools/drills" },
      { label: "Cordless drills", href: "/catalog/tools/drills/cordless" },
    ],
  },
  parameters: { docs: { description: { story: "An explicit current ancestor ends the trail before collapse, so hidden route descendants never become a false current page." } } },
  play: async ({ canvasElement }) => {
    const current = canvasElement.querySelectorAll('[aria-current="page"]')
    await expect(current).toHaveLength(1)
    await expect(current[0]).toHaveTextContent("Tools")
    await expect(within(canvasElement).queryByText("Cordless drills")).not.toBeInTheDocument()
  },
}
