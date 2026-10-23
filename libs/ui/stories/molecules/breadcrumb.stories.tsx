import type { Meta, StoryObj } from "@storybook/react"
import { expect, fn, userEvent, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import {
  Breadcrumb,
  type BreadcrumbRootProps,
} from "../../src/molecules/breadcrumb"

const onDemoNavigate = fn().mockName("onDemoNavigate")

const meta: Meta<typeof Breadcrumb> = {
  title: "Molecules/Breadcrumb",
  component: Breadcrumb,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Shows the current page within a location hierarchy, with links to ancestors and a non-interactive current-page label. Use this compound molecule for custom slot content or ordering, and BreadcrumbTemplate for a ready-to-use data-driven trail; use Tabs for peer views and Steps for task progress. Demo link clicks are logged and prevented so you stay in Storybook; application links retain normal navigation and framework adapters.",
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
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description:
        "Sets spacing, text size and icon size across the breadcrumb trail.",
      table: { category: "Appearance", defaultValue: { summary: "md" } },
    },
    variant: {
      control: "select",
      options: ["plain", "underline"],
      description: "Uses plain or underlined breadcrumb labels.",
      table: { category: "Appearance", defaultValue: { summary: "plain" } },
    },
    "aria-label": {
      control: "text",
      description:
        "Accessible name for this navigation landmark; distinguish multiple trails on the same page.",
      table: {
        category: "Accessibility",
        defaultValue: { summary: "breadcrumb" },
      },
    },
  },
  args: { size: "md", variant: "plain", "aria-label": "breadcrumb" },
}

export default meta
type Story = StoryObj<typeof Breadcrumb>

function DemoBreadcrumb(props: BreadcrumbRootProps) {
  return (
    <Breadcrumb {...props}>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/docs">Docs</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/docs/components">Components</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink>Breadcrumb</Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb>
  )
}

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Adjust size, link style and the accessible navigation name on a documentation trail; ancestor links log clicks without leaving the demo.",
      },
    },
  },
  render: (args) => <DemoBreadcrumb {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const link = canvas.getByRole("link", { name: "Docs" })
    const initialUrl = window.location.href
    await expect(link).toHaveAttribute("href", "/docs")
    await userEvent.click(link)
    await expect(onDemoNavigate).toHaveBeenCalledWith("/docs")
    await expect(window.location.href).toBe(initialUrl)
    link.focus()
    await userEvent.keyboard("{Enter}")
    await expect(window.location.href).toBe(initialUrl)
    await expect(link).toHaveFocus()
    await expect(canvas.getByText("Breadcrumb")).toHaveAttribute(
      "aria-current",
      "page"
    )
  },
}

export const Variants: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare plain and underlined labels to choose the link treatment that fits your navigation.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Link treatment" fullWidth>
        <DemoBreadcrumb aria-label="Plain breadcrumb" variant="plain" />
        <DemoBreadcrumb
          aria-label="Underlined breadcrumb"
          variant="underline"
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Sizes: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare small, medium and large trails, with coordinated text, icon sizing and spacing for different page densities.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Small" fullWidth>
        <DemoBreadcrumb aria-label="Small breadcrumb" size="sm" />
      </VariantGroup>
      <VariantGroup title="Medium" fullWidth>
        <DemoBreadcrumb aria-label="Medium breadcrumb" size="md" />
      </VariantGroup>
      <VariantGroup title="Large" fullWidth>
        <DemoBreadcrumb aria-label="Large breadcrumb" size="lg" />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const WithIcons: Story = {
  name: "With icons",
  parameters: {
    docs: {
      description: {
        story:
          "Pair decorative category icons with visible page names to make a catalog hierarchy easier to scan without relying on icons alone.",
      },
    },
  },
  render: (args) => (
    <Breadcrumb {...args}>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/">
            <Breadcrumb.Icon icon="token-icon-home" />
            Home
          </Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/products">
            <Breadcrumb.Icon icon="token-icon-shopping-bag" />
            Products
          </Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink>
            <Breadcrumb.Icon icon="token-icon-cpu" />
            Electronics
          </Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb>
  ),
}

export const CustomSeparator: Story = {
  name: "Custom separator",
  parameters: {
    docs: {
      description: {
        story:
          "Replace the default chevron with a slash while keeping separators decorative and hidden from assistive technology.",
      },
    },
  },
  render: (args) => (
    <Breadcrumb {...args}>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/docs">Docs</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator>/</Breadcrumb.Separator>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/docs/components">Components</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator>/</Breadcrumb.Separator>
        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink>Breadcrumb</Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb>
  ),
}

export const Ellipsis: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Use a decorative ellipsis for omitted middle ancestors while preserving the root and current page; use a disclosure control instead if users need to reveal hidden links.",
      },
    },
  },
  render: (args) => (
    <Breadcrumb {...args}>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/products">Catalog</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Ellipsis />
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink>Wireless headphones</Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb>
  ),
}

export const CustomCurrentLink: Story = {
  name: "Custom current-page label",
  parameters: {
    docs: {
      description: {
        story:
          "Style the non-interactive current-page slot without turning it into a self-link or losing its aria-current marker.",
      },
    },
  },
  render: (args) => (
    <Breadcrumb {...args}>
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/products">Products</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink className="underline">
            Wireless headphones
          </Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb>
  ),
}
